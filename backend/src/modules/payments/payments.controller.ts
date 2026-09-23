import { Request, Response } from "express";
import { PaymentsService } from "./payments.service";
import { sendError, sendSuccess } from "../../common/utils/response";
import { SubscriptionTier } from "@prisma/client";
import { z } from "zod";
import { getErrorStatus } from "../../common/errors/app-error";

const createCheckoutSchema = z.object({
  tier: z.enum([SubscriptionTier.VIP, SubscriptionTier.PRO]),
  durationMonths: z.number().int().min(1).max(12).optional(),
});

const webhookSchema = z.object({
  code: z.string(),
  success: z.boolean(),
  signature: z.string().min(1),
  data: z.object({
    orderCode: z.coerce.number().int().positive(),
    amount: z.coerce.number().positive(),
    reference: z.string().optional(),
  }).passthrough(),
});

export class PaymentsController {
  public static async getPlans(req: Request, res: Response) {
    try {
      const plans = PaymentsService.getPlans();
      return sendSuccess(res, plans);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  public static async createCheckout(req: Request, res: Response) {
    try {
      const parsed = createCheckoutSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendError(res, parsed.error.errors[0].message, 400);
      }

      const checkout = await PaymentsService.createCheckout({
        userId: req.user!.id,
        tier: parsed.data.tier,
        durationMonths: parsed.data.durationMonths,
      });

      return sendSuccess(res, checkout, "Tạo đơn hàng thanh toán thành công", 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  public static async handleWebhook(req: Request, res: Response) {
    try {
      const parsed = webhookSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendError(res, "Webhook PayOS không đúng định dạng", 400);
      }
      if (parsed.data.code !== "00" || !parsed.data.success) {
        return sendError(res, "Giao dịch PayOS chưa thành công", 400);
      }

      const result = await PaymentsService.handleWebhook({
        data: parsed.data.data,
        signature: parsed.data.signature,
      });

      return sendSuccess(res, result, "Xử lý Webhook thành công");
    } catch (err: any) {
      return sendError(res, err.message, getErrorStatus(err));
    }
  }

  public static async getMyPayments(req: Request, res: Response) {
    try {
      const history = await PaymentsService.getMyPayments(req.user!.id);
      return sendSuccess(res, history);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  public static async getPaymentStatus(req: Request, res: Response) {
    try {
      const orderCode = Number(req.params.orderCode);
      if (isNaN(orderCode)) {
        return sendError(res, "Mã đơn hàng không hợp lệ", 400);
      }

      const payment = await PaymentsService.getPaymentDetail(
        orderCode,
        req.user!.id,
        req.user!.role
      );
      if (!payment) {
        return sendError(res, "Không tìm thấy đơn thanh toán", 404);
      }

      return sendSuccess(res, payment);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }
}
