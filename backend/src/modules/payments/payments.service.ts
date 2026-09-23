import { prisma } from "../../lib/prisma";
import { PaymentStatus, Prisma, Role, SubscriptionTier } from "@prisma/client";
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

export interface PlanDetail {
  tier: SubscriptionTier;
  name: string;
  priceVND: number;
  durationMonths: number;
  features: string[];
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionTier, PlanDetail> = {
  FREE: {
    tier: SubscriptionTier.FREE,
    name: "Gói Cơ Bản (Free)",
    priceVND: 0,
    durationMonths: 0,
    features: [
      "Khám phá bài viết công khai",
      "Kết nối bạn bè cơ bản",
      "Tham gia tối đa 2 nhóm cộng đồng",
    ],
  },
  VIP: {
    tier: SubscriptionTier.VIP,
    name: "Gói VIP BeeBuddy",
    priceVND: 49000,
    durationMonths: 1,
    features: [
      "Tạo tối đa 5 nhóm riêng tư trên App",
      "Huy hiệu VIP nổi bật trên hồ sơ",
      "Ưu tiên gợi ý kết nối bạn bè cùng sở thích",
      "Xem trước chi tiết hồ sơ kết nối",
    ],
  },
  PRO: {
    tier: SubscriptionTier.PRO,
    name: "Gói PRO Không Giới Hạn",
    priceVND: 99000,
    durationMonths: 1,
    features: [
      "Tạo nhóm và cộng đồng không giới hạn trên App",
      "Toàn quyền truy cập phòng chat chất lượng cao",
      "Huy hiệu PRO vương miện danh giá",
      "Mở rộng phân tích thói quen cùng Mascot AI",
      "Hỗ trợ kỹ thuật ưu tiên 24/7",
    ],
  },
};

export class PaymentsService {
  public static getPlans() {
    return Object.values(SUBSCRIPTION_PLANS);
  }

  public static async createCheckout(params: {
    userId: string;
    tier: SubscriptionTier;
    durationMonths?: number;
  }) {
    if (params.tier === SubscriptionTier.FREE) {
      throw new Error("Gói miễn phí không cần thanh toán");
    }

    const plan = SUBSCRIPTION_PLANS[params.tier];
    if (!plan) {
      throw new Error("Gói cước không hợp lệ");
    }

    const durationMonths = params.durationMonths || 1;
    const totalAmount = plan.priceVND * durationMonths;

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
        tier: params.tier,
        durationMonths,
        amount: totalAmount,
        currency: "VND",
        paymentMethod: "PAYOS_VIETQR",
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

    const payment = await prisma.payment.findUnique({
      where: { orderCode: payload.data.orderCode },
      include: { user: true },
    });

    if (!payment) {
      throw new AppError(`Không tìm thấy đơn thanh toán có mã: ${payload.data.orderCode}`, 404);
    }

    if (payment.status === PaymentStatus.COMPLETED) {
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

    // Cập nhật CSDL trong transaction
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.COMPLETED,
          paidAt: now,
          transactionRef: payload.data.reference || `TXN_${Date.now()}`,
          rawWebhookData: JSON.parse(JSON.stringify({
            data: payload.data,
            signature: payload.signature,
          })) as Prisma.InputJsonValue,
        },
      }),
      prisma.user.update({
        where: { id: payment.userId },
        data: {
          tier: payment.tier,
          tierExpiresAt: newExpiry,
        },
      }),
    ]);

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
