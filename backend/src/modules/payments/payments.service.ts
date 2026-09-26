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

    // Sinh orderCode dạng số duy nhất theo chuẩn PayOS (tối đa 9 chữ số)
    const orderCode = Number(String(Date.now()).slice(-8) + Math.floor(Math.random() * 10));

    // Tạo link thanh toán VietQR / PayOS
    const qrDescription = `BEEBUDDY ${params.tier} ${orderCode}`;
    const vietQrUrl = `https://img.vietqr.io/image/970422-0987654321-compact2.png?amount=${totalAmount}&addInfo=${encodeURIComponent(
      qrDescription
    )}&accountName=BEEBUDDY%20PAYMENT`;

    const payment = await prisma.payment.create({
      data: {
        orderCode,
        userId: params.userId,
        planId: plan.id,
        tier: params.tier,
        durationMonths,
        amount: totalAmount,
        currency: "VND",
        paymentMethod: "PAYOS_VIETQR",
        provider: PaymentProvider.PAYOS,
        providerOrderId: String(orderCode),
        idempotencyKey: `checkout:${params.userId}:${orderCode}`,
        status: PaymentStatus.PENDING,
        checkoutUrl: `${ENV.CLIENT_URL}/billing/checkout?orderCode=${orderCode}`,
      },
    });

    return {
      paymentId: payment.id,
      orderCode: payment.orderCode,
      tier: payment.tier,
      amount: totalAmount,
      currency: "VND",
      description: qrDescription,
      qrCodeUrl: vietQrUrl,
      checkoutUrl: payment.checkoutUrl,
      instructions: "Vui lòng quét mã VietQR bằng ứng dụng ngân hàng hoặc ví điện tử để thanh toán.",
    };
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

    const payment = await prisma.payment.findUnique({
      where: { orderCode: payload.data.orderCode },
      include: { user: true },
    });

    if (!payment) {
      throw new AppError(`Không tìm thấy đơn thanh toán có mã: ${payload.data.orderCode}`, 404);
    }

    if (payment.status === PaymentStatus.COMPLETED) {
      if (webhookEvent.processingStatus !== WebhookProcessingStatus.PROCESSED) {
        await prisma.paymentWebhookEvent.update({
          where: { id: webhookEvent.id },
          data: {
            paymentId: payment.id,
            processingStatus: WebhookProcessingStatus.IGNORED,
            processedAt: new Date(),
          },
        });
      }
      return { success: true, message: "Đơn hàng đã được thanh toán trước đó" };
    }
    if (payment.status !== PaymentStatus.PENDING) {
      throw new AppError("Đơn thanh toán không còn ở trạng thái chờ", 409);
    }
    if (Number(payment.amount) !== payload.data.amount) {
      throw new AppError("Số tiền webhook không khớp với đơn thanh toán", 400);
    }

    // Tính ngày hết hạn mới cho gói cước
    const now = new Date();
    const currentExpiry =
      payment.user.tierExpiresAt && payment.user.tierExpiresAt > now
        ? payment.user.tierExpiresAt
        : now;

    const newExpiry = new Date(currentExpiry);
    newExpiry.setMonth(newExpiry.getMonth() + payment.durationMonths);

    // Payment, subscription, compatibility cache and webhook idempotency move atomically.
    await prisma.$transaction(async (tx) => {
      const activeSubscription = await tx.subscription.findFirst({
        where: { userId: payment.userId, status: SubscriptionStatus.ACTIVE },
      });
      const subscription = activeSubscription
        ? await tx.subscription.update({
            where: { id: activeSubscription.id },
            data: {
              planId: payment.planId,
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
        data: {
          subscriptionId: subscription.id,
          status: PaymentStatus.COMPLETED,
          paidAt: now,
          providerTransactionId: payload.data.reference || `TXN_${Date.now()}`,
          transactionRef: payload.data.reference || `TXN_${Date.now()}`,
          rawWebhookData: JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue,
        },
      });
      await tx.user.update({
        where: { id: payment.userId },
        data: { tier: payment.tier, tierExpiresAt: newExpiry },
      });
      await tx.paymentWebhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          paymentId: payment.id,
          processingStatus: WebhookProcessingStatus.PROCESSED,
          processedAt: now,
        },
      });
    });

    return {
      success: true,
      orderCode: payment.orderCode,
      tier: payment.tier,
      expiresAt: newExpiry,
      message: `Tài khoản đã được nâng cấp lên ${payment.tier} thành công`,
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
    return prisma.payment.findFirst({
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
}
