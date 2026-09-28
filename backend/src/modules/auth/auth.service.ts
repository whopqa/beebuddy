import bcrypt from "bcryptjs";
import { createHash, randomBytes, randomInt, randomUUID } from "crypto";
import jwt from "jsonwebtoken";
import {
  AuthProvider,
  ConsentDecision,
  LegalDocumentType,
  OneTimeTokenType,
  ProfileAudience,
  ProfileSection,
  Role,
  SubscriptionSource,
  SubscriptionStatus,
  SubscriptionTier,
} from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { ENV } from "../../config/environment";
import { AuthUserPayload } from "../../common/middlewares/auth.middleware";
import { AuthEmailService } from "./auth-email.service";
import { GoogleIdentityService } from "./google-identity.service";

type TokenUser = {
  id: string;
  email: string;
  role: Role;
  tier: SubscriptionTier;
};

export type SessionMetadata = {
  deviceId?: string;
  deviceName?: string;
  platform?: string;
  ipAddress?: string;
  userAgent?: string;
};

type RefreshTokenPayload = AuthUserPayload & { sessionId: string };

const DEFAULT_PROFILE_VISIBILITY = [
  { section: ProfileSection.BASIC, audience: ProfileAudience.PUBLIC },
  { section: ProfileSection.BIO, audience: ProfileAudience.PUBLIC },
  { section: ProfileSection.INTERESTS, audience: ProfileAudience.PUBLIC },
  { section: ProfileSection.AGE, audience: ProfileAudience.CONNECTIONS },
  { section: ProfileSection.OCCUPATION, audience: ProfileAudience.CONNECTIONS },
  { section: ProfileSection.PLACES, audience: ProfileAudience.CONNECTIONS },
  { section: ProfileSection.GOALS, audience: ProfileAudience.CONNECTIONS },
  { section: ProfileSection.INTRO_MEDIA, audience: ProfileAudience.CONNECTIONS },
  { section: ProfileSection.HABITS, audience: ProfileAudience.ONLY_ME },
];

export class AuthService {
  private static hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  private static getTokenExpiry(token: string) {
    const decoded = jwt.decode(token);
    if (!decoded || typeof decoded === "string" || typeof decoded.exp !== "number") {
      throw new Error("Không xác định được thời hạn refresh token");
    }
    return new Date(decoded.exp * 1000);
  }

  private static signTokens(user: TokenUser, sessionId: string) {
    const payload: AuthUserPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      tier: user.tier,
      sessionId,
    };

    const accessToken = jwt.sign(payload, ENV.JWT.SECRET, {
      algorithm: "HS256",
      expiresIn: ENV.JWT.EXPIRES_IN as any,
    });

    const refreshToken = jwt.sign(payload, ENV.JWT.REFRESH_SECRET, {
      algorithm: "HS256",
      expiresIn: ENV.JWT.REFRESH_EXPIRES_IN as any,
    });

