import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { sendError, sendSuccess } from "../../common/utils/response";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email("Email không đúng định dạng"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
  fullName: z.string().min(2, "Họ tên tối thiểu 2 ký tự"),
});

const loginSchema = z.object({
  email: z.string().email("Email không đúng định dạng"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

export class AuthController {
  public static async register(req: Request, res: Response) {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendError(res, parsed.error.errors[0].message, 400);
      }

      const result = await AuthService.register(parsed.data);
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

      const result = await AuthService.login(parsed.data);
      return sendSuccess(res, result, "Đăng nhập thành công");
    } catch (err: any) {
      return sendError(res, err.message, 401);
    }
  }

  public static async refresh(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return sendError(res, "Thiếu refresh token", 400);
      }

      const result = await AuthService.refreshToken(refreshToken);
      return sendSuccess(res, result, "Làm mới phiên thành công");
    } catch (err: any) {
      return sendError(res, err.message, 401);
    }
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
