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
        update: vi.fn().mockResolvedValue({ userId: "user-1", galleryMediaIds: [] }),
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
      occupation: "Student",
      connectionGoal: "Tìm bạn chạy bộ",
    });

    expect(tx.profile.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        interests: [" Coding ", "coding", "Board games"],
        habits: ["Dậy sớm"],
        location: "Hà Nội",
        occupation: "Student",
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

  it("clears the birth date and keeps avatar and gallery changes in the same transaction", async () => {
    const tx = {
      mediaAsset: { findMany: vi.fn().mockResolvedValue([
        { id: "avatar-id", sourceUrl: "/api/media/avatar-id/content" },
        { id: "gallery-id", sourceUrl: "/api/media/gallery-id/content" },
      ]) },
      profile: { update: vi.fn().mockResolvedValue({ userId: "user-1", galleryMediaIds: ["gallery-id"] }) },
    };
    vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) => callback(tx));

    const updated = await AccountService.updateProfile("user-1", {
      dateOfBirth: null,
      avatarMediaAssetId: "avatar-id",
      galleryMediaIds: ["gallery-id"],
      aboutMe: "About me",
    });

    expect(tx.profile.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        dateOfBirth: null,
        avatarUrl: "/api/media/avatar-id/content",
        galleryMediaIds: ["gallery-id"],
        aboutMe: "About me",
      }),
    }));
    expect(updated.gallery).toEqual([{ id: "gallery-id", url: "/api/media/gallery-id/content" }]);
  });

  it("rejects an unowned gallery image before updating the profile", async () => {
    const tx = {
      mediaAsset: { findMany: vi.fn().mockResolvedValue([]) },
      profile: { update: vi.fn() },
    };
    vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) => callback(tx));

    await expect(AccountService.updateProfile("user-1", { galleryMediaIds: ["other-user-image"] }))
      .rejects.toThrow("Ảnh không tồn tại");
    expect(tx.profile.update).not.toHaveBeenCalled();
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

describe("AccountService.setAvatar", () => {
  it("only links a ready image owned by the current user", async () => {
    vi.spyOn(prisma.mediaAsset, "findFirst").mockResolvedValue({
      sourceUrl: "http://localhost:3000/api/media/asset-1/content",
    } as never);
    const update = vi.spyOn(prisma.profile, "update").mockResolvedValue({
      userId: "user-1",
      avatarUrl: "http://localhost:3000/api/media/asset-1/content",
    } as never);

    await AccountService.setAvatar("user-1", "00000000-0000-4000-8000-000000000001");

    expect(prisma.mediaAsset.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ ownerId: "user-1", processingStatus: "READY" }),
    }));
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      data: { avatarUrl: "http://localhost:3000/api/media/asset-1/content" },
    }));
  });
});
