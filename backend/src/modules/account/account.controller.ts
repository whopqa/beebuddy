import { Request, Response } from "express";
import { AccountService } from "./account.service";
import { sendError, sendSuccess } from "../../common/utils/response";
import { z } from "zod";
import { ProfileAudience, ProfileSection } from "@prisma/client";

const updateProfileSchema = z.object({
  fullName: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().or(z.literal("")).optional(),
  bio: z.string().max(500).optional(),
  gender: z.string().max(50).optional(),
  dateOfBirth: z.string().date().optional(),
  location: z.string().max(120).optional(),
  interests: z.array(z.string().min(1).max(50)).max(20).optional(),
  habits: z.array(z.string().min(1).max(50)).max(20).optional(),
  connectionGoal: z.string().max(300).optional(),
}).strict();

const updateSettingsSchema = z.object({
  profileVisibility: z.enum(["PUBLIC", "CONNECTIONS", "ONLY_ME"]).optional(),
  emailNotification: z.boolean().optional(),
  language: z.enum(["vi", "en"]).optional(),
  theme: z.enum(["system", "light", "dark"]).optional(),
}).strict();

const updateProfilePrivacySchema = z.object({
  rules: z.array(z.object({
    section: z.nativeEnum(ProfileSection),
    audience: z.nativeEnum(ProfileAudience),
  }).strict()).min(1).max(9).superRefine((rules, ctx) => {
    const sections = new Set(rules.map((rule) => rule.section));
    if (sections.size !== rules.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Mỗi phần hồ sơ chỉ được khai báo một lần" });
    }
  }),
}).strict();

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại"),
  newPassword: z.string().min(6, "Mật khẩu mới tối thiểu 6 ký tự"),
});

export class AccountController {
  public static async getProfile(req: Request, res: Response) {
    try {
      const profile = await AccountService.getProfile(req.user!.id);
      return sendSuccess(res, profile);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  public static async updateProfile(req: Request, res: Response) {
    try {
      const parsed = updateProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendError(res, parsed.error.errors[0].message, 400);
      }

      const updated = await AccountService.updateProfile(req.user!.id, parsed.data);
      return sendSuccess(res, updated, "Cập nhật thông tin hồ sơ thành công");
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  public static async changePassword(req: Request, res: Response) {
    try {
      const parsed = changePasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendError(res, parsed.error.errors[0].message, 400);
      }

      await AccountService.changePassword(
        req.user!.id,
        parsed.data.currentPassword,
        parsed.data.newPassword
      );
      return sendSuccess(res, null, "Đổi mật khẩu thành công");
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  public static async getSessions(req: Request, res: Response) {
    try {
      const sessions = await AccountService.getSessions(req.user!.id, req.user!.sessionId);
      return sendSuccess(res, sessions);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  public static async revokeOtherSessions(req: Request, res: Response) {
    try {
      const result = await AccountService.revokeOtherSessions(req.user!.id, req.user!.sessionId);
      return sendSuccess(res, result, "Đã đăng xuất các phiên khác");
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  public static async revokeSession(req: Request, res: Response) {
    try {
      const result = await AccountService.revokeSession(req.user!.id, req.params.id, req.user!.sessionId);
      return sendSuccess(res, result, "Đã thu hồi phiên đăng nhập");
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  public static async getProfilePrivacy(req: Request, res: Response) {
    try {
      const rules = await AccountService.getProfilePrivacy(req.user!.id);
      return sendSuccess(res, rules);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  public static async updateProfilePrivacy(req: Request, res: Response) {
    try {
      const parsed = updateProfilePrivacySchema.safeParse(req.body);
      if (!parsed.success) {
        return sendError(res, parsed.error.errors[0].message, 400);
      }
      const rules = await AccountService.updateProfilePrivacy(req.user!.id, parsed.data.rules);
      return sendSuccess(res, rules, "Cập nhật quyền riêng tư hồ sơ thành công");
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  public static async getSettings(req: Request, res: Response) {
    try {
      const settings = await AccountService.getSettings(req.user!.id);
      return sendSuccess(res, settings);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  public static async updateSettings(req: Request, res: Response) {
    try {
      const parsed = updateSettingsSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendError(res, parsed.error.errors[0].message, 400);
      }
      const updated = await AccountService.updateSettings(req.user!.id, parsed.data);
      return sendSuccess(res, updated, "Cập nhật cài đặt thành công");
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }
}
