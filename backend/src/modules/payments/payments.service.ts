import { prisma } from "../../lib/prisma";
import {
  PaymentProvider,
  PaymentStatus,
  Prisma,
  Role,
  SubscriptionSource,
  SubscriptionStatus,
  SubscriptionTier,
  WebhookProcessingStatus,
} from "@prisma/client";
import { ENV } from "../../config/environment";
import crypto from "crypto";
import { AppError } from "../../common/errors/app-error";
import {
  cancelPayOSPaymentLink,
  createPayOSPaymentLink,
  getPayOSPaymentLink,
  isPayOSConfigured,
  PayOSPaymentStatus,
} from "./payos.client";

function sortObject(value: Record<string, unknown>) {
  return Object.keys(value).sort().reduce<Record<string, unknown>>((result, key) => {
    result[key] = value[key];
    return result;
  }, {});
}

function webhookValue(value: unknown) {
  if (value === null || value === "null" || value === "undefined") return "";
  if (Array.isArray(value)) {
    return JSON.stringify(value.map((item) =>
      item && typeof item === "object" && !Array.isArray(item)
        ? sortObject(item as Record<string, unknown>)
        : item
    ));
  }
  return String(value);
}

export function createWebhookSignature(data: Record<string, unknown>, checksumKey: string) {
  const canonicalData = Object.keys(data)
    .sort()
    .filter((key) => data[key] !== undefined)
    .map((key) => `${key}=${webhookValue(data[key])}`)
    .join("&");
  return crypto.createHmac("sha256", checksumKey).update(canonicalData).digest("hex");
}

export function verifyWebhookSignature(
  data: Record<string, unknown>,
  signature: string,
  checksumKey = ENV.PAYOS.CHECKSUM_KEY
) {
  if (!checksumKey || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = createWebhookSignature(data, checksumKey);
  return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
}

export function mapPayOSPaymentStatus(status: PayOSPaymentStatus) {
  switch (status) {
    case "PAID":
      return PaymentStatus.COMPLETED;
    case "CANCELLED":
      return PaymentStatus.CANCELLED;
    case "EXPIRED":
      return PaymentStatus.EXPIRED;
    default:
      return PaymentStatus.PENDING;
  }
}

async function completePayment(params: {
  paymentId: string;
  expectedAmount?: number;
  transactionReference: string;
  rawProviderData?: unknown;
  webhookEventId?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: params.paymentId },
      include: { user: true },
    });
    if (!payment) throw new AppError("Không tìm thấy đơn thanh toán", 404);

    if (params.expectedAmount !== undefined && Number(payment.amount) !== params.expectedAmount) {
      throw new AppError("Số tiền PayOS không khớp với đơn thanh toán", 400);
    }

    if (payment.status === PaymentStatus.COMPLETED) {
      if (params.webhookEventId) {
        await tx.paymentWebhookEvent.update({
          where: { id: params.webhookEventId },
          data: { paymentId: payment.id, processingStatus: WebhookProcessingStatus.IGNORED, processedAt: new Date() },
        });
      }
      return { payment, expiresAt: payment.user.tierExpiresAt, alreadyCompleted: true };
    }
    if (payment.status !== PaymentStatus.PENDING) {
      throw new AppError("Đơn thanh toán không còn ở trạng thái chờ", 409);
    }

    // updateMany acts as a compare-and-set so webhook and status polling cannot grant twice.
    const claimed = await tx.payment.updateMany({
      where: { id: payment.id, status: PaymentStatus.PENDING },
      data: {
        status: PaymentStatus.COMPLETED,
        paidAt: new Date(),
        providerTransactionId: params.transactionReference,
        transactionRef: params.transactionReference,
        ...(params.rawProviderData === undefined ? {} : {
          rawWebhookData: JSON.parse(JSON.stringify(params.rawProviderData)) as Prisma.InputJsonValue,
        }),
      },
    });
    if (claimed.count !== 1) {
      throw new AppError("Đơn thanh toán đang được xử lý", 409);
    }

    const now = new Date();
    const currentExpiry = payment.user.tierExpiresAt && payment.user.tierExpiresAt > now
      ? payment.user.tierExpiresAt
      : now;
    const newExpiry = new Date(currentExpiry);
    newExpiry.setMonth(newExpiry.getMonth() + payment.durationMonths);

    const activeSubscription = await tx.subscription.findFirst({
      where: { userId: payment.userId, status: SubscriptionStatus.ACTIVE },
    });
    const subscription = activeSubscription
      ? await tx.subscription.update({
          where: { id: activeSubscription.id },
          data: {
            planId: payment.planId,
            status: SubscriptionStatus.ACTIVE,
            source: SubscriptionSource.PAYOS,
            currentPeriodStart: now,
            currentPeriodEnd: newExpiry,
            cancelledAt: null,
          },
        })
      : await tx.subscription.create({
          data: {
            userId: payment.userId,
            planId: payment.planId,
            status: SubscriptionStatus.ACTIVE,
            source: SubscriptionSource.PAYOS,
            startsAt: now,
            currentPeriodStart: now,
            currentPeriodEnd: newExpiry,
          },
        });

    await tx.payment.update({
      where: { id: payment.id },
      data: { subscriptionId: subscription.id },
    });
    await tx.user.update({
      where: { id: payment.userId },
      data: { tier: payment.tier, tierExpiresAt: newExpiry },
    });
    if (params.webhookEventId) {
      await tx.paymentWebhookEvent.update({
        where: { id: params.webhookEventId },
        data: {
          paymentId: payment.id,
          processingStatus: WebhookProcessingStatus.PROCESSED,
          processedAt: now,
        },
      });
    }

    return { payment, expiresAt: newExpiry, alreadyCompleted: false };
  });
}

