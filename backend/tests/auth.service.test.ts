import bcrypt from "bcryptjs";
import { Role, SubscriptionTier } from "@prisma/client";
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
        consents: {
          create: expect.arrayContaining([
            expect.objectContaining({ consentType: "TERMS", isAccepted: true }),
            expect.objectContaining({ consentType: "PRIVACY", isAccepted: true }),
          ]),
        },
      }),
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
