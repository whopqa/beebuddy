import { Request, Response } from "express";
import { MatchFeedbackType } from "@prisma/client";
import { z } from "zod";
import { getErrorStatus } from "../../common/errors/app-error";
import { sendError, sendSuccess } from "../../common/utils/response";
import { MatchingService } from "./matching.service";

const preferenceSchema = z.object({ enabled: z.boolean().default(true), minAge: z.number().int().min(18).max(120).optional(), maxAge: z.number().int().min(18).max(120).optional(), maxDistanceKm: z.number().int().min(1).max(20000).optional(), preferredGoals: z.array(z.string().min(1).max(100)).max(20).default([]), weights: z.record(z.number().min(0).max(10)).optional() }).refine((v) => !v.minAge || !v.maxAge || v.minAge <= v.maxAge, "minAge phải nhỏ hơn hoặc bằng maxAge");
const feedbackSchema = z.object({ type: z.nativeEnum(MatchFeedbackType), reasons: z.record(z.unknown()).optional() }).strict();

export class MatchingController {
  static async preference(req: Request, res: Response) { try { return sendSuccess(res, await MatchingService.getPreference(req.user!.id)); } catch (e) { return sendError(res, e, getErrorStatus(e)); } }
  static async setPreference(req: Request, res: Response) { const p = preferenceSchema.safeParse(req.body); if (!p.success) return sendError(res, p.error.errors[0].message, 400); try { return sendSuccess(res, await MatchingService.setPreference(req.user!.id, p.data)); } catch (e) { return sendError(res, e, getErrorStatus(e)); } }
  static async refresh(req: Request, res: Response) { try { return sendSuccess(res, await MatchingService.refresh(req.user!.id, Number(req.body?.limit) || 20), "Đã tạo recommendations"); } catch (e) { return sendError(res, e, getErrorStatus(e)); } }
  static async list(req: Request, res: Response) { try { return sendSuccess(res, await MatchingService.list(req.user!.id, Number(req.query.limit) || 20)); } catch (e) { return sendError(res, e, getErrorStatus(e)); } }
  static async feedback(req: Request, res: Response) { const p = feedbackSchema.safeParse(req.body); if (!p.success) return sendError(res, p.error.errors[0].message, 400); try { return sendSuccess(res, await MatchingService.feedback(req.user!.id, req.params.recommendationId, p.data.type, p.data.reasons)); } catch (e) { return sendError(res, e, getErrorStatus(e)); } }
}