    return { accessToken, refreshToken };
  }

  private static sessionCreateData(
    userId: string,
    sessionId: string,
    refreshToken: string,
    metadata: SessionMetadata
  ) {
    return {
      id: sessionId,
      userId,
      refreshTokenHash: this.hashToken(refreshToken),
      expiresAt: this.getTokenExpiry(refreshToken),
      deviceId: metadata.deviceId,
      deviceName: metadata.deviceName,
      platform: metadata.platform,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    };
  }

  private static async createSession(user: TokenUser, metadata: SessionMetadata = {}) {
    const sessionId = randomUUID();
    const tokens = this.signTokens(user, sessionId);

    await prisma.userSession.create({
      data: this.sessionCreateData(user.id, sessionId, tokens.refreshToken, metadata),
    });

    return tokens;
  }

  private static verifyRefreshToken(token: string, ignoreExpiration = false) {
    const decoded = jwt.verify(token, ENV.JWT.REFRESH_SECRET, {
      algorithms: ["HS256"],
      ignoreExpiration,
    });

    if (
      typeof decoded === "string" ||
      typeof decoded.id !== "string" ||
      typeof decoded.sessionId !== "string"
    ) {
      throw new Error("Refresh token không có session hợp lệ");
    }

    return decoded as RefreshTokenPayload;
  }

  private static verificationCodeHash(userId: string, code: string) {
    return this.hashToken(`${userId}:${code}`);
  }

  private static async assertTokenCooldown(userId: string, type: OneTimeTokenType) {
    const latest = await prisma.oneTimeToken.findFirst({
      where: { userId, type },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    const cooldownMs = ENV.EMAIL.RESEND_COOLDOWN_SECONDS * 1000;
    if (latest && Date.now() - latest.createdAt.getTime() < cooldownMs) {
      const waitSeconds = Math.ceil((cooldownMs - (Date.now() - latest.createdAt.getTime())) / 1000);
      throw new Error(`Vui lòng chờ ${waitSeconds} giây trước khi yêu cầu mã mới`);
    }
  }

  private static async issueEmailVerification(input: {
    userId: string;
    email: string;
    fullName: string;
  }) {
    await this.assertTokenCooldown(input.userId, OneTimeTokenType.EMAIL_VERIFICATION);
    const code = randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + ENV.EMAIL.VERIFICATION_TTL_MINUTES * 60_000);
    const token = await prisma.$transaction(async (tx) => {
      const now = new Date();
      await tx.oneTimeToken.updateMany({
        where: {
          userId: input.userId,
          type: OneTimeTokenType.EMAIL_VERIFICATION,
          consumedAt: null,
        },
        data: { consumedAt: now },
      });
      return tx.oneTimeToken.create({
        data: {
          userId: input.userId,
          type: OneTimeTokenType.EMAIL_VERIFICATION,
          tokenHash: this.verificationCodeHash(input.userId, code),
          expiresAt,
        },
      });
    });

    try {
      await AuthEmailService.sendVerificationCode({
        email: input.email,
        fullName: input.fullName,
        code,
      });
    } catch (error) {
      await prisma.oneTimeToken.update({
        where: { id: token.id },
        data: { consumedAt: new Date() },
      });
      throw error;
    }

    return ENV.NODE_ENV === "development" && ENV.EMAIL.DELIVERY_MODE === "console"
      ? { developmentCode: code }
      : {};
  }

  public static async register(data: {
    email: string;
    password: string;
    fullName: string;
    role?: Role;
    acceptTerms: boolean;
    acceptPrivacy: boolean;
    consentSessionId?: string;
    ipAddress?: string;
    userAgent?: string;
    deviceId?: string;
    deviceName?: string;
    platform?: string;
  }) {
    if (!data.acceptTerms || !data.acceptPrivacy) {
      throw new Error("Bạn phải đồng ý Điều khoản sử dụng và Chính sách quyền riêng tư");
    }

    const normalizedEmail = data.email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      throw new Error("Email này đã được đăng ký trong hệ thống");
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.$transaction(async (tx) => {
      const legalDocuments = await tx.legalDocument.findMany({
        where: {
          type: { in: [LegalDocumentType.TERMS, LegalDocumentType.PRIVACY] },
          effectiveAt: { lte: new Date() },
          retiredAt: null,
        },
        orderBy: { effectiveAt: "desc" },
      });
      const termsDocument = legalDocuments.find((doc) => doc.type === LegalDocumentType.TERMS);
      const privacyDocument = legalDocuments.find((doc) => doc.type === LegalDocumentType.PRIVACY);
      if (!termsDocument || !privacyDocument) {
        throw new Error("Chưa cấu hình đủ tài liệu TERMS/PRIVACY đang hiệu lực");
      }
      const consentedAt = new Date();

      const createdUser = await tx.user.create({
        data: {
          email: normalizedEmail,
          // Compatibility field retained until every environment has completed M1.
          passwordHash,
          role: data.role || Role.USER,
          authIdentities: {
            create: {
              provider: AuthProvider.EMAIL,
              providerSubject: normalizedEmail,
              providerEmail: normalizedEmail,
              passwordHash,
            },
          },
          profile: {
            create: {
              fullName: data.fullName.trim(),
              username: normalizedEmail.split("@")[0] + "_" + Math.floor(Math.random() * 1000),
            },
          },
          settings: { create: {} },
          visibilityRules: { create: DEFAULT_PROFILE_VISIBILITY },
          consents: {
            create: [
              {
                consentType: "TERMS",
                isAccepted: true,
                sessionId: data.consentSessionId || null,
                legalDocumentId: termsDocument.id,
                decision: ConsentDecision.ACCEPTED,
                consentedAt,
                ipAddress: data.ipAddress,
                userAgent: data.userAgent,
              },
              {
                consentType: "PRIVACY",
                isAccepted: true,
                sessionId: data.consentSessionId || null,
                legalDocumentId: privacyDocument.id,
                decision: ConsentDecision.ACCEPTED,
                consentedAt,
                ipAddress: data.ipAddress,
                userAgent: data.userAgent,
              },
            ],
          },
        },
        include: { profile: true, settings: true },
      });

      const freePlan = await tx.plan.findFirst({
        where: { tier: SubscriptionTier.FREE, isActive: true },
        orderBy: { version: "desc" },
      });
      if (!freePlan) throw new Error("Chưa cấu hình gói FREE đang hoạt động");
      const now = new Date();
      await tx.subscription.create({
        data: {
          userId: createdUser.id,
          planId: freePlan.id,
          status: SubscriptionStatus.ACTIVE,
          source: SubscriptionSource.ADMIN,
          startsAt: now,
          currentPeriodStart: now,
        },
      });

      return createdUser;
    });

    let verificationSent = false;
    let developmentCode: string | undefined;
    try {
      const delivery = await this.issueEmailVerification({
        userId: user.id,
        email: user.email,
        fullName: user.profile?.fullName || data.fullName,
      });
      verificationSent = true;
      developmentCode = delivery.developmentCode;
    } catch (error) {
      console.error("Không thể gửi email xác minh sau khi đăng ký:", error);
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tier: user.tier,
        isVerified: user.isVerified,
        profile: user.profile,
      },
      verificationRequired: true,
      verificationSent,
      ...(developmentCode ? { developmentCode } : {}),
    };
  }

  public static async login(
    data: { email: string; password: string },
    metadata: SessionMetadata = {}
  ) {
    const normalizedEmail = data.email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        profile: true,
        authIdentities: {
          where: { provider: AuthProvider.EMAIL },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new Error("Tài khoản hoặc mật khẩu không chính xác");
    }
    if (user.isBanned) {
      throw new Error(`Tài khoản của bạn đã bị khóa: ${user.banReason || "Vi phạm chính sách"}`);
    }
    const emailIdentity = user.authIdentities?.[0];
    const passwordHash = emailIdentity?.passwordHash || user.passwordHash;
    if (!passwordHash || !(await bcrypt.compare(data.password, passwordHash))) {
      throw new Error("Tài khoản hoặc mật khẩu không chính xác");
    }
    if (!user.isVerified) {
      throw new Error("Email chưa được xác minh. Vui lòng xác minh email trước khi đăng nhập");
    }

    if (emailIdentity) {
      await prisma.authIdentity.update({
        where: { id: emailIdentity.id },
        data: { lastUsedAt: new Date() },
      });
    } else {
      // Dual-read/backfill safety for an account created before M1 was applied.
      await prisma.authIdentity.upsert({
        where: {
          provider_providerSubject: {
            provider: AuthProvider.EMAIL,
            providerSubject: normalizedEmail,
          },
        },
        update: { passwordHash, providerEmail: normalizedEmail, lastUsedAt: new Date() },
        create: {
          userId: user.id,
          provider: AuthProvider.EMAIL,
          providerSubject: normalizedEmail,
          providerEmail: normalizedEmail,
          passwordHash,
          lastUsedAt: new Date(),
        },
      });
    }

    const tokens = await this.createSession(user, metadata);
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

  public static async loginWithGoogle(
    data: {
      credential: string;
      acceptTerms: boolean;
      acceptPrivacy: boolean;
      consentSessionId?: string;
    },
    metadata: SessionMetadata = {}
  ) {
    const google = await GoogleIdentityService.verifyCredential(data.credential);
    if (!google.googleIsAuthoritativeForEmail) {
      throw new Error("BeeBuddy chỉ hỗ trợ Google Sign-In với Gmail hoặc Google Workspace đã xác minh");
    }

    const existingIdentity = await prisma.authIdentity.findUnique({
      where: {
        provider_providerSubject: {
          provider: AuthProvider.GOOGLE,
          providerSubject: google.subject,
        },
      },
      include: { user: { include: { profile: true } } },
    });

    if (existingIdentity) {
      if (existingIdentity.user.isBanned) {
        throw new Error(`Tài khoản của bạn đã bị khóa: ${existingIdentity.user.banReason || "Vi phạm chính sách"}`);
      }
      if (existingIdentity.user.email.toLowerCase() !== google.email) {
        throw new Error("Email Google không còn khớp với tài khoản BeeBuddy đã liên kết");
      }

      const sessionId = randomUUID();
      const tokens = this.signTokens(existingIdentity.user, sessionId);
      await prisma.$transaction(async (tx) => {
        await tx.authIdentity.update({
          where: { id: existingIdentity.id },
          data: {
            providerEmail: google.email,
            verifiedAt: new Date(),
            lastUsedAt: new Date(),
          },
        });
        if (!existingIdentity.user.isVerified) {
          await tx.user.update({ where: { id: existingIdentity.userId }, data: { isVerified: true } });
        }
        await tx.userSession.create({
          data: this.sessionCreateData(existingIdentity.userId, sessionId, tokens.refreshToken, metadata),
        });
      });

      return {
        user: {
          id: existingIdentity.user.id,
          email: existingIdentity.user.email,
          role: existingIdentity.user.role,
          tier: existingIdentity.user.tier,
          isVerified: true,
          profile: existingIdentity.user.profile,
        },
        ...tokens,
      };
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: google.email },
      include: {
        profile: true,
        authIdentities: { where: { provider: AuthProvider.GOOGLE } },
      },
    });

    if (existingUser) {
      if (existingUser.isBanned) {
        throw new Error(`Tài khoản của bạn đã bị khóa: ${existingUser.banReason || "Vi phạm chính sách"}`);
      }
      if (existingUser.authIdentities.length > 0) {
        throw new Error("Tài khoản này đã liên kết với một Google Account khác");
      }

      const sessionId = randomUUID();
      const tokens = this.signTokens(existingUser, sessionId);
      await prisma.$transaction(async (tx) => {
        await tx.authIdentity.create({
          data: {
            userId: existingUser.id,
            provider: AuthProvider.GOOGLE,
            providerSubject: google.subject,
            providerEmail: google.email,
            verifiedAt: new Date(),
            lastUsedAt: new Date(),
          },
        });
        await tx.user.update({ where: { id: existingUser.id }, data: { isVerified: true } });
        await tx.authIdentity.updateMany({
          where: { userId: existingUser.id, provider: AuthProvider.EMAIL, verifiedAt: null },
          data: { verifiedAt: new Date() },
        });
        await tx.oneTimeToken.updateMany({
          where: {
            userId: existingUser.id,
            type: OneTimeTokenType.EMAIL_VERIFICATION,
            consumedAt: null,
          },
          data: { consumedAt: new Date() },
        });
        await tx.userSession.create({
          data: this.sessionCreateData(existingUser.id, sessionId, tokens.refreshToken, metadata),
        });
      });

      return {
        user: {
          id: existingUser.id,
          email: existingUser.email,
          role: existingUser.role,
          tier: existingUser.tier,
          isVerified: true,
          profile: existingUser.profile,
        },
        ...tokens,
      };
    }

    if (!data.acceptTerms || !data.acceptPrivacy) {
      throw new Error("Bạn phải đồng ý Điều khoản sử dụng và Chính sách quyền riêng tư để tạo tài khoản bằng Google");
    }

    const { user, tokens } = await prisma.$transaction(async (tx) => {
      const legalDocuments = await tx.legalDocument.findMany({
        where: {
          type: { in: [LegalDocumentType.TERMS, LegalDocumentType.PRIVACY] },
          effectiveAt: { lte: new Date() },
          retiredAt: null,
        },
        orderBy: { effectiveAt: "desc" },
      });
      const termsDocument = legalDocuments.find((doc) => doc.type === LegalDocumentType.TERMS);
      const privacyDocument = legalDocuments.find((doc) => doc.type === LegalDocumentType.PRIVACY);
      if (!termsDocument || !privacyDocument) {
        throw new Error("Chưa cấu hình đủ tài liệu TERMS/PRIVACY đang hiệu lực");
      }
      const consentedAt = new Date();
      const createdUser = await tx.user.create({
        data: {
          email: google.email,
          isVerified: true,
          authIdentities: {
            create: {
              provider: AuthProvider.GOOGLE,
              providerSubject: google.subject,
              providerEmail: google.email,
              verifiedAt: consentedAt,
              lastUsedAt: consentedAt,
            },
          },
          profile: {
            create: {
              fullName: google.fullName,
              username: google.email.split("@")[0] + "_" + Math.floor(Math.random() * 1000),
              avatarUrl: google.avatarUrl,
            },
          },
          settings: { create: {} },
          visibilityRules: { create: DEFAULT_PROFILE_VISIBILITY },
          consents: {
            create: [
              {
                consentType: "TERMS",
                isAccepted: true,
                sessionId: data.consentSessionId || null,
                legalDocumentId: termsDocument.id,
                decision: ConsentDecision.ACCEPTED,
                consentedAt,
                ipAddress: metadata.ipAddress,
                userAgent: metadata.userAgent,
              },
              {
                consentType: "PRIVACY",
                isAccepted: true,
                sessionId: data.consentSessionId || null,
                legalDocumentId: privacyDocument.id,
                decision: ConsentDecision.ACCEPTED,
                consentedAt,
                ipAddress: metadata.ipAddress,
                userAgent: metadata.userAgent,
              },
            ],
          },
        },
        include: { profile: true },
      });

      const freePlan = await tx.plan.findFirst({
        where: { tier: SubscriptionTier.FREE, isActive: true },
        orderBy: { version: "desc" },
      });
      if (!freePlan) throw new Error("Chưa cấu hình gói FREE đang hoạt động");
      const now = new Date();
      await tx.subscription.create({
        data: {
          userId: createdUser.id,
          planId: freePlan.id,
          status: SubscriptionStatus.ACTIVE,
          source: SubscriptionSource.ADMIN,
          startsAt: now,
          currentPeriodStart: now,
        },
      });

      const sessionId = randomUUID();
      const createdTokens = this.signTokens(createdUser, sessionId);
      await tx.userSession.create({
        data: this.sessionCreateData(createdUser.id, sessionId, createdTokens.refreshToken, metadata),
      });
      return { user: createdUser, tokens: createdTokens };
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tier: user.tier,
        isVerified: true,
        profile: user.profile,
      },
      ...tokens,
    };
  }

  public static async requestEmailVerification(email: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { profile: { select: { fullName: true } } },
    });

    const genericResult = {
      requested: true,
      message: "Nếu tài khoản tồn tại và chưa được xác minh, mã mới đã được gửi đến email.",
    };
    if (!user || user.isVerified) return genericResult;

    try {
      const delivery = await this.issueEmailVerification({
        userId: user.id,
        email: user.email,
        fullName: user.profile?.fullName || "bạn",
      });
      return { ...genericResult, ...delivery };
    } catch (error) {
      console.error("Không thể gửi lại mã xác minh:", error);
      return genericResult;
    }
  }

  public static async confirmEmailVerification(
    data: { email: string; code: string },
    metadata: SessionMetadata = {}
  ) {
    const normalizedEmail = data.email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) throw new Error("Mã xác minh không hợp lệ hoặc đã hết hạn");
    if (user.isVerified) throw new Error("Email này đã được xác minh");

    const tokenHash = this.verificationCodeHash(user.id, data.code);
    const token = await prisma.oneTimeToken.findFirst({
      where: {
        userId: user.id,
        type: OneTimeTokenType.EMAIL_VERIFICATION,
        tokenHash,
        consumedAt: null,
      },
    });

    if (!token) {
      const latest = await prisma.oneTimeToken.findFirst({
        where: {
          userId: user.id,
          type: OneTimeTokenType.EMAIL_VERIFICATION,
          consumedAt: null,
        },
        orderBy: { createdAt: "desc" },
      });
      if (latest) {
        await prisma.oneTimeToken.update({
          where: { id: latest.id },
          data: { attemptCount: { increment: 1 } },
        });
      }
      throw new Error("Mã xác minh không hợp lệ hoặc đã hết hạn");
    }
    if (token.expiresAt <= new Date() || token.attemptCount >= 5) {
      await prisma.oneTimeToken.update({ where: { id: token.id }, data: { consumedAt: new Date() } });
      throw new Error("Mã xác minh không hợp lệ hoặc đã hết hạn");
    }

    const sessionId = randomUUID();
    const tokens = this.signTokens(user, sessionId);
    await prisma.$transaction(async (tx) => {
      const consumed = await tx.oneTimeToken.updateMany({
        where: {
          id: token.id,
          consumedAt: null,
          expiresAt: { gt: new Date() },
          attemptCount: { lt: 5 },
        },
        data: { consumedAt: new Date() },
      });
      if (consumed.count !== 1) throw new Error("Mã xác minh đã được sử dụng");

      await tx.user.update({ where: { id: user.id }, data: { isVerified: true } });
      await tx.authIdentity.updateMany({
        where: { userId: user.id, provider: AuthProvider.EMAIL },
        data: { verifiedAt: new Date() },
      });
      await tx.oneTimeToken.updateMany({
        where: {
          userId: user.id,
          type: OneTimeTokenType.EMAIL_VERIFICATION,
          consumedAt: null,
        },
        data: { consumedAt: new Date() },
      });
      await tx.userSession.create({
        data: this.sessionCreateData(user.id, sessionId, tokens.refreshToken, metadata),
      });
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tier: user.tier,
        isVerified: true,
      },
      ...tokens,
    };
  }

  public static async requestPasswordReset(email: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { profile: { select: { fullName: true } } },
    });
    const genericResult = {
      requested: true,
      message: "Nếu email đã đăng ký, chúng tôi đã gửi liên kết đặt lại mật khẩu.",
    };
    if (!user || user.isBanned) return genericResult;

    try {
      await this.assertTokenCooldown(user.id, OneTimeTokenType.PASSWORD_RESET);
      const rawToken = randomBytes(32).toString("base64url");
      const expiresAt = new Date(Date.now() + ENV.EMAIL.PASSWORD_RESET_TTL_MINUTES * 60_000);
      const token = await prisma.$transaction(async (tx) => {
        const now = new Date();
        await tx.oneTimeToken.updateMany({
          where: { userId: user.id, type: OneTimeTokenType.PASSWORD_RESET, consumedAt: null },
          data: { consumedAt: now },
        });
        return tx.oneTimeToken.create({
          data: {
            userId: user.id,
            type: OneTimeTokenType.PASSWORD_RESET,
            tokenHash: this.hashToken(rawToken),
            expiresAt,
          },
        });
      });
      const resetUrl = `${ENV.CLIENT_URL}/reset-password?token=${encodeURIComponent(rawToken)}`;
      try {
        await AuthEmailService.sendPasswordReset({
          email: user.email,
          fullName: user.profile?.fullName || "bạn",
          resetUrl,
        });
      } catch (error) {
        await prisma.oneTimeToken.update({ where: { id: token.id }, data: { consumedAt: new Date() } });
        throw error;
      }

      return {
        ...genericResult,
        ...(ENV.NODE_ENV === "development" && ENV.EMAIL.DELIVERY_MODE === "console"
          ? { developmentActionUrl: resetUrl }
          : {}),
      };
    } catch (error) {
      console.error("Không thể gửi yêu cầu đặt lại mật khẩu:", error);
      return genericResult;
    }
  }

  public static async confirmPasswordReset(data: { token: string; newPassword: string }) {
    const tokenHash = this.hashToken(data.token);
    const token = await prisma.oneTimeToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            authIdentities: {
              where: { provider: AuthProvider.EMAIL },
              take: 1,
            },
          },
        },
      },
    });
    if (
      !token ||
      token.type !== OneTimeTokenType.PASSWORD_RESET ||
      token.consumedAt ||
      token.expiresAt <= new Date() ||
      token.user.isBanned
    ) {
      throw new Error("Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn");
    }

    const currentPasswordHash = token.user.authIdentities?.[0]?.passwordHash || token.user.passwordHash;
    if (currentPasswordHash && await bcrypt.compare(data.newPassword, currentPasswordHash)) {
      throw new Error("Mật khẩu mới phải khác mật khẩu hiện tại");
    }

    const passwordHash = await bcrypt.hash(data.newPassword, 10);
    await prisma.$transaction(async (tx) => {
      const consumed = await tx.oneTimeToken.updateMany({
        where: { id: token.id, consumedAt: null, expiresAt: { gt: new Date() } },
        data: { consumedAt: new Date() },
      });
      if (consumed.count !== 1) throw new Error("Liên kết đặt lại mật khẩu đã được sử dụng");

      await tx.user.update({
        where: { id: token.userId },
        data: { passwordHash },
      });
      await tx.authIdentity.upsert({
        where: { userId_provider: { userId: token.userId, provider: AuthProvider.EMAIL } },
        update: { passwordHash, providerEmail: token.user.email },
        create: {
          userId: token.userId,
          provider: AuthProvider.EMAIL,
          providerSubject: token.user.email,
          providerEmail: token.user.email,
          passwordHash,
          verifiedAt: token.user.isVerified ? new Date() : null,
        },
      });
      await tx.userSession.updateMany({
        where: { userId: token.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.oneTimeToken.updateMany({
        where: {
          userId: token.userId,
          type: OneTimeTokenType.PASSWORD_RESET,
          consumedAt: null,
        },
        data: { consumedAt: new Date() },
      });
    });

    return { passwordReset: true, sessionsRevoked: true };
  }

  public static async refreshToken(token: string, metadata: SessionMetadata = {}) {
    try {
      const decoded = this.verifyRefreshToken(token);
      const now = new Date();
      const tokenHash = this.hashToken(token);
      const session = await prisma.userSession.findUnique({
        where: { id: decoded.sessionId },
        include: { user: true },
      });

      if (
        !session ||
        session.userId !== decoded.id ||
        session.refreshTokenHash !== tokenHash ||
        session.revokedAt ||
        session.expiresAt <= now ||
        session.user.isBanned
      ) {
        throw new Error("Refresh session không còn hiệu lực");
      }

      const replacementId = randomUUID();
      const replacementTokens = this.signTokens(session.user, replacementId);
      const replacementMetadata: SessionMetadata = {
        deviceId: metadata.deviceId || session.deviceId || undefined,
        deviceName: metadata.deviceName || session.deviceName || undefined,
        platform: metadata.platform || session.platform || undefined,
        ipAddress: metadata.ipAddress || session.ipAddress || undefined,
        userAgent: metadata.userAgent || session.userAgent || undefined,
      };

      await prisma.$transaction(async (tx) => {
        const revoked = await tx.userSession.updateMany({
          where: {
            id: session.id,
            refreshTokenHash: tokenHash,
            revokedAt: null,
            expiresAt: { gt: now },
          },
          data: {
            revokedAt: now,
            lastUsedAt: now,
            replacedBySessionId: replacementId,
          },
        });

        if (revoked.count !== 1) {
          throw new Error("Refresh token đã được sử dụng hoặc thu hồi");
        }

        await tx.userSession.create({
          data: this.sessionCreateData(
            session.userId,
            replacementId,
            replacementTokens.refreshToken,
            replacementMetadata
          ),
        });
      });

      return replacementTokens;
    } catch {
      throw new Error("Refresh token không hợp lệ hoặc đã hết hạn");
    }
  }

  public static async logout(token: string) {
    try {
      const decoded = this.verifyRefreshToken(token, true);
      await prisma.userSession.updateMany({
        where: {
          id: decoded.sessionId,
          userId: decoded.id,
          refreshTokenHash: this.hashToken(token),
          revokedAt: null,
        },
        data: { revokedAt: new Date(), lastUsedAt: new Date() },
      });
    } catch {
      // Logout is intentionally idempotent and does not reveal session state.
    }

    return { loggedOut: true };
  }

  public static async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, settings: true },
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
