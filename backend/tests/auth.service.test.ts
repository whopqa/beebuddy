import bcrypt from "bcryptjs";
import { createHash } from "crypto";
import {
  AuthProvider,
  LegalDocumentType,
  OneTimeTokenType,
  ProfileAudience,
  ProfileSection,
  Role,
  SubscriptionTier,
} from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../src/lib/prisma";
import { ENV } from "../src/config/environment";
import { AuthService } from "../src/modules/auth/auth.service";
import { AuthEmailService } from "../src/modules/auth/auth-email.service";
import { GoogleIdentityService } from "../src/modules/auth/google-identity.service";

const originalDemoUntil = ENV.DEMO_SKIP_EMAIL_VERIFICATION_UNTIL;

afterEach(() => {
  ENV.DEMO_SKIP_EMAIL_VERIFICATION_UNTIL = originalDemoUntil;
  vi.restoreAllMocks();
});

async function mockUser(overrides: Record<string, unknown> = {}) {
  const passwordHash = await bcrypt.hash("correct-password", 4);
  vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
    id: "user-1",
    email: "member@beebuddy.vn",
    passwordHash,
    role: Role.USER,
    tier: SubscriptionTier.FREE,
    isBanned: false,
    isVerified: true,
    banReason: null,
    profile: null,
    authIdentities: [{ id: "identity-1", passwordHash }],
    ...overrides,
  } as never);
}

describe("AuthService.login", () => {
  it("rejects an incorrect password", async () => {
    await mockUser();
    await expect(AuthService.login({
      email: "member@beebuddy.vn",
      password: "wrong-password",
    })).rejects.toThrow("Incorrect account or password");
  });

  it("rejects a banned account even when the password is correct", async () => {
    await mockUser({ isBanned: true, banReason: "Vi phạm chính sách" });
    await expect(AuthService.login({
      email: "member@beebuddy.vn",
      password: "correct-password",
    })).rejects.toThrow(/has been banned/);
  });

  it("allows an unverified account only during the temporary demo window", async () => {
    await mockUser({ isVerified: false });
    await expect(AuthService.login({
      email: "member@beebuddy.vn",
      password: "correct-password",
    })).rejects.toThrow(/has not been verified/);

    ENV.DEMO_SKIP_EMAIL_VERIFICATION_UNTIL = new Date(Date.now() + 60_000);
    vi.spyOn(prisma.authIdentity, "update").mockResolvedValue({} as never);
    vi.spyOn(prisma.userSession, "create").mockResolvedValue({} as never);
    await expect(AuthService.login({
      email: "member@beebuddy.vn",
      password: "correct-password",
    })).resolves.toHaveProperty("accessToken");
    await expect(AuthService.login({
      email: "member@beebuddy.vn",
      password: "wrong-password",
    })).rejects.toThrow(/Incorrect account or password/);

    ENV.DEMO_SKIP_EMAIL_VERIFICATION_UNTIL = new Date(Date.now() - 60_000);
    await expect(AuthService.login({
      email: "member@beebuddy.vn",
      password: "correct-password",
    })).rejects.toThrow(/has not been verified/);
  });

  it("creates a revocable session and stores only the refresh token hash", async () => {
    await mockUser();
    vi.spyOn(prisma.authIdentity, "update").mockResolvedValue({} as never);
    const createSession = vi.spyOn(prisma.userSession, "create").mockResolvedValue({} as never);

    const result = await AuthService.login({
      email: "member@beebuddy.vn",
      password: "correct-password",
    }, { platform: "test" });

    const sessionData = createSession.mock.calls[0][0].data;
    expect(sessionData.refreshTokenHash).not.toBe(result.refreshToken);
    expect(sessionData.refreshTokenHash).toHaveLength(64);
    expect(sessionData.platform).toBe("test");
  });
});

