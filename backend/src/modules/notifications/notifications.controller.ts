import { Request, Response } from "express";
import { NotificationChannel, NotificationType, PushPlatform } from "@prisma/client";
import { z } from "zod";
import { getErrorStatus } from "../../common/errors/app-error";
import { sendError, sendSuccess } from "../../common/utils/response";
import { NotificationsService } from "./notifications.service";

const preferenceSchema = z.object({ type: z.nativeEnum(NotificationType), channel: z.nativeEnum(NotificationChannel), enabled: z.boolean() }).strict();
const tokenSchema = z.object({ platform: z.nativeEnum(PushPlatform), deviceId: z.string().trim().min(1).max(200), token: z.string().trim().min(16).max(4096) }).strict();
const revokeSchema = z.object({ deviceId: z.string().trim().min(1).max(200) }).strict();

export class NotificationsController {
  static async list(req: Request, res: Response) {
    try { return sendSuccess(res, await NotificationsService.list(req.user!.id, typeof req.query.cursor === "string" ? req.query.cursor : undefined, Number(req.query.limit) || 30, req.query.unreadOnly === "true")); }
    catch (error) { return sendError(res, error, getErrorStatus(error)); }
  }
  static async read(req: Request, res: Response) {
    try { return sendSuccess(res, await NotificationsService.markRead(req.user!.id, req.params.notificationId)); }
    catch (error) { return sendError(res, error, getErrorStatus(error)); }
  }
  static async readAll(req: Request, res: Response) {
    try { return sendSuccess(res, await NotificationsService.markAllRead(req.user!.id)); }
    catch (error) { return sendError(res, error, getErrorStatus(error)); }
  }
  static async preferences(req: Request, res: Response) {
    try { return sendSuccess(res, await NotificationsService.getPreferences(req.user!.id)); }
    catch (error) { return sendError(res, error, getErrorStatus(error)); }
  }
  static async setPreference(req: Request, res: Response) {
    const parsed = preferenceSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 400);
    try { return sendSuccess(res, await NotificationsService.setPreference(req.user!.id, parsed.data.type, parsed.data.channel, parsed.data.enabled)); }
    catch (error) { return sendError(res, error, getErrorStatus(error)); }
  }
  static async registerToken(req: Request, res: Response) {
    const parsed = tokenSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 400);
    try { return sendSuccess(res, await NotificationsService.registerToken(req.user!.id, parsed.data.platform, parsed.data.deviceId, parsed.data.token), "Đã đăng ký thiết bị", 201); }
    catch (error) { return sendError(res, error, getErrorStatus(error)); }
  }
  static async revokeToken(req: Request, res: Response) {
    const parsed = revokeSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 400);
    try { return sendSuccess(res, await NotificationsService.revokeToken(req.user!.id, parsed.data.deviceId)); }
    catch (error) { return sendError(res, error, getErrorStatus(error)); }
  }
}
