import bcrypt from "bcryptjs";
import { createHash } from "crypto";
import {
  AuthProvider,
  LegalDocumentType,
  ProfileAudience,
  ProfileSection,
  Role,
  SubscriptionTier,
} from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../src/lib/prisma";
import { AuthService } from "../src/modules/auth/auth.service";

afterEach(() => {
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
    })).rejects.toThrow("Tài khoản hoặc mật khẩu không chính xác");
  });

  it("rejects a banned account even when the password is correct", async () => {
    await mockUser({ isBanned: true, banReason: "Vi phạm chính sách" });
    await expect(AuthService.login({
      email: "member@beebuddy.vn",
      password: "correct-password",
    })).rejects.toThrow(/đã bị khóa/);
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
      profile: { fullName: "New User" },
      settings: {},
    } as never);
    vi.spyOn(prisma.userSession, "create").mockResolvedValue({} as never);
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

    await AuthService.register({
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
  });

  it("rejects registration when legal consent is missing", async () => {
    await expect(AuthService.register({
      email: "new@beebuddy.vn",
      password: "password123",
      fullName: "New User",
      acceptTerms: false,
      acceptPrivacy: true,
    })).rejects.toThrow(/phải đồng ý/);
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
      /không hợp lệ hoặc đã hết hạn/
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
