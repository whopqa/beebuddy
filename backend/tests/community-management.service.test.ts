import { CommunityMemberRole, CommunityMemberStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  communityMember: { findUnique: vi.fn(), update: vi.fn() },
  community: { update: vi.fn() },
  auditLog: { create: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("../src/lib/prisma", () => ({ prisma: prismaMock }));

import { CommunitiesService } from "../src/modules/communities/communities.service";

describe("community management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof prismaMock) => unknown) => callback(prismaMock));
    prismaMock.auditLog.create.mockResolvedValue({ id: "audit-1" });
  });

  it("allows an owner to promote an active member and writes an audit log", async () => {
    prismaMock.communityMember.findUnique
      .mockResolvedValueOnce({ id: "owner-membership", role: CommunityMemberRole.OWNER, status: CommunityMemberStatus.ACTIVE })
      .mockResolvedValueOnce({ id: "member-1", userId: "user-2", role: CommunityMemberRole.MEMBER, status: CommunityMemberStatus.ACTIVE });
    prismaMock.communityMember.update.mockResolvedValue({ id: "member-1", userId: "user-2", role: CommunityMemberRole.MODERATOR, status: CommunityMemberStatus.ACTIVE });

    const result = await CommunitiesService.manageMember("owner-1", "community-1", "user-2", "PROMOTE");

    expect(result.role).toBe(CommunityMemberRole.MODERATOR);
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "PROMOTE_COMMUNITY_MEMBER", targetId: "member-1" }),
    }));
  });

  it("does not allow a moderator to promote members", async () => {
    prismaMock.communityMember.findUnique
      .mockResolvedValueOnce({ id: "moderator-membership", role: CommunityMemberRole.MODERATOR, status: CommunityMemberStatus.ACTIVE })
      .mockResolvedValueOnce({ id: "member-1", userId: "user-2", role: CommunityMemberRole.MEMBER, status: CommunityMemberStatus.ACTIVE });

    await expect(CommunitiesService.manageMember("moderator-1", "community-1", "user-2", "PROMOTE")).rejects.toMatchObject({ statusCode: 403 });
    expect(prismaMock.communityMember.update).not.toHaveBeenCalled();
  });

  it("decrements membersCount when an active member is removed", async () => {
    prismaMock.communityMember.findUnique
      .mockResolvedValueOnce({ id: "owner-membership", role: CommunityMemberRole.OWNER, status: CommunityMemberStatus.ACTIVE })
      .mockResolvedValueOnce({ id: "member-1", userId: "user-2", role: CommunityMemberRole.MEMBER, status: CommunityMemberStatus.ACTIVE });
    prismaMock.communityMember.update.mockResolvedValue({ id: "member-1", userId: "user-2", role: CommunityMemberRole.MEMBER, status: CommunityMemberStatus.REMOVED });
    prismaMock.community.update.mockResolvedValue({ id: "community-1" });

    await CommunitiesService.manageMember("owner-1", "community-1", "user-2", "REMOVE");

    expect(prismaMock.community.update).toHaveBeenCalledWith({
      where: { id: "community-1" },
      data: { membersCount: { decrement: 1 } },
    });
  });
});
