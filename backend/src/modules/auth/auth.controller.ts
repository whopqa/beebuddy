import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { sendError, sendSuccess } from "../../common/utils/response";
import { z } from "zod";

const strongPasswordSchema = z.string()
  .min(8, "Mật khẩu phải có ít nhất 8 ký tự")
  .max(72, "Mật khẩu không được vượt quá 72 ký tự")
  .regex(/[A-Za-zÀ-ỹ]/, "Mật khẩu phải có ít nhất một chữ cái")
  .regex(/\d/, "Mật khẩu phải có ít nhất một chữ số");

const registerSchema = z.object({
  email: z.string().email("Email không đúng định dạng"),
  password: strongPasswordSchema,
  fullName: z.string().min(2, "Họ tên tối thiểu 2 ký tự"),
  acceptTerms: z.boolean().refine(Boolean, "Bạn phải đồng ý Điều khoản sử dụng"),
  acceptPrivacy: z.boolean().refine(Boolean, "Bạn phải đồng ý Chính sách quyền riêng tư"),
  consentSessionId: z.string().min(8).max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email("Email không đúng định dạng"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

const tokenSchema = z.object({
  refreshToken: z.string().min(1, "Thiếu refresh token"),
});

const emailSchema = z.object({
  email: z.string().email("Email không đúng định dạng"),
});

const verifyEmailSchema = z.object({
  email: z.string().email("Email không đúng định dạng"),
  code: z.string().regex(/^\d{6}$/, "Mã xác minh phải gồm đúng 6 chữ số"),
});

const resetPasswordSchema = z.object({
  token: z.string().min(32, "Token đặt lại mật khẩu không hợp lệ").max(200),
  newPassword: strongPasswordSchema,
});

function limitedHeader(req: Request, name: string, maxLength = 255) {
  const value = req.get(name)?.trim();
  return value ? value.slice(0, maxLength) : undefined;
}

function sessionMetadata(req: Request) {
  return {
    deviceId: limitedHeader(req, "x-device-id", 100),
    deviceName: limitedHeader(req, "x-device-name", 100),
    platform: limitedHeader(req, "x-platform", 30),
    ipAddress: req.ip,
    userAgent: limitedHeader(req, "user-agent", 500),
  };
}

export class AuthController {
  public static async register(req: Request, res: Response) {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendError(res, parsed.error.errors[0].message, 400);
      }

      const result = await AuthService.register({
        ...parsed.data,
        ...sessionMetadata(req),
      });
      return sendSuccess(res, result, "Đăng ký tài khoản thành công", 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  public static async login(req: Request, res: Response) {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendError(res, parsed.error.errors[0].message, 400);
      }

      const result = await AuthService.login(parsed.data, sessionMetadata(req));
      return sendSuccess(res, result, "Đăng nhập thành công");
    } catch (err: any) {
      return sendError(res, err.message, 401);
    }
  }

  public static async requestEmailVerification(req: Request, res: Response) {
    try {
      const parsed = emailSchema.safeParse(req.body);
      if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 400);
      const result = await AuthService.requestEmailVerification(parsed.data.email);
      return sendSuccess(res, result, result.message);
    } catch (err: any) {
      const status = /Vui lòng chờ/.test(err.message) ? 429 : 400;
      return sendError(res, err.message, status);
    }
  }

  public static async confirmEmailVerification(req: Request, res: Response) {
    try {
      const parsed = verifyEmailSchema.safeParse(req.body);
      if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 400);
      const result = await AuthService.confirmEmailVerification(parsed.data, sessionMetadata(req));
      return sendSuccess(res, result, "Xác minh email thành công");
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  public static async requestPasswordReset(req: Request, res: Response) {
    const parsed = emailSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 400);
    const result = await AuthService.requestPasswordReset(parsed.data.email);
    return sendSuccess(res, result, result.message);
  }

  public static async confirmPasswordReset(req: Request, res: Response) {
    try {
      const parsed = resetPasswordSchema.safeParse(req.body);
      if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 400);
      const result = await AuthService.confirmPasswordReset(parsed.data);
      return sendSuccess(res, result, "Đặt lại mật khẩu thành công");
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  public static async refresh(req: Request, res: Response) {
    try {
      const parsed = tokenSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendError(res, parsed.error.errors[0].message, 400);
      }

      const result = await AuthService.refreshToken(parsed.data.refreshToken, sessionMetadata(req));
      return sendSuccess(res, result, "Làm mới phiên thành công");
    } catch (err: any) {
      return sendError(res, err.message, 401);
    }
  }

  public static async logout(req: Request, res: Response) {
    const parsed = tokenSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, parsed.error.errors[0].message, 400);
    }

    const result = await AuthService.logout(parsed.data.refreshToken);
    return sendSuccess(res, result, "Đăng xuất thành công");
  }

  public static async getMe(req: Request, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Chưa xác thực người dùng", 401);
      }

      const me = await AuthService.getMe(req.user.id);
      return sendSuccess(res, me, "Lấy thông tin tài khoản thành công");
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }
}
