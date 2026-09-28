import bcrypt from "bcryptjs";
import { createHash, randomUUID } from "crypto";
import jwt from "jsonwebtoken";
import {
  AuthProvider,
  ConsentDecision,
  LegalDocumentType,
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

      const sessionId = randomUUID();
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

      const createdTokens = this.signTokens(createdUser, sessionId);
      await tx.userSession.create({
        data: this.sessionCreateData(
          createdUser.id,
          sessionId,
          createdTokens.refreshToken,
          data
        ),
      });

      return { user: createdUser, tokens: createdTokens };
    });

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
