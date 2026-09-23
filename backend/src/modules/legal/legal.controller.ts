import { Request, Response } from "express";
import { LegalService } from "./legal.service";
import { sendError, sendSuccess } from "../../common/utils/response";
import { z } from "zod";

const consentSchema = z.object({
  consentType: z.enum(["COOKIES", "PRIVACY", "TERMS"]),
  isAccepted: z.boolean().optional(),
  sessionId: z.string().min(8).max(100).optional(),
}).strict();

export class LegalController {
  public static async recordConsent(req: Request, res: Response) {
    try {
      const parsed = consentSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendError(res, parsed.error.errors[0].message, 400);
      }

      const result = await LegalService.recordConsent({
        userId: req.user?.id,
        sessionId: parsed.data.sessionId,
        consentType: parsed.data.consentType,
        isAccepted: parsed.data.isAccepted,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers["user-agent"],
      });

      return sendSuccess(res, result, "Ghi nhận xác nhận điều khoản thành công");
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  public static async checkConsent(req: Request, res: Response) {
    try {
      const sessionId = req.query.sessionId as string;
      const userId = req.user?.id;

      const status = await LegalService.checkConsent({ userId, sessionId });
      return sendSuccess(res, status);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }
}
