import { Request, Response } from "express";
import { HabitRoutineFrequency, MascotMemoryCategory, MascotSuggestionStatus, MoodValue } from "@prisma/client";
import { z } from "zod";
import { getErrorStatus } from "../../common/errors/app-error";
import { sendError, sendSuccess } from "../../common/utils/response";
import { WellbeingService } from "./wellbeing.service";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).transform((v) => new Date(`${v}T00:00:00.000Z`));
const moodSchema = z.object({ mood: z.nativeEnum(MoodValue), energyLevel: z.number().int().min(1).max(5), note: z.string().trim().max(2000).optional(), recordedAt: z.coerce.date().optional() }).strict();
const routineSchema = z.object({ habitId: z.string().uuid().optional(), name: z.string().trim().min(1).max(120), frequency: z.nativeEnum(HabitRoutineFrequency), schedule: z.record(z.unknown()), timezone: z.string().trim().min(1).max(100), targetValue: z.number().positive().max(100000).optional(), unit: z.string().trim().min(1).max(50).optional(), startsOn: dateOnly, endsOn: dateOnly.optional() }).strict();
const completionSchema = z.object({ localDate: dateOnly, value: z.number().positive().max(100000).optional(), note: z.string().trim().max(1000).optional() }).strict();
const activeSchema = z.object({ isActive: z.boolean() }).strict();
const suggestionSchema = z.object({ status: z.enum([MascotSuggestionStatus.SEEN, MascotSuggestionStatus.ACCEPTED, MascotSuggestionStatus.DISMISSED]) }).strict();
const memorySchema = z.object({ category: z.nativeEnum(MascotMemoryCategory), summary: z.string().trim().min(1).max(2000), expiresAt: z.coerce.date().optional(), consent: z.literal(true) }).strict();
function bad(res: Response, error: unknown) { return sendError(res, error, getErrorStatus(error)); }

export class WellbeingController {
  static async moods(req: Request, res: Response) { try { return sendSuccess(res, await WellbeingService.listMoods(req.user!.id, Number(req.query.limit) || 30)); } catch (e) { return bad(res, e); } }
  static async createMood(req: Request, res: Response) { const p=moodSchema.safeParse(req.body); if(!p.success)return sendError(res,p.error.errors[0].message,400); try{return sendSuccess(res,await WellbeingService.createMood(req.user!.id,p.data),"Đã lưu check-in",201);}catch(e){return bad(res,e);} }
  static async routines(req: Request,res: Response){try{return sendSuccess(res,await WellbeingService.listRoutines(req.user!.id,req.query.activeOnly!=="false"));}catch(e){return bad(res,e);}}
  static async createRoutine(req:Request,res:Response){const p=routineSchema.safeParse(req.body);if(!p.success)return sendError(res,p.error.errors[0].message,400);try{return sendSuccess(res,await WellbeingService.createRoutine(req.user!.id,p.data),"Đã tạo routine",201);}catch(e){return bad(res,e);}}
  static async complete(req:Request,res:Response){const p=completionSchema.safeParse(req.body);if(!p.success)return sendError(res,p.error.errors[0].message,400);try{return sendSuccess(res,await WellbeingService.completeRoutine(req.user!.id,req.params.routineId,p.data));}catch(e){return bad(res,e);}}
  static async active(req:Request,res:Response){const p=activeSchema.safeParse(req.body);if(!p.success)return sendError(res,p.error.errors[0].message,400);try{return sendSuccess(res,await WellbeingService.setRoutineActive(req.user!.id,req.params.routineId,p.data.isActive));}catch(e){return bad(res,e);}}
  static async suggestions(req:Request,res:Response){try{return sendSuccess(res,await WellbeingService.listSuggestions(req.user!.id));}catch(e){return bad(res,e);}}
  static async refreshSuggestions(req:Request,res:Response){try{return sendSuccess(res,await WellbeingService.refreshSuggestions(req.user!.id));}catch(e){return bad(res,e);}}
  static async respondSuggestion(req:Request,res:Response){const p=suggestionSchema.safeParse(req.body);if(!p.success)return sendError(res,p.error.errors[0].message,400);try{return sendSuccess(res,await WellbeingService.respondSuggestion(req.user!.id,req.params.suggestionId,p.data.status));}catch(e){return bad(res,e);}}
  static async memories(req:Request,res:Response){try{return sendSuccess(res,await WellbeingService.listMemories(req.user!.id));}catch(e){return bad(res,e);}}
  static async createMemory(req:Request,res:Response){const p=memorySchema.safeParse(req.body);if(!p.success)return sendError(res,p.error.errors[0].message,400);try{return sendSuccess(res,await WellbeingService.createExplicitMemory(req.user!.id,p.data),"Đã lưu memory",201);}catch(e){return bad(res,e);}}
  static async revokeMemory(req:Request,res:Response){try{return sendSuccess(res,await WellbeingService.revokeMemory(req.user!.id,req.params.memoryId));}catch(e){return bad(res,e);}}
  static async mascotConversation(req:Request,res:Response){try{return sendSuccess(res,await WellbeingService.getMascotConversation(req.user!.id));}catch(e){return bad(res,e);}}
}