describe("AuthService.register", () => {
  it("creates TERMS and PRIVACY consent records with the new account", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(null);
    const create = vi.spyOn(prisma.user, "create").mockResolvedValue({
      id: "new-user",
      email: "new@beebuddy.vn",
      role: Role.USER,
      tier: SubscriptionTier.FREE,
      isVerified: false,
      profile: { fullName: "New User" },
      settings: {},
    } as never);
    const createSession = vi.spyOn(prisma.userSession, "create").mockResolvedValue({} as never);
    vi.spyOn(prisma.plan, "findFirst").mockResolvedValue({ id: "free-plan" } as never);
    vi.spyOn(prisma.legalDocument, "findMany").mockResolvedValue([
      { id: "terms-v1", type: LegalDocumentType.TERMS },
      { id: "privacy-v1", type: LegalDocumentType.PRIVACY },
    ] as never);
    const createSubscription = vi.spyOn(prisma.subscription, "create")
      .mockResolvedValue({} as never);
    vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) =>
      callback(prisma)
    );
    vi.spyOn(prisma.oneTimeToken, "findFirst").mockResolvedValue(null);
    vi.spyOn(prisma.oneTimeToken, "updateMany").mockResolvedValue({ count: 0 });
    vi.spyOn(prisma.oneTimeToken, "create").mockResolvedValue({ id: "verification-token" } as never);
    vi.spyOn(AuthEmailService, "sendVerificationCode").mockResolvedValue();

    const result = await AuthService.register({
      email: "new@beebuddy.vn",
      password: "password123",
      fullName: "New User",
      acceptTerms: true,
      acceptPrivacy: true,
      consentSessionId: "session-12345678",
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
    });

    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        authIdentities: {
          create: expect.objectContaining({
            provider: AuthProvider.EMAIL,
            providerSubject: "new@beebuddy.vn",
          }),
        },
        consents: {
          create: expect.arrayContaining([
            expect.objectContaining({
              consentType: "TERMS",
              isAccepted: true,
              legalDocumentId: "terms-v1",
            }),
            expect.objectContaining({
              consentType: "PRIVACY",
              isAccepted: true,
              legalDocumentId: "privacy-v1",
            }),
          ]),
        },
        visibilityRules: {
          create: expect.arrayContaining([
            { section: ProfileSection.BASIC, audience: ProfileAudience.PUBLIC },
            { section: ProfileSection.HABITS, audience: ProfileAudience.ONLY_ME },
            { section: ProfileSection.PLACES, audience: ProfileAudience.CONNECTIONS },
          ]),
        },
      }),
    }));
    expect(createSubscription).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ userId: "new-user", planId: "free-plan" }),
    }));
    expect(result.verificationRequired).toBe(true);
    expect(result.verificationSent).toBe(true);
    expect(createSession).not.toHaveBeenCalled();

    ENV.DEMO_SKIP_EMAIL_VERIFICATION_UNTIL = new Date(Date.now() + 60_000);
    vi.mocked(AuthEmailService.sendVerificationCode).mockClear();
    const demoResult = await AuthService.register({
      email: "demo@beebuddy.vn",
      password: "password123",
      fullName: "Demo User",
      acceptTerms: true,
      acceptPrivacy: true,
    });
    expect(demoResult.verificationRequired).toBe(false);
    expect(demoResult.verificationSent).toBe(false);
    expect(AuthEmailService.sendVerificationCode).not.toHaveBeenCalled();
  });

  it("rejects registration when legal consent is missing", async () => {
    await expect(AuthService.register({
      email: "new@beebuddy.vn",
      password: "password123",
      fullName: "New User",
      acceptTerms: false,
      acceptPrivacy: true,
    })).rejects.toThrow(/must agree/);
  });
});

