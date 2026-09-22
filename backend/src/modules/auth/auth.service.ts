import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma";
import { ENV } from "../../config/environment";
import { Role, SubscriptionTier } from "@prisma/client";
import { AuthUserPayload } from "../../common/middlewares/auth.middleware";

export class AuthService {
  private static generateTokens(user: {
    id: string;
    email: string;
    role: Role;
    tier: SubscriptionTier;
  }) {
    const payload: AuthUserPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      tier: user.tier,
    };

    const accessToken = jwt.sign(payload, ENV.JWT.SECRET, {
      expiresIn: ENV.JWT.EXPIRES_IN as any,
    });

    const refreshToken = jwt.sign(payload, ENV.JWT.REFRESH_SECRET, {
      expiresIn: ENV.JWT.REFRESH_EXPIRES_IN as any,
    });

    return { accessToken, refreshToken };
  }

  public static async register(data: {
    email: string;
    password: string;
    fullName: string;
    role?: Role;
  }) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new Error("Email này đã được đăng ký trong hệ thống");
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase().trim(),
        passwordHash,
        role: data.role || Role.USER,
        profile: {
          create: {
            fullName: data.fullName.trim(),
            username: data.email.split("@")[0] + "_" + Math.floor(Math.random() * 1000),
          },
        },
        settings: {
          create: {},
        },
      },
      include: {
        profile: true,
        settings: true,
      },
    });

    const tokens = this.generateTokens(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tier: user.tier,
        profile: user.profile,
      },
      ...tokens,
    };
  }

  public static async login(data: { email: string; password: string }) {
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
      include: { profile: true },
    });

    if (!user || !user.passwordHash) {
      throw new Error("Tài khoản hoặc mật khẩu không chính xác");
    }

    if (user.isBanned) {
      throw new Error(`Tài khoản của bạn đã bị khóa: ${user.banReason || "Vi phạm chính sách"}`);
    }

    const isValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isValid) {
      throw new Error("Tài khoản hoặc mật khẩu không chính xác");
    }

    const tokens = this.generateTokens(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tier: user.tier,
        profile: user.profile,
      },
      ...tokens,
    };
  }

  public static async refreshToken(token: string) {
    try {
      const decoded = jwt.verify(token, ENV.JWT.REFRESH_SECRET) as AuthUserPayload;
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
      });

      if (!user || user.isBanned) {
        throw new Error("Người dùng không hợp lệ hoặc đã bị khóa");
      }

      return this.generateTokens(user);
    } catch {
      throw new Error("Refresh token không hợp lệ hoặc đã hết hạn");
    }
  }

  public static async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        settings: true,
      },
    });

    if (!user) {
      throw new Error("Không tìm thấy thông tin người dùng");
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      tier: user.tier,
      tierExpiresAt: user.tierExpiresAt,
      isVerified: user.isVerified,
      profile: user.profile,
      settings: user.settings,
    };
  }
}