export class PaymentsService {
  public static async getPlans() {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: [{ price: "asc" }, { version: "desc" }],
      include: {
        features: {
          where: { enabled: true },
          include: { feature: true },
          orderBy: { feature: { code: "asc" } },
        },
      },
    });

    return plans.map((plan) => ({
      id: plan.id,
      tier: plan.tier,
      name: plan.displayName,
      description: plan.description,
      priceVND: Number(plan.price),
      durationMonths: plan.billingPeriod === "NONE" ? 0 : plan.billingPeriod === "ANNUAL" ? 12 : 1,
      version: plan.version,
      features: plan.features.map(({ feature, limitValue }) => ({
        code: feature.code,
        name: feature.displayName,
        limitValue,
      })),
    }));
  }

  public static async createCheckout(params: {
    userId: string;
    tier: SubscriptionTier;
    durationMonths?: number;
  }) {
    if (params.tier === SubscriptionTier.FREE) {
      throw new Error("Gói miễn phí không cần thanh toán");
    }

    const plan = await prisma.plan.findFirst({
      where: { tier: params.tier, isActive: true },
      orderBy: { version: "desc" },
    });
    if (!plan) {
      throw new Error("Gói cước không hợp lệ");
    }

    const durationMonths = params.durationMonths || 1;
    const totalAmount = Number(plan.price) * durationMonths;
    if (!Number.isSafeInteger(totalAmount) || totalAmount <= 0) {
      throw new AppError("Giá gói phải là số nguyên VND lớn hơn 0", 400);
    }
    if (!isPayOSConfigured()) {
      throw new AppError(
        "PayOS chưa được cấu hình. Hãy điền 3 khóa PayOS trong backend/.env trước khi tạo thanh toán thật.",
        503
      );
    }

    let payment: Awaited<ReturnType<typeof prisma.payment.create>> | null = null;
    for (let attempt = 0; attempt < 5 && !payment; attempt += 1) {
      const orderCode = crypto.randomInt(100_000_000, 1_000_000_000);
      try {
        payment = await prisma.payment.create({
          data: {
            orderCode,
            userId: params.userId,
            planId: plan.id,
            tier: params.tier,
            durationMonths,
            amount: totalAmount,
            currency: "VND",
            paymentMethod: "PAYOS",
            provider: PaymentProvider.PAYOS,
            idempotencyKey: `checkout:${params.userId}:${orderCode}`,
            status: PaymentStatus.PENDING,
          },
        });
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
      }
    }
    if (!payment) throw new AppError("Không thể tạo mã đơn hàng duy nhất", 500);

    const description = `BEEBUDDY ${params.tier} ${payment.orderCode}`;
    try {
      const paymentLink = await createPayOSPaymentLink({
        orderCode: payment.orderCode,
        amount: totalAmount,
        description,
        returnUrl: ENV.PAYOS.RETURN_URL,
        cancelUrl: ENV.PAYOS.CANCEL_URL,
        expiredAt: Math.floor(Date.now() / 1000) + ENV.PAYOS.PAYMENT_LINK_TTL_MINUTES * 60,
        items: [{ name: `${plan.displayName} - ${durationMonths} thang`, quantity: 1, price: totalAmount }],
      });

      payment = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          providerOrderId: paymentLink.paymentLinkId,
          checkoutUrl: paymentLink.checkoutUrl,
        },
      });

      return {
        paymentId: payment.id,
        orderCode: payment.orderCode,
        tier: payment.tier,
        amount: totalAmount,
        currency: "VND",
        description,
        checkoutUrl: paymentLink.checkoutUrl,
        paymentLinkId: paymentLink.paymentLinkId,
        qrCode: paymentLink.qrCode,
        expiresAt: new Date((Math.floor(Date.now() / 1000) + ENV.PAYOS.PAYMENT_LINK_TTL_MINUTES * 60) * 1000),
        instructions: "Open the PayOS checkout page and scan the VietQR code with your banking app to complete payment.",
      };
    } catch (error) {
      await prisma.payment.updateMany({
        where: { id: payment.id, status: PaymentStatus.PENDING },
        data: { status: PaymentStatus.FAILED },
      });
      throw error;
    }
  }

  public static async handleWebhook(payload: {
    data: Record<string, unknown> & {
      orderCode: number;
      amount: number;
      reference?: string;
    };
    signature: string;
  }) {
    if (!verifyWebhookSignature(payload.data, payload.signature)) {
      throw new AppError("Chữ ký webhook PayOS không hợp lệ", 401);
    }

    const providerEventId = payload.data.reference
      || `${payload.data.orderCode}:${payload.signature.slice(0, 24)}`;
    const payloadHash = crypto.createHash("sha256")
      .update(JSON.stringify(sortObject(payload.data)))
      .digest("hex");

    const webhookEvent = await prisma.paymentWebhookEvent.upsert({
      where: {
        provider_providerEventId: {
          provider: PaymentProvider.PAYOS,
          providerEventId,
        },
      },
      update: {},
      create: {
        provider: PaymentProvider.PAYOS,
        providerEventId,
        payloadHash,
        rawPayload: JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue,
        signatureValid: true,
      },
    });

    if (webhookEvent.payloadHash !== payloadHash) {
      throw new AppError("Webhook PayOS trùng mã tham chiếu nhưng khác nội dung", 409);
    }

    if (
      webhookEvent.processingStatus === WebhookProcessingStatus.PROCESSED
      || webhookEvent.processingStatus === WebhookProcessingStatus.IGNORED
    ) {
      return { success: true, message: "Webhook already received" };
    }

    const payment = await prisma.payment.findUnique({ where: { orderCode: payload.data.orderCode } });

    if (!payment) {
      // payOS sends a signed sample event while registering the webhook URL.
      await prisma.paymentWebhookEvent.update({
        where: { id: webhookEvent.id },
        data: { processingStatus: WebhookProcessingStatus.IGNORED, processedAt: new Date() },
      });
      return { success: true, message: "Valid webhook for an unrelated order" };
    }

    if (payment.status === PaymentStatus.COMPLETED) {
      await prisma.paymentWebhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          paymentId: payment.id,
          processingStatus: WebhookProcessingStatus.IGNORED,
          processedAt: new Date(),
        },
      });
      return { success: true, message: "Order already paid" };
    }
    if (payment.status !== PaymentStatus.PENDING) {
      throw new AppError("Đơn thanh toán không còn ở trạng thái chờ", 409);
    }
    if (Number(payment.amount) !== payload.data.amount) {
      await prisma.paymentWebhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          paymentId: payment.id,
          processingStatus: WebhookProcessingStatus.FAILED,
          processedAt: new Date(),
          errorMessage: "PAYMENT_AMOUNT_MISMATCH",
        },
      });
      throw new AppError("Số tiền webhook không khớp với đơn thanh toán", 400);
    }

    const completed = await completePayment({
      paymentId: payment.id,
      expectedAmount: payload.data.amount,
      transactionReference: payload.data.reference || `PAYOS:${payment.orderCode}`,
      rawProviderData: payload,
      webhookEventId: webhookEvent.id,
    });

    return {
      success: true,
      orderCode: payment.orderCode,
      tier: payment.tier,
      expiresAt: completed.expiresAt,
      message: `Account successfully upgraded to ${payment.tier}`,
    };
  }

  public static async getMyPayments(userId: string) {
    return prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        orderCode: true,
        tier: true,
        durationMonths: true,
        amount: true,
        currency: true,
        paymentMethod: true,
        status: true,
        checkoutUrl: true,
        transactionRef: true,
        paidAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  public static async getPaymentDetail(orderCode: number, requesterId: string, requesterRole: Role) {
    let payment = await prisma.payment.findFirst({
      where: {
        orderCode,
        ...(requesterRole === Role.ADMIN ? {} : { userId: requesterId }),
      },
      select: {
        id: true,
        orderCode: true,
        tier: true,
        durationMonths: true,
        amount: true,
        currency: true,
        paymentMethod: true,
        status: true,
        checkoutUrl: true,
        transactionRef: true,
        paidAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (payment?.status === PaymentStatus.PENDING && isPayOSConfigured()) {
      const providerPayment = await getPayOSPaymentLink(orderCode);
      const mappedStatus = mapPayOSPaymentStatus(providerPayment.status);
      if (mappedStatus === PaymentStatus.COMPLETED) {
        const transactionReference = providerPayment.transactions?.find((transaction) => transaction.reference)?.reference
          || `PAYOS:${providerPayment.id}`;
        await completePayment({
          paymentId: payment.id,
          expectedAmount: providerPayment.amount,
          transactionReference,
          rawProviderData: providerPayment,
        });
      } else if (mappedStatus === PaymentStatus.CANCELLED || mappedStatus === PaymentStatus.EXPIRED) {
        await prisma.payment.updateMany({
          where: { id: payment.id, status: PaymentStatus.PENDING },
          data: { status: mappedStatus },
        });
      }

      payment = await prisma.payment.findFirst({
        where: {
          orderCode,
          ...(requesterRole === Role.ADMIN ? {} : { userId: requesterId }),
        },
        select: {
          id: true,
          orderCode: true,
          tier: true,
          durationMonths: true,
          amount: true,
          currency: true,
          paymentMethod: true,
          status: true,
          checkoutUrl: true,
          transactionRef: true,
          paidAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    }

    return payment;
  }

  public static async cancelCheckout(orderCode: number, userId: string) {
    const payment = await prisma.payment.findFirst({
      where: { orderCode, userId },
      select: { id: true, orderCode: true, status: true },
    });
    if (!payment) throw new AppError("Không tìm thấy đơn thanh toán", 404);
    if (payment.status === PaymentStatus.CANCELLED) return { orderCode, status: payment.status };
    if (payment.status !== PaymentStatus.PENDING) {
      throw new AppError("Chỉ có thể hủy đơn đang chờ thanh toán", 409);
    }

    const providerPayment = await cancelPayOSPaymentLink(orderCode, "Nguoi dung huy tren BeeBuddy");
    await prisma.payment.updateMany({
      where: { id: payment.id, status: PaymentStatus.PENDING },
      data: { status: PaymentStatus.CANCELLED },
    });
    return { orderCode, status: mapPayOSPaymentStatus(providerPayment.status) };
  }
}