describe("AuthService.loginWithGoogle", () => {
  const googleIdentity = {
    subject: "google-subject-1",
    email: "member@gmail.com",
    emailVerified: true,
    fullName: "Google Member",
    avatarUrl: "https://example.com/avatar.jpg",
    googleIsAuthoritativeForEmail: true,
  };

  it("logs in an existing linked Google identity and creates a revocable session", async () => {
    vi.spyOn(GoogleIdentityService, "verifyCredential").mockResolvedValue(googleIdentity);
    vi.spyOn(prisma.authIdentity, "findUnique").mockResolvedValue({
      id: "google-identity-1",
      userId: "user-google",
      user: {
        id: "user-google",
        email: googleIdentity.email,
        role: Role.USER,
        tier: SubscriptionTier.FREE,
        isVerified: true,
        isBanned: false,
        banReason: null,
        profile: { fullName: googleIdentity.fullName },
      },
    } as never);
    const tx = {
      authIdentity: { update: vi.fn().mockResolvedValue({}) },
      user: { update: vi.fn().mockResolvedValue({}) },
      userSession: { create: vi.fn().mockResolvedValue({}) },
    };
    vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) => callback(tx));

    const result = await AuthService.loginWithGoogle({
      credential: "signed-google-id-token",
      acceptTerms: false,
      acceptPrivacy: false,
    });

    expect(result.user.email).toBe(googleIdentity.email);
    expect(result.accessToken).toBeTruthy();
    expect(tx.authIdentity.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "google-identity-1" },
      data: expect.objectContaining({ lastUsedAt: expect.any(Date) }),
    }));
    expect(tx.userSession.create).toHaveBeenCalledOnce();
  });

  it("creates a verified user, legal consents, FREE subscription and session on first Google sign-in", async () => {
    vi.spyOn(GoogleIdentityService, "verifyCredential").mockResolvedValue(googleIdentity);
    vi.spyOn(prisma.authIdentity, "findUnique").mockResolvedValue(null);
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(null);
    const tx = {
      legalDocument: { findMany: vi.fn().mockResolvedValue([
        { id: "terms-v1", type: LegalDocumentType.TERMS },
        { id: "privacy-v1", type: LegalDocumentType.PRIVACY },
      ]) },
      user: { create: vi.fn().mockResolvedValue({
        id: "new-google-user",
        email: googleIdentity.email,
        role: Role.USER,
        tier: SubscriptionTier.FREE,
        isVerified: true,
        profile: { fullName: googleIdentity.fullName },
      }) },
      plan: { findFirst: vi.fn().mockResolvedValue({ id: "free-plan" }) },
      subscription: { create: vi.fn().mockResolvedValue({}) },
      userSession: { create: vi.fn().mockResolvedValue({}) },
    };
    vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) => callback(tx));

    const result = await AuthService.loginWithGoogle({
      credential: "signed-google-id-token",
      acceptTerms: true,
      acceptPrivacy: true,
      consentSessionId: "consent-session-123",
    });

    expect(result.user.isVerified).toBe(true);
    expect(tx.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        email: googleIdentity.email,
        isVerified: true,
        authIdentities: { create: expect.objectContaining({ provider: AuthProvider.GOOGLE }) },
        consents: { create: expect.arrayContaining([
          expect.objectContaining({ consentType: "TERMS", legalDocumentId: "terms-v1" }),
          expect.objectContaining({ consentType: "PRIVACY", legalDocumentId: "privacy-v1" }),
        ]) },
      }),
    }));
    expect(tx.subscription.create).toHaveBeenCalledOnce();
    expect(tx.userSession.create).toHaveBeenCalledOnce();
  });
});

describe("AuthService refresh sessions", () => {
  it("rotates a refresh token and rejects reuse of the old session", async () => {
    await mockUser();
    vi.spyOn(prisma.authIdentity, "update").mockResolvedValue({} as never);
    const createSession = vi.spyOn(prisma.userSession, "create").mockResolvedValue({} as never);
    const login = await AuthService.login({
      email: "member@beebuddy.vn",
      password: "correct-password",
    });
    const originalSession = createSession.mock.calls[0][0].data;

    vi.spyOn(prisma.userSession, "findUnique").mockResolvedValue({
      ...originalSession,
      revokedAt: null,
      deviceId: null,
      deviceName: null,
      platform: null,
      ipAddress: null,
      userAgent: null,
      user: {
        id: "user-1",
        email: "member@beebuddy.vn",
        role: Role.USER,
        tier: SubscriptionTier.FREE,
        isBanned: false,
        isVerified: true,
      },
    } as never);

    const updateMany = vi.fn()
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    const rotatedCreate = vi.fn().mockResolvedValue({});
    vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) =>
      callback({ userSession: { updateMany, create: rotatedCreate } })
    );

    const rotated = await AuthService.refreshToken(login.refreshToken);
    expect(rotated.refreshToken).not.toBe(login.refreshToken);
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        refreshTokenHash: createHash("sha256").update(login.refreshToken).digest("hex"),
      }),
    }));

    await expect(AuthService.refreshToken(login.refreshToken)).rejects.toThrow(
      /invalid or expired/
    );
  });

  it("revokes the matching session on logout without exposing session state", async () => {
    await mockUser();
    vi.spyOn(prisma.authIdentity, "update").mockResolvedValue({} as never);
    vi.spyOn(prisma.userSession, "create").mockResolvedValue({} as never);
    const login = await AuthService.login({
      email: "member@beebuddy.vn",
      password: "correct-password",
    });
    const revoke = vi.spyOn(prisma.userSession, "updateMany").mockResolvedValue({ count: 1 });

    await expect(AuthService.logout(login.refreshToken)).resolves.toEqual({ loggedOut: true });
    expect(revoke).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ revokedAt: expect.any(Date) }),
    }));
  });
});

