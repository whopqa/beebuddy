import bcrypt from "bcryptjs";
import { AuthProvider, ProfileAudience, ProfileSection } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../src/lib/prisma";
import { AccountService } from "../src/modules/account/account.service";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AccountService.changePassword", () => {
  it("updates the email identity and revokes active sessions", async () => {
    const currentHash = await bcrypt.hash("current-password", 4);
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
      id: "user-1",
      email: "member@beebuddy.vn",
      passwordHash: currentHash,
      isVerified: true,
    } as never);
    vi.spyOn(prisma.user, "update").mockReturnValue({ operation: "user" } as never);
    const identityUpsert = vi.spyOn(prisma.authIdentity, "upsert")
      .mockReturnValue({ operation: "identity" } as never);
    const revokeSessions = vi.spyOn(prisma.userSession, "updateMany")
      .mockReturnValue({ operation: "sessions" } as never);
    vi.spyOn(prisma, "$transaction").mockResolvedValue([] as never);

    await expect(AccountService.changePassword(
      "user-1",
      "current-password",
      "new-password"
    )).resolves.toEqual({ success: true, sessionsRevoked: true });

    expect(identityUpsert).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        provider_providerSubject: {
          provider: AuthProvider.EMAIL,
          providerSubject: "member@beebuddy.vn",
        },
      },
      update: expect.objectContaining({ passwordHash: expect.any(String) }),
    }));
    expect(revokeSessions).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: "user-1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    }));
  });
});

describe("AccountService.updateProfile", () => {
  it("keeps legacy profile fields and normalized taxonomy in one transaction", async () => {
    const tx = {
      profile: {
        update: vi.fn().mockResolvedValue({ userId: "user-1" }),
      },
      interest: {
        upsert: vi.fn()
          .mockResolvedValueOnce({ id: "interest-1" })
          .mockResolvedValueOnce({ id: "interest-2" }),
      },
      userInterest: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        upsert: vi.fn().mockResolvedValue({}),
      },
      habit: {
        upsert: vi.fn().mockResolvedValue({ id: "habit-1" }),
      },
      userHabit: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        upsert: vi.fn().mockResolvedValue({}),
      },
      place: {
        upsert: vi.fn().mockResolvedValue({ id: "place-1" }),
      },
      userPlace: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        create: vi.fn().mockResolvedValue({}),
      },
      connectionGoal: {
        upsert: vi.fn().mockResolvedValue({ id: "goal-1" }),
      },
      userConnectionGoal: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        create: vi.fn().mockResolvedValue({}),
      },
    };
    vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) => callback(tx));

    await AccountService.updateProfile("user-1", {
      interests: [" Coding ", "coding", "Board games"],
      habits: ["Dậy sớm"],
      location: "Hà Nội",
      connectionGoal: "Tìm bạn chạy bộ",
    });

    expect(tx.profile.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        interests: [" Coding ", "coding", "Board games"],
        habits: ["Dậy sớm"],
        location: "Hà Nội",
        connectionGoal: "Tìm bạn chạy bộ",
      }),
    }));
    expect(tx.interest.upsert).toHaveBeenCalledTimes(2);
    expect(tx.userInterest.upsert).toHaveBeenCalledTimes(2);
    expect(tx.userHabit.upsert).toHaveBeenCalledTimes(1);
    expect(tx.userPlace.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ userId: "user-1", isPrimary: true }),
    }));
    expect(tx.userConnectionGoal.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ userId: "user-1", priority: 0 }),
    }));
  });
});

describe("AccountService.updateProfilePrivacy", () => {
  it("upserts a partial set of section rules and returns the complete policy", async () => {
    const completePolicy = [
      { section: ProfileSection.BASIC, audience: ProfileAudience.CONNECTIONS },
      { section: ProfileSection.HABITS, audience: ProfileAudience.ONLY_ME },
    ];
    const tx = {
      profileVisibilityRule: {
        upsert: vi.fn().mockResolvedValue({}),
        findMany: vi.fn().mockResolvedValue(completePolicy),
      },
    };
    vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) => callback(tx));

    await expect(AccountService.updateProfilePrivacy("user-1", [completePolicy[0]]))
      .resolves.toEqual(completePolicy);
    expect(tx.profileVisibilityRule.upsert).toHaveBeenCalledWith({
      where: {
        userId_section: { userId: "user-1", section: ProfileSection.BASIC },
      },
      update: { audience: ProfileAudience.CONNECTIONS },
      create: {
        userId: "user-1",
        section: ProfileSection.BASIC,
        audience: ProfileAudience.CONNECTIONS,
      },
    });
  });
});
