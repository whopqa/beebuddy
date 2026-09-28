import { createHash, randomBytes } from "crypto";
import {
  AuditActorType,
  CommunityInviteStatus,
  CommunityJoinPolicy,
  CommunityJoinRequestStatus,
  CommunityMemberRole,
  CommunityMemberStatus,
  CommunityStatus,
  CommunityVisibility,
  NotificationType,
  MediaProcessingStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../common/errors/app-error";
import { EntitlementService } from "../../common/services/entitlement.service";
import { NotificationService } from "../../common/services/notification.service";

function slugify(value: string) {
  const base = value.normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "community";
  return `${base}-${randomBytes(3).toString("hex")}`;
}

function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function requireCommunityManager(
  tx: Prisma.TransactionClient,
  communityId: string,
  userId: string
) {
  const member = await tx.communityMember.findUnique({
    where: { communityId_userId: { communityId, userId } },
  });
  if (
    !member || member.status !== CommunityMemberStatus.ACTIVE ||
    member.role !== CommunityMemberRole.OWNER && member.role !== CommunityMemberRole.MODERATOR
  ) {
    throw new AppError("Bạn không có quyền quản lý community này", 403);
  }
  return member;
}

async function requireCommunityOwner(
  tx: Prisma.TransactionClient,
  communityId: string,
  userId: string
) {
  const community = await tx.community.findUnique({ where: { id: communityId } });
  if (!community || community.deletedAt || community.status === CommunityStatus.DELETED) {
    throw new AppError("Không tìm thấy community", 404);
  }
  if (community.ownerId !== userId) throw new AppError("Chỉ chủ cộng đồng được thực hiện thao tác này", 403);
  return community;
}

async function validateCommunityMedia(
  tx: Prisma.TransactionClient,
  ownerId: string,
  mediaIds: Array<string | null | undefined>
) {
  const ids = Array.from(new Set(mediaIds.filter((id): id is string => Boolean(id))));
  if (!ids.length) return;
  const count = await tx.mediaAsset.count({
    where: {
      id: { in: ids },
      ownerId,
      processingStatus: MediaProcessingStatus.READY,
      deletedAt: null,
      mimeType: { startsWith: "image/" },
    },
  });
  if (count !== ids.length) throw new AppError("Ảnh cộng đồng không hợp lệ hoặc không thuộc chủ cộng đồng", 409);
}

export class CommunitiesService {
  public static async list(userId?: string, cursor?: string, limit = 20) {
    const take = Math.min(Math.max(limit, 1), 50);
    const communities = await prisma.community.findMany({
      where: {
        status: CommunityStatus.ACTIVE,
        deletedAt: null,
        OR: [
          { visibility: CommunityVisibility.PUBLIC },
          ...(userId ? [{ members: { some: { userId, status: CommunityMemberStatus.ACTIVE } } }] : []),
        ],
      },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: {
        owner: { select: { id: true, profile: { select: { fullName: true, avatarUrl: true } } } },
        avatarMedia: { select: { sourceUrl: true } },
        ...(userId ? {
          members: { where: { userId }, select: { role: true, status: true } },
        } : {}),
      },
    });
    const hasMore = communities.length > take;
    const items = hasMore ? communities.slice(0, take) : communities;
    return { items, nextCursor: hasMore ? items.at(-1)?.id ?? null : null };
  }

  public static async getBySlug(slug: string, userId?: string) {
    const community = await prisma.community.findUnique({
      where: { slug },
      include: {
        owner: { select: { id: true, profile: true } },
        avatarMedia: { select: { sourceUrl: true } },
        coverMedia: { select: { sourceUrl: true } },
        members: {
          where: { status: CommunityMemberStatus.ACTIVE },
          take: 20,
          orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
          include: { user: { select: { id: true, profile: true } } },
        },
      },
    });
    if (!community || community.status === CommunityStatus.DELETED || community.deletedAt) {
      throw new AppError("Không tìm thấy community", 404);
    }
    const viewerMembership = userId
      ? await prisma.communityMember.findUnique({
          where: { communityId_userId: { communityId: community.id, userId } },
          select: { role: true, status: true },
        })
      : null;
    const isMember = viewerMembership?.status === CommunityMemberStatus.ACTIVE;
    if (community.status !== CommunityStatus.ACTIVE && !isMember) {
      throw new AppError("Community hiện không hoạt động", 404);
    }
    if (community.visibility !== CommunityVisibility.PUBLIC && !isMember) {
      throw new AppError("Community này không công khai", 403);
    }
    return { ...community, viewerMembership };
  }

  public static async create(userId: string, data: {
    name: string;
    description?: string;
    visibility?: CommunityVisibility;
    joinPolicy?: CommunityJoinPolicy;
  }) {
    return prisma.$transaction(async (tx) => {
      const createRight = await EntitlementService.require(tx, userId, "community.create");
      const quota = await EntitlementService.resolve(tx, userId, "community.max_owned");
      const limit = quota.limitValue ?? createRight.limitValue;
      if (limit !== null) {
        const owned = await tx.community.count({
          where: { ownerId: userId, status: { not: CommunityStatus.DELETED } },
        });
        if (owned >= limit) throw new AppError(`Bạn đã đạt giới hạn ${limit} community`, 403);
      }

      return tx.community.create({
        data: {
          ownerId: userId,
          name: data.name.trim(),
          slug: slugify(data.name),
          description: data.description?.trim(),
          visibility: data.visibility ?? CommunityVisibility.PUBLIC,
          joinPolicy: data.joinPolicy ?? CommunityJoinPolicy.OPEN,
          members: {
            create: { userId, role: CommunityMemberRole.OWNER, status: CommunityMemberStatus.ACTIVE },
          },
        },
        include: { members: true },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  public static async join(userId: string, communityId: string, message?: string) {
    return prisma.$transaction(async (tx) => {
      const community = await tx.community.findUnique({ where: { id: communityId } });
      if (!community || community.status !== CommunityStatus.ACTIVE) {
        throw new AppError("Community không khả dụng", 404);
      }
      const existing = await tx.communityMember.findUnique({
        where: { communityId_userId: { communityId, userId } },
      });
      if (existing?.status === CommunityMemberStatus.ACTIVE) return existing;
      if (existing?.status === CommunityMemberStatus.BANNED) {
        throw new AppError("Bạn đã bị cấm khỏi community này", 403);
      }
      if (community.joinPolicy === CommunityJoinPolicy.INVITE_ONLY) {
        throw new AppError("Community này chỉ chấp nhận thành viên được mời", 403);
      }
      if (community.joinPolicy === CommunityJoinPolicy.APPROVAL) {
        return tx.communityJoinRequest.upsert({
          where: { communityId_requesterId: { communityId, requesterId: userId } },
          update: { status: CommunityJoinRequestStatus.PENDING, message, reviewedById: null, reviewedAt: null },
          create: { communityId, requesterId: userId, message },
        });
      }
      const member = await tx.communityMember.upsert({
        where: { communityId_userId: { communityId, userId } },
        update: { status: CommunityMemberStatus.ACTIVE, role: CommunityMemberRole.MEMBER, leftAt: null },
        create: { communityId, userId, role: CommunityMemberRole.MEMBER },
      });
      await tx.community.update({ where: { id: communityId }, data: { membersCount: { increment: 1 } } });
      return member;
    });
  }

  public static async leave(userId: string, communityId: string) {
    return prisma.$transaction(async (tx) => {
      const member = await tx.communityMember.findUnique({
        where: { communityId_userId: { communityId, userId } },
      });
      if (!member || member.status !== CommunityMemberStatus.ACTIVE) {
        throw new AppError("Bạn không phải thành viên đang hoạt động", 409);
      }
      if (member.role === CommunityMemberRole.OWNER) {
        throw new AppError("Hãy chuyển quyền sở hữu trước khi rời community", 409);
      }
      const updated = await tx.communityMember.update({
        where: { id: member.id },
        data: { status: CommunityMemberStatus.LEFT, leftAt: new Date() },
      });
      await tx.community.update({ where: { id: communityId }, data: { membersCount: { decrement: 1 } } });
      return updated;
    });
  }

  public static async transferOwnership(ownerId: string, communityId: string, newOwnerId: string) {
    if (ownerId === newOwnerId) throw new AppError("Người nhận đã là owner", 409);
    return prisma.$transaction(async (tx) => {
      const community = await tx.community.findUnique({ where: { id: communityId } });
      if (!community || community.ownerId !== ownerId) throw new AppError("Chỉ owner được chuyển quyền", 403);
      const nextOwner = await tx.communityMember.findUnique({
        where: { communityId_userId: { communityId, userId: newOwnerId } },
      });
      if (!nextOwner || nextOwner.status !== CommunityMemberStatus.ACTIVE) {
        throw new AppError("Owner mới phải là thành viên đang hoạt động", 409);
      }
      await tx.communityMember.update({
        where: { communityId_userId: { communityId, userId: ownerId } },
        data: { role: CommunityMemberRole.MEMBER },
      });
      await tx.communityMember.update({ where: { id: nextOwner.id }, data: { role: CommunityMemberRole.OWNER } });
      const updated = await tx.community.update({ where: { id: communityId }, data: { ownerId: newOwnerId } });
      await tx.auditLog.create({
        data: {
          actorType: AuditActorType.USER,
          actorUserId: ownerId,
          action: "TRANSFER_COMMUNITY_OWNER",
          targetType: "COMMUNITY",
          targetId: communityId,
          beforeData: { ownerId },
          afterData: { ownerId: newOwnerId },
        },
      });
      return updated;
    });
  }

  public static async invite(actorId: string, communityId: string, inviteeId: string) {
    if (actorId === inviteeId) throw new AppError("Không thể tự mời chính mình", 400);
    return prisma.$transaction(async (tx) => {
      await requireCommunityManager(tx, communityId, actorId);
      const existingMember = await tx.communityMember.findUnique({
        where: { communityId_userId: { communityId, userId: inviteeId } },
      });
      if (existingMember?.status === CommunityMemberStatus.ACTIVE) {
        throw new AppError("Người dùng đã là thành viên community", 409);
      }
      const blocked = await tx.userBlock.findFirst({
        where: { OR: [{ blockerId: actorId, blockedId: inviteeId }, { blockerId: inviteeId, blockedId: actorId }] },
      });
      if (blocked) throw new AppError("Không thể mời người dùng do quan hệ block", 403);
      const token = randomBytes(32).toString("base64url");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const invite = await tx.communityInvite.upsert({
        where: { communityId_inviteeId: { communityId, inviteeId } },
        update: { invitedById: actorId, tokenHash: hashInviteToken(token), status: CommunityInviteStatus.PENDING, expiresAt, respondedAt: null },
        create: { communityId, invitedById: actorId, inviteeId, tokenHash: hashInviteToken(token), expiresAt },
      });
      await NotificationService.create(tx, {
        recipientId: inviteeId,
        actorId,
        type: NotificationType.COMMUNITY_INVITE,
        entityType: "CommunityInvite",
        entityId: invite.id,
        payload: { communityId, inviteId: invite.id },
        dedupeKey: `community-invite:${invite.id}:${invite.updatedAt.toISOString()}`,
      });
      return { invite, token };
    });
  }

  public static async acceptInvite(userId: string, token: string) {
    return prisma.$transaction(async (tx) => {
      const invite = await tx.communityInvite.findUnique({ where: { tokenHash: hashInviteToken(token) } });
      if (!invite || invite.inviteeId !== userId || invite.status !== CommunityInviteStatus.PENDING || invite.expiresAt <= new Date()) {
        throw new AppError("Lời mời không hợp lệ hoặc đã hết hạn", 400);
      }
      const [community, blocked] = await Promise.all([
        tx.community.findUnique({ where: { id: invite.communityId } }),
        tx.userBlock.findFirst({
          where: { OR: [{ blockerId: invite.invitedById, blockedId: userId }, { blockerId: userId, blockedId: invite.invitedById }] },
        }),
      ]);
      if (!community || community.status !== CommunityStatus.ACTIVE || blocked) {
        throw new AppError("Community hoặc lời mời không còn khả dụng", 409);
      }
      const existing = await tx.communityMember.findUnique({
        where: { communityId_userId: { communityId: invite.communityId, userId } },
      });
      await tx.communityInvite.update({ where: { id: invite.id }, data: { status: CommunityInviteStatus.ACCEPTED, respondedAt: new Date() } });
      const member = await tx.communityMember.upsert({
        where: { communityId_userId: { communityId: invite.communityId, userId } },
        update: { status: CommunityMemberStatus.ACTIVE, role: CommunityMemberRole.MEMBER, leftAt: null },
        create: { communityId: invite.communityId, userId, role: CommunityMemberRole.MEMBER },
      });
      if (existing?.status !== CommunityMemberStatus.ACTIVE) {
        await tx.community.update({ where: { id: invite.communityId }, data: { membersCount: { increment: 1 } } });
      }
      return member;
    });
  }

  public static async respondJoinRequest(actorId: string, requestId: string, accept: boolean) {
    return prisma.$transaction(async (tx) => {
      const request = await tx.communityJoinRequest.findUnique({ where: { id: requestId } });
      if (!request || request.status !== CommunityJoinRequestStatus.PENDING) {
        throw new AppError("Yêu cầu tham gia không còn hiệu lực", 409);
      }
      await requireCommunityManager(tx, request.communityId, actorId);
      const status = accept ? CommunityJoinRequestStatus.APPROVED : CommunityJoinRequestStatus.REJECTED;
      await tx.communityJoinRequest.update({
        where: { id: request.id },
        data: { status, reviewedById: actorId, reviewedAt: new Date() },
      });
      if (!accept) return { accepted: false };
      const blocked = await tx.userBlock.findFirst({
        where: { OR: [{ blockerId: actorId, blockedId: request.requesterId }, { blockerId: request.requesterId, blockedId: actorId }] },
      });
      if (blocked) throw new AppError("Không thể duyệt thành viên do quan hệ block", 403);
      const existing = await tx.communityMember.findUnique({
        where: { communityId_userId: { communityId: request.communityId, userId: request.requesterId } },
      });
      const member = await tx.communityMember.upsert({
        where: { communityId_userId: { communityId: request.communityId, userId: request.requesterId } },
        update: { status: CommunityMemberStatus.ACTIVE, role: CommunityMemberRole.MEMBER, leftAt: null },
        create: { communityId: request.communityId, userId: request.requesterId },
      });
      if (existing?.status !== CommunityMemberStatus.ACTIVE) {
        await tx.community.update({ where: { id: request.communityId }, data: { membersCount: { increment: 1 } } });
      }
      await NotificationService.create(tx, {
        recipientId: request.requesterId,
        actorId,
        type: NotificationType.COMMUNITY_JOIN_APPROVED,
        entityType: "Community",
        entityId: request.communityId,
        payload: { communityId: request.communityId, requestId: request.id },
        dedupeKey: `community-join-approved:${request.id}`,
      });
      return { accepted: true, member };
    });
  }

  public static async getManagement(actorId: string, communityId: string) {
    return prisma.$transaction(async (tx) => {
      const manager = await requireCommunityManager(tx, communityId, actorId);
      const community = await tx.community.findUniqueOrThrow({
        where: { id: communityId },
        include: {
          avatarMedia: { select: { id: true, sourceUrl: true } },
          coverMedia: { select: { id: true, sourceUrl: true } },
          members: {
            orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
            include: { user: { select: { id: true, email: true, profile: true } } },
          },
          joinRequests: {
            where: { status: CommunityJoinRequestStatus.PENDING },
            orderBy: { createdAt: "asc" },
            include: { requester: { select: { id: true, email: true, profile: true } } },
          },
          invites: {
            where: { status: CommunityInviteStatus.PENDING, expiresAt: { gt: new Date() } },
            orderBy: { createdAt: "desc" },
            include: { invitee: { select: { id: true, email: true, profile: true } } },
          },
        },
      });
      return { ...community, managerRole: manager.role };
    });
  }

  public static async updateCommunity(actorId: string, communityId: string, data: {
    name?: string;
    description?: string | null;
    visibility?: CommunityVisibility;
    joinPolicy?: CommunityJoinPolicy;
    status?: "ACTIVE" | "ARCHIVED";
    avatarMediaId?: string | null;
    coverMediaId?: string | null;
  }) {
    return prisma.$transaction(async (tx) => {
      const before = await requireCommunityOwner(tx, communityId, actorId);
      await validateCommunityMedia(tx, actorId, [data.avatarMediaId, data.coverMediaId]);
      const updated = await tx.community.update({
        where: { id: communityId },
        data: {
          ...(data.name !== undefined ? { name: data.name.trim() } : {}),
          ...(data.description !== undefined ? { description: data.description?.trim() || null } : {}),
          ...(data.visibility !== undefined ? { visibility: data.visibility } : {}),
          ...(data.joinPolicy !== undefined ? { joinPolicy: data.joinPolicy } : {}),
          ...(data.status !== undefined ? { status: data.status as CommunityStatus } : {}),
          ...(data.avatarMediaId !== undefined ? { avatarMediaId: data.avatarMediaId } : {}),
          ...(data.coverMediaId !== undefined ? { coverMediaId: data.coverMediaId } : {}),
        },
        include: { avatarMedia: { select: { id: true, sourceUrl: true } }, coverMedia: { select: { id: true, sourceUrl: true } } },
      });
      await tx.auditLog.create({
        data: {
          actorType: AuditActorType.USER,
          actorUserId: actorId,
          action: "UPDATE_COMMUNITY",
          targetType: "COMMUNITY",
          targetId: communityId,
          beforeData: { name: before.name, visibility: before.visibility, joinPolicy: before.joinPolicy, status: before.status },
          afterData: { name: updated.name, visibility: updated.visibility, joinPolicy: updated.joinPolicy, status: updated.status },
        },
      });
      return updated;
    });
  }

  public static async manageMember(
    actorId: string,
    communityId: string,
    targetUserId: string,
    action: "PROMOTE" | "DEMOTE" | "REMOVE" | "BAN" | "RESTORE"
  ) {
    if (actorId === targetUserId) throw new AppError("Không thể áp dụng thao tác này cho chính bạn", 400);
    return prisma.$transaction(async (tx) => {
      const manager = await requireCommunityManager(tx, communityId, actorId);
      const target = await tx.communityMember.findUnique({
        where: { communityId_userId: { communityId, userId: targetUserId } },
      });
      if (!target) throw new AppError("Không tìm thấy thành viên", 404);
      if (target.role === CommunityMemberRole.OWNER) throw new AppError("Không thể thay đổi chủ cộng đồng", 409);
      if ((action === "PROMOTE" || action === "DEMOTE") && manager.role !== CommunityMemberRole.OWNER) {
        throw new AppError("Chỉ chủ cộng đồng được thay đổi vai trò", 403);
      }
      if (manager.role === CommunityMemberRole.MODERATOR && target.role !== CommunityMemberRole.MEMBER) {
        throw new AppError("Điều hành viên chỉ có thể quản lý thành viên thường", 403);
      }

      const wasActive = target.status === CommunityMemberStatus.ACTIVE;
      const data = action === "PROMOTE"
        ? { role: CommunityMemberRole.MODERATOR }
        : action === "DEMOTE"
          ? { role: CommunityMemberRole.MEMBER }
          : action === "BAN"
            ? { status: CommunityMemberStatus.BANNED, leftAt: new Date() }
            : action === "REMOVE"
              ? { status: CommunityMemberStatus.REMOVED, leftAt: new Date() }
              : { status: CommunityMemberStatus.ACTIVE, role: CommunityMemberRole.MEMBER, leftAt: null };
      const updated = await tx.communityMember.update({ where: { id: target.id }, data });
      const isActive = updated.status === CommunityMemberStatus.ACTIVE;
      if (wasActive !== isActive) {
        await tx.community.update({
          where: { id: communityId },
          data: { membersCount: wasActive ? { decrement: 1 } : { increment: 1 } },
        });
      }
      await tx.auditLog.create({
        data: {
          actorType: AuditActorType.USER,
          actorUserId: actorId,
          action: `${action}_COMMUNITY_MEMBER`,
          targetType: "COMMUNITY_MEMBER",
          targetId: target.id,
          beforeData: { role: target.role, status: target.status },
          afterData: { role: updated.role, status: updated.status },
          metadata: { communityId, targetUserId },
        },
      });
      return updated;
    });
  }

  public static async deleteCommunity(actorId: string, communityId: string) {
    return prisma.$transaction(async (tx) => {
      const before = await requireCommunityOwner(tx, communityId, actorId);
      const deletedAt = new Date();
      const updated = await tx.community.update({
        where: { id: communityId },
        data: { status: CommunityStatus.DELETED, deletedAt },
      });
      await tx.auditLog.create({
        data: {
          actorType: AuditActorType.USER,
          actorUserId: actorId,
          action: "DELETE_COMMUNITY",
          targetType: "COMMUNITY",
          targetId: communityId,
          beforeData: { status: before.status },
          afterData: { status: updated.status, deletedAt: deletedAt.toISOString() },
        },
      });
      return { id: communityId, deletedAt };
    });
  }

  public static async listInvitations(userId: string) {
    return prisma.communityInvite.findMany({
      where: { inviteeId: userId, status: CommunityInviteStatus.PENDING, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      include: {
        community: { include: { avatarMedia: { select: { sourceUrl: true } } } },
        invitedBy: { select: { id: true, profile: true } },
      },
    });
  }

  public static async respondInvite(userId: string, inviteId: string, accept: boolean) {
    return prisma.$transaction(async (tx) => {
      const invite = await tx.communityInvite.findUnique({ where: { id: inviteId } });
      if (!invite || invite.inviteeId !== userId || invite.status !== CommunityInviteStatus.PENDING || invite.expiresAt <= new Date()) {
        throw new AppError("Lời mời không còn hiệu lực", 409);
      }
      if (!accept) {
        await tx.communityInvite.update({ where: { id: inviteId }, data: { status: CommunityInviteStatus.DECLINED, respondedAt: new Date() } });
        return { accepted: false };
      }
      const community = await tx.community.findUnique({ where: { id: invite.communityId } });
      if (!community || community.status !== CommunityStatus.ACTIVE || community.deletedAt) throw new AppError("Community không còn khả dụng", 409);
      const existing = await tx.communityMember.findUnique({ where: { communityId_userId: { communityId: invite.communityId, userId } } });
      await tx.communityInvite.update({ where: { id: inviteId }, data: { status: CommunityInviteStatus.ACCEPTED, respondedAt: new Date() } });
      const member = await tx.communityMember.upsert({
        where: { communityId_userId: { communityId: invite.communityId, userId } },
        update: { status: CommunityMemberStatus.ACTIVE, role: CommunityMemberRole.MEMBER, leftAt: null },
        create: { communityId: invite.communityId, userId },
      });
      if (existing?.status !== CommunityMemberStatus.ACTIVE) {
        await tx.community.update({ where: { id: invite.communityId }, data: { membersCount: { increment: 1 } } });
      }
      return { accepted: true, member };
    });
  }
}
