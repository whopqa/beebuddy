import { ConnectionStatus } from "@prisma/client";
import { Request, Response } from "express";
import { z } from "zod";
import { getErrorStatus } from "../../common/errors/app-error";
import { sendError, sendSuccess } from "../../common/utils/response";
import { ConnectionsService } from "./connections.service";

const requestSchema = z.object({ targetId: z.string().uuid() }).strict();
const respondSchema = z.object({ accept: z.boolean() }).strict();

export class ConnectionsController {
  static async list(req: Request, res: Response) {
    const parsedStatus = typeof req.query.status === "string"
      ? z.nativeEnum(ConnectionStatus).safeParse(req.query.status)
      : null;
    if (parsedStatus && !parsedStatus.success) return sendError(res, "Trạng thái kết nối không hợp lệ", 400);
    try {
      return sendSuccess(res, await ConnectionsService.list(
        req.user!.id,
        parsedStatus?.success ? parsedStatus.data : undefined,
        Number(req.query.limit) || 50
      ));
    } catch (error) { return sendError(res, error, getErrorStatus(error)); }
  }

  static async request(req: Request, res: Response) {
    const parsed = requestSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 400);
    try { return sendSuccess(res, await ConnectionsService.request(req.user!.id, parsed.data.targetId), "Đã gửi lời mời kết nối", 201); }
    catch (error) { return sendError(res, error, getErrorStatus(error)); }
  }

  static async respond(req: Request, res: Response) {
    const parsed = respondSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 400);
    try { return sendSuccess(res, await ConnectionsService.respond(req.user!.id, req.params.connectionId, parsed.data.accept)); }
    catch (error) { return sendError(res, error, getErrorStatus(error)); }
  }

  static async cancel(req: Request, res: Response) {
    try { return sendSuccess(res, await ConnectionsService.cancel(req.user!.id, req.params.connectionId)); }
    catch (error) { return sendError(res, error, getErrorStatus(error)); }
  }

  static async remove(req: Request, res: Response) {
    try { return sendSuccess(res, await ConnectionsService.remove(req.user!.id, req.params.connectionId)); }
    catch (error) { return sendError(res, error, getErrorStatus(error)); }
  }
}
