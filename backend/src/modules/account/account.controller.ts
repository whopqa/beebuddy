import { Request, Response } from "express";
import { AccountService } from "./account.service";
import { sendError, sendSuccess } from "../../common/utils/response";
import { z } from "zod";

const updateProfileSchema = z.object({
  fullName: z.string().min(1).optional(),
  avatarUrl: z.string().url().or(z.literal("")).optional(),
  bio: z.string().max(500).optional(),
  gender: z.string().optional(),
  dateOfBirth: z.string().optional(),
  location: z.string().optional(),
  interests: z.array(z.string()).optional(),
  habits: z.array(z.string()).optional(),
  connectionGoal: z.string().optional(),
});

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
      const updated = await AccountService.updateSettings(req.user!.id, req.body);
      return sendSuccess(res, updated, "Cập nhật cài đặt thành công");
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }
}
