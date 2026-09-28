import { Request, Response } from "express";
import { CommunityJoinPolicy, CommunityVisibility } from "@prisma/client";
import { z } from "zod";
import { CommunitiesService } from "./communities.service";
import { sendError, sendSuccess } from "../../common/utils/response";
import { getErrorStatus } from "../../common/errors/app-error";

const createSchema = z.object({
  name: z.string().trim().min(3).max(100),
  description: z.string().trim().max(2000).optional(),
  visibility: z.nativeEnum(CommunityVisibility).optional(),
  joinPolicy: z.nativeEnum(CommunityJoinPolicy).optional(),
}).strict();
const joinSchema = z.object({ message: z.string().trim().max(500).optional() }).strict();
const inviteSchema = z.object({ inviteeId: z.string().uuid() }).strict();
const acceptInviteSchema = z.object({ token: z.string().min(20).max(200) }).strict();
const respondSchema = z.object({ accept: z.boolean() }).strict();
const transferSchema = z.object({ newOwnerId: z.string().uuid() }).strict();

export class CommunitiesController {
  public static async list(req: Request, res: Response) {
    try {
      const data = await CommunitiesService.list(
        req.user?.id,
        typeof req.query.cursor === "string" ? req.query.cursor : undefined,
        Number(req.query.limit) || 20
      );
      return sendSuccess(res, data);
    } catch (error) {
      return sendError(res, error, getErrorStatus(error));
    }
  }

  public static async get(req: Request, res: Response) {
    try {
      return sendSuccess(res, await CommunitiesService.getBySlug(req.params.slug, req.user?.id));
    } catch (error) {
      return sendError(res, error, getErrorStatus(error));
    }
  }

  public static async create(req: Request, res: Response) {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 400);
    try {
      return sendSuccess(res, await CommunitiesService.create(req.user!.id, parsed.data), "Tạo community thành công", 201);
    } catch (error) {
      return sendError(res, error, getErrorStatus(error));
    }
  }

  public static async join(req: Request, res: Response) {
    const parsed = joinSchema.safeParse(req.body ?? {});
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 400);
    try {
      return sendSuccess(res, await CommunitiesService.join(req.user!.id, req.params.communityId, parsed.data.message));
    } catch (error) {
      return sendError(res, error, getErrorStatus(error));
    }
  }

  public static async leave(req: Request, res: Response) {
    try {
      return sendSuccess(res, await CommunitiesService.leave(req.user!.id, req.params.communityId));
    } catch (error) {
      return sendError(res, error, getErrorStatus(error));
    }
  }

  public static async transfer(req: Request, res: Response) {
    const parsed = transferSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 400);
    try {
      return sendSuccess(res, await CommunitiesService.transferOwnership(req.user!.id, req.params.communityId, parsed.data.newOwnerId));
    } catch (error) {
      return sendError(res, error, getErrorStatus(error));
    }
  }

  public static async invite(req: Request, res: Response) {
    const parsed = inviteSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 400);
    try {
      return sendSuccess(res, await CommunitiesService.invite(req.user!.id, req.params.communityId, parsed.data.inviteeId), "Đã tạo lời mời", 201);
    } catch (error) {
      return sendError(res, error, getErrorStatus(error));
    }
  }

  public static async acceptInvite(req: Request, res: Response) {
    const parsed = acceptInviteSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 400);
    try {
      return sendSuccess(res, await CommunitiesService.acceptInvite(req.user!.id, parsed.data.token));
    } catch (error) {
      return sendError(res, error, getErrorStatus(error));
    }
  }

  public static async respondJoinRequest(req: Request, res: Response) {
    const parsed = respondSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 400);
    try {
      return sendSuccess(res, await CommunitiesService.respondJoinRequest(req.user!.id, req.params.requestId, parsed.data.accept));
    } catch (error) {
      return sendError(res, error, getErrorStatus(error));
    }
  }
}
