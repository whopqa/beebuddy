import { Request, Response } from "express";
import { AdminService } from "./admin.service";
import { sendError, sendSuccess } from "../../common/utils/response";
import { PaymentStatus, ReportStatus, Role, SubscriptionTier } from "@prisma/client";
import { z } from "zod";
import { getErrorStatus } from "../../common/errors/app-error";

const banUserSchema = z.object({
  reason: z.string().min(3, "Vui lòng nhập lý do khóa tài khoản"),
});

const updateTierSchema = z.object({
  tier: z.enum([SubscriptionTier.FREE, SubscriptionTier.VIP, SubscriptionTier.PRO]),
  durationMonths: z.number().int().min(1).max(24).optional(),
});

const moderateCommentSchema = z.object({
  action: z.enum(["APPROVE", "HIDE"]),
});

const moderatePostSchema = z.object({ action: z.enum(["APPROVE", "HIDE"]) }).strict();
const resolveReportSchema = z.object({
  action: z.enum(["RESOLVE", "DISMISS"]),
  note: z.string().trim().max(2000).optional(),
}).strict();

const badwordSchema = z.object({
  pattern: z.string().min(1, "Từ cấm không được để trống"),
  category: z.string().optional(),
});

export class AdminController {
  public static async getMetrics(req: Request, res: Response) {
    try {
      const metrics = await AdminService.getDashboardMetrics();
      return sendSuccess(res, metrics);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  public static async getUsers(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 15;
      const search = req.query.search as string;
      const role = req.query.role as Role;
      const tier = req.query.tier as SubscriptionTier;
      const isBanned = req.query.isBanned !== undefined ? req.query.isBanned === "true" : undefined;

      const users = await AdminService.getUsers({ page, limit, search, role, tier, isBanned });
      return sendSuccess(res, users);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  public static async banUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const parsed = banUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendError(res, parsed.error.errors[0].message, 400);
      }

      const updated = await AdminService.banUser(req.user!.id, id, parsed.data.reason);
      return sendSuccess(res, updated, "Đã khóa tài khoản người dùng");
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  public static async unbanUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updated = await AdminService.unbanUser(req.user!.id, id);
      return sendSuccess(res, updated, "Đã mở khóa tài khoản người dùng");
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  public static async updateUserTier(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const parsed = updateTierSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendError(res, parsed.error.errors[0].message, 400);
      }

      const updated = await AdminService.updateUserTier(
        req.user!.id,
        id,
        parsed.data.tier,
        parsed.data.durationMonths
      );
      return sendSuccess(res, updated, `Đã cập nhật gói cước sang ${parsed.data.tier}`);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  public static async getPayments(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 15;
      const status = req.query.status as PaymentStatus;
      const search = req.query.search as string;

      const payments = await AdminService.getPayments({ page, limit, status, search });
      return sendSuccess(res, payments);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  public static async getFlaggedComments(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 15;

      const comments = await AdminService.getFlaggedComments({ page, limit });
      return sendSuccess(res, comments);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  public static async moderateComment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const parsed = moderateCommentSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendError(res, parsed.error.errors[0].message, 400);
      }

      const updated = await AdminService.moderateComment(req.user!.id, id, parsed.data.action);
      return sendSuccess(res, updated, `Đã xử lý bình luận thành công (${parsed.data.action})`);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  public static async getFlaggedPosts(req: Request, res: Response) {
    try {
      return sendSuccess(res, await AdminService.getFlaggedPosts({ page: Number(req.query.page) || 1, limit: Number(req.query.limit) || 15 }));
    } catch (error) {
      return sendError(res, error, getErrorStatus(error));
    }
  }

  public static async moderatePost(req: Request, res: Response) {
    const parsed = moderatePostSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 400);
    try {
      return sendSuccess(res, await AdminService.moderatePost(req.user!.id, req.params.id, parsed.data.action), `Đã xử lý bài viết (${parsed.data.action})`);
    } catch (error) {
      return sendError(res, error, getErrorStatus(error));
    }
  }

  public static async getReports(req: Request, res: Response) {
    const status = typeof req.query.status === "string" && Object.values(ReportStatus).includes(req.query.status as ReportStatus)
      ? req.query.status as ReportStatus
      : undefined;
    try {
      return sendSuccess(res, await AdminService.getReports({ page: Number(req.query.page) || 1, limit: Number(req.query.limit) || 25, status }));
    } catch (error) {
      return sendError(res, error, getErrorStatus(error));
    }
  }

  public static async resolveReport(req: Request, res: Response) {
    const parsed = resolveReportSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 400);
    try {
      return sendSuccess(res, await AdminService.resolveReport(req.user!.id, req.params.id, parsed.data.action, parsed.data.note), "Đã xử lý báo cáo");
    } catch (error) {
      return sendError(res, error, getErrorStatus(error));
    }
  }

  public static async getAuditLogs(req: Request, res: Response) {
    try {
      return sendSuccess(res, await AdminService.getAuditLogs({
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 30,
        action: typeof req.query.action === "string" ? req.query.action : undefined,
        targetType: typeof req.query.targetType === "string" ? req.query.targetType : undefined,
      }));
    } catch (error) {
      return sendError(res, error, getErrorStatus(error));
    }
  }

  public static async getBadwords(req: Request, res: Response) {
    try {
      const words = await AdminService.getBadwords();
      return sendSuccess(res, words);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  public static async addBadword(req: Request, res: Response) {
    try {
      const parsed = badwordSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendError(res, parsed.error.errors[0].message, 400);
      }

      const created = await AdminService.addBadword(req.user!.id, parsed.data.pattern, parsed.data.category);
      return sendSuccess(res, created, "Thêm từ cấm mới thành công", 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  public static async deleteBadword(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await AdminService.deleteBadword(req.user!.id, id);
      return sendSuccess(res, null, "Xóa từ cấm thành công");
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }
}
