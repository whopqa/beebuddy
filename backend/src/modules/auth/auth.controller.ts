import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { sendError, sendSuccess } from "../../common/utils/response";
import { z } from "zod";

const strongPasswordSchema = z.string()
  .min(8, "Password must have at least 8 characters")
  .max(72, "Password must not exceed 72 characters")
  .regex(/[A-Za-zÀ-ỹ]/, "Password must include at least one letter")
  .regex(/\d/, "Password must include at least one digit");

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: strongPasswordSchema,
  fullName: z.string().min(2, "Full name must have at least 2 characters"),
  acceptTerms: z.boolean().refine(Boolean, "You must agree to the Terms of Use"),
  acceptPrivacy: z.boolean().refine(Boolean, "You must agree to the Privacy Policy"),
  consentSessionId: z.string().min(8).max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Please enter your password"),
});

const googleLoginSchema = z.object({
  credential: z.string().min(100, "Invalid Google credential").max(10_000),
  acceptTerms: z.boolean().default(false),
  acceptPrivacy: z.boolean().default(false),
  consentSessionId: z.string().min(8).max(100).optional(),
});

const tokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

const emailSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const verifyEmailSchema = z.object({
  email: z.string().email("Invalid email address"),
  code: z.string().regex(/^\d{6}$/, "Verification code must contain exactly 6 digits"),
});

const resetPasswordSchema = z.object({
  token: z.string().min(32, "Invalid password reset token").max(200),
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
      return sendSuccess(res, result, "Account created successfully", 201);
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
      return sendSuccess(res, result, "Signed in successfully");
    } catch (err: any) {
      return sendError(res, err.message, 401);
    }
  }

  public static async loginWithGoogle(req: Request, res: Response) {
    try {
      const parsed = googleLoginSchema.safeParse(req.body);
      if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 400);
      const result = await AuthService.loginWithGoogle(parsed.data, sessionMetadata(req));
      return sendSuccess(res, result, "Signed in with Google successfully");
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
      const status = /Please wait/.test(err.message) ? 429 : 400;
      return sendError(res, err.message, status);
    }
  }

  public static async confirmEmailVerification(req: Request, res: Response) {
    try {
      const parsed = verifyEmailSchema.safeParse(req.body);
      if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 400);
      const result = await AuthService.confirmEmailVerification(parsed.data, sessionMetadata(req));
      return sendSuccess(res, result, "Email verified successfully");
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
      return sendSuccess(res, result, "Password reset successfully");
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
      return sendSuccess(res, result, "Session refreshed successfully");
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
    return sendSuccess(res, result, "Signed out successfully");
  }

  public static async getMe(req: Request, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "User is not authenticated", 401);
      }

      const me = await AuthService.getMe(req.user.id);
      return sendSuccess(res, me, "Account details loaded successfully");
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }
}
