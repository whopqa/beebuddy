import { Request, Response } from "express";
import { CallType, MessageType, ReactionType } from "@prisma/client";
import { z } from "zod";
import { getErrorStatus } from "../../common/errors/app-error";
import { sendError, sendSuccess } from "../../common/utils/response";
import { ConversationsService } from "./conversations.service";
import { ConversationEventsService } from "./conversation-events.service";

const directSchema = z.object({ userId: z.string().uuid() }).strict();
const groupSchema = z.object({
  title: z.string().trim().min(1).max(120),
  memberIds: z.array(z.string().uuid()).max(100),
  communityId: z.string().uuid().optional(),
}).strict();
const messageSchema = z.object({
  body: z.string().trim().min(1).max(10000),
  clientMessageId: z.string().trim().min(1).max(100),
  replyToMessageId: z.string().uuid().optional(),
}).strict();
const readSchema = z.object({ messageId: z.string().uuid() }).strict();
const reactionSchema = z.object({ type: z.nativeEnum(ReactionType) }).strict();
const membersSchema = z.object({ memberIds: z.array(z.string().uuid()).min(1).max(100) }).strict();
const transferSchema = z.object({ newOwnerId: z.string().uuid() }).strict();
const mediaMessageSchema = z.object({
  type: z.enum([MessageType.IMAGE, MessageType.VIDEO, MessageType.VOICE, MessageType.FILE]),
  mediaAssetIds: z.array(z.string().uuid()).min(1).max(10),
  body: z.string().trim().max(10000).optional(),
  clientMessageId: z.string().trim().min(1).max(100),
}).strict();
const startCallSchema = z.object({ type: z.nativeEnum(CallType), quality: z.enum(["STANDARD", "HD"]).default("STANDARD") }).strict();
const respondCallSchema = z.object({ accept: z.boolean() }).strict();

function parsedOrError<T>(schema: z.ZodType<T>, body: unknown, res: Response): T | undefined {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    sendError(res, parsed.error.errors[0].message, 400);
    return undefined;
  }
  return parsed.data;
}

export class ConversationsController {
  static async events(req: Request, res: Response) {
    res.status(200);
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const write = (event: unknown) => res.write(`data: ${JSON.stringify(event)}\n\n`);
    write({ type: "connected", userId: req.user!.id, occurredAt: new Date().toISOString() });
    const unsubscribe = ConversationEventsService.subscribe(req.user!.id, write);
    const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), 20_000);
    req.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
      res.end();
    });
  }
  static async list(req: Request, res: Response) {
    try { return sendSuccess(res, await ConversationsService.list(req.user!.id, typeof req.query.cursor === "string" ? req.query.cursor : undefined, Number(req.query.limit) || 20)); }
    catch (error) { return sendError(res, error, getErrorStatus(error)); }
  }
  static async direct(req: Request, res: Response) {
    const data = parsedOrError(directSchema, req.body, res); if (!data) return;
    try { return sendSuccess(res, await ConversationsService.getOrCreateDirect(req.user!.id, data.userId), "Đã mở cuộc trò chuyện", 201); }
    catch (error) { return sendError(res, error, getErrorStatus(error)); }
  }
  static async group(req: Request, res: Response) {
    const data = parsedOrError(groupSchema, req.body, res); if (!data) return;
    try { return sendSuccess(res, await ConversationsService.createGroup(req.user!.id, data), "Đã tạo group chat", 201); }
    catch (error) { return sendError(res, error, getErrorStatus(error)); }
  }
  static async messages(req: Request, res: Response) {
    try { return sendSuccess(res, await ConversationsService.listMessages(req.user!.id, req.params.conversationId, typeof req.query.cursor === "string" ? req.query.cursor : undefined, Number(req.query.limit) || 30)); }
    catch (error) { return sendError(res, error, getErrorStatus(error)); }
  }
  static async send(req: Request, res: Response) {
    const data = parsedOrError(messageSchema, req.body, res); if (!data) return;
    try { return sendSuccess(res, await ConversationsService.sendMessage(req.user!.id, req.params.conversationId, data), "Đã gửi tin nhắn", 201); }
    catch (error) { return sendError(res, error, getErrorStatus(error)); }
  }
  static async read(req: Request, res: Response) {
    const data = parsedOrError(readSchema, req.body, res); if (!data) return;
    try { return sendSuccess(res, await ConversationsService.markRead(req.user!.id, req.params.conversationId, data.messageId)); }
    catch (error) { return sendError(res, error, getErrorStatus(error)); }
  }
  static async react(req: Request, res: Response) {
    const data = parsedOrError(reactionSchema, req.body, res); if (!data) return;
    try { return sendSuccess(res, await ConversationsService.react(req.user!.id, req.params.messageId, data.type)); }
    catch (error) { return sendError(res, error, getErrorStatus(error)); }
  }
  static async addMembers(req: Request, res: Response) {
    const data = parsedOrError(membersSchema, req.body, res); if (!data) return;
    try { return sendSuccess(res, await ConversationsService.addMembers(req.user!.id, req.params.conversationId, data.memberIds)); }
    catch (error) { return sendError(res, error, getErrorStatus(error)); }
  }
  static async removeMember(req: Request, res: Response) {
    try { return sendSuccess(res, await ConversationsService.removeMember(req.user!.id, req.params.conversationId, req.params.userId)); }
    catch (error) { return sendError(res, error, getErrorStatus(error)); }
  }
  static async leave(req: Request, res: Response) {
    try { return sendSuccess(res, await ConversationsService.leaveGroup(req.user!.id, req.params.conversationId)); }
    catch (error) { return sendError(res, error, getErrorStatus(error)); }
  }
  static async transfer(req: Request, res: Response) {
    const data = parsedOrError(transferSchema, req.body, res); if (!data) return;
    try { return sendSuccess(res, await ConversationsService.transferOwnership(req.user!.id, req.params.conversationId, data.newOwnerId)); }
    catch (error) { return sendError(res, error, getErrorStatus(error)); }
  }
  static async sendMedia(req: Request, res: Response) {
    const data = parsedOrError(mediaMessageSchema, req.body, res); if (!data) return;
    try { return sendSuccess(res, await ConversationsService.sendMediaMessage(req.user!.id, req.params.conversationId, data), "Đã gửi media", 201); }
    catch (error) { return sendError(res, error, getErrorStatus(error)); }
  }
  static async startCall(req: Request, res: Response) {
    const data = parsedOrError(startCallSchema, req.body, res); if (!data) return;
    try { return sendSuccess(res, await ConversationsService.startCall(req.user!.id, req.params.conversationId, data.type, data.quality), "Đã tạo cuộc gọi", 201); }
    catch (error) { return sendError(res, error, getErrorStatus(error)); }
  }
  static async respondCall(req: Request, res: Response) {
    const data = parsedOrError(respondCallSchema, req.body, res); if (!data) return;
    try { return sendSuccess(res, await ConversationsService.respondToCall(req.user!.id, req.params.callId, data.accept)); }
    catch (error) { return sendError(res, error, getErrorStatus(error)); }
  }
  static async endCall(req: Request, res: Response) {
    try { return sendSuccess(res, await ConversationsService.endCall(req.user!.id, req.params.callId)); }
    catch (error) { return sendError(res, error, getErrorStatus(error)); }
  }
  static async calls(req: Request, res: Response) {
    try { return sendSuccess(res, await ConversationsService.listCalls(req.user!.id, req.params.conversationId, Number(req.query.limit) || 30)); }
    catch (error) { return sendError(res, error, getErrorStatus(error)); }
  }
}