describe("AuthService email verification", () => {
  it("issues a hashed one-time code and never stores the plain code", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
      id: "user-verify",
      email: "verify@beebuddy.vn",
      isVerified: false,
      profile: { fullName: "Verify User" },
    } as never);
    vi.spyOn(prisma.oneTimeToken, "findFirst").mockResolvedValue(null);
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const create = vi.fn().mockImplementation(async ({ data }) => ({ id: "verify-token", ...data }));
    vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) =>
      callback({ oneTimeToken: { updateMany, create } })
    );
    vi.spyOn(AuthEmailService, "sendVerificationCode").mockResolvedValue();

    const result = await AuthService.requestEmailVerification("verify@beebuddy.vn");
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId: "user-verify",
        type: OneTimeTokenType.EMAIL_VERIFICATION,
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    }));
    expect(create.mock.calls[0][0].data.tokenHash).not.toBe(result.developmentCode);
    expect(AuthEmailService.sendVerificationCode).toHaveBeenCalledOnce();
  });

  it("marks the account verified, consumes the code and creates the first session", async () => {
    const user = {
      id: "user-verify",
      email: "verify@beebuddy.vn",
      role: Role.USER,
      tier: SubscriptionTier.FREE,
      isVerified: false,
    };
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(user as never);
    vi.spyOn(prisma.oneTimeToken, "findFirst").mockResolvedValue({
      id: "verify-token",
      userId: user.id,
      type: OneTimeTokenType.EMAIL_VERIFICATION,
      tokenHash: createHash("sha256").update(`${user.id}:123456`).digest("hex"),
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null,
      attemptCount: 0,
    } as never);
    const tx = {
      oneTimeToken: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      user: { update: vi.fn().mockResolvedValue({}) },
      authIdentity: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      userSession: { create: vi.fn().mockResolvedValue({}) },
    };
    vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) => callback(tx));

    const result = await AuthService.confirmEmailVerification({
      email: user.email,
      code: "123456",
    });
    expect(result.user.isVerified).toBe(true);
    expect(tx.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: user.id },
      data: { isVerified: true },
    }));
    expect(tx.userSession.create).toHaveBeenCalledOnce();
  });
});

describe("AuthService password reset", () => {
  it("changes both password hashes, consumes the token and revokes every session", async () => {
    const rawToken = "a".repeat(43);
    vi.spyOn(prisma.oneTimeToken, "findUnique").mockResolvedValue({
      id: "reset-token",
      userId: "user-reset",
      type: OneTimeTokenType.PASSWORD_RESET,
      tokenHash: createHash("sha256").update(rawToken).digest("hex"),
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null,
      user: {
        id: "user-reset",
        email: "reset@beebuddy.vn",
        isVerified: true,
        isBanned: false,
      },
    } as never);
    const tx = {
      oneTimeToken: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      user: { update: vi.fn().mockResolvedValue({}) },
      authIdentity: { upsert: vi.fn().mockResolvedValue({}) },
      userSession: { updateMany: vi.fn().mockResolvedValue({ count: 2 }) },
    };
    vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) => callback(tx));

    await expect(AuthService.confirmPasswordReset({
      token: rawToken,
      newPassword: "NewPassword123",
    })).resolves.toEqual({ passwordReset: true, sessionsRevoked: true });

    expect(tx.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "user-reset" },
      data: { passwordHash: expect.any(String) },
    }));
    expect(tx.authIdentity.upsert).toHaveBeenCalledOnce();
    expect(tx.userSession.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: "user-reset", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    }));
  });

  it("rejects a reset token that lost the atomic one-time-use race", async () => {
    const rawToken = "b".repeat(43);
    vi.spyOn(prisma.oneTimeToken, "findUnique").mockResolvedValue({
      id: "reset-token",
      userId: "user-reset",
      type: OneTimeTokenType.PASSWORD_RESET,
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null,
      user: {
        id: "user-reset",
        email: "reset@beebuddy.vn",
        passwordHash: null,
        authIdentities: [],
        isVerified: true,
        isBanned: false,
      },
    } as never);
    const updateUser = vi.fn();
    vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) => callback({
      oneTimeToken: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
      user: { update: updateUser },
    }));

    await expect(AuthService.confirmPasswordReset({
      token: rawToken,
      newPassword: "AnotherPassword123",
    })).rejects.toThrow(/already been used/);
    expect(updateUser).not.toHaveBeenCalled();
  });
});
