import { createHash, randomBytes } from "crypto";
import {
  CommunityInviteStatus,
  CommunityJoinPolicy,
  CommunityJoinRequestStatus,
  CommunityMemberRole,
  CommunityMemberStatus,
  CommunityStatus,
  CommunityVisibility,
  NotificationType,
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
          select: { status: true },
        })
      : null;
    const isMember = viewerMembership?.status === CommunityMemberStatus.ACTIVE;
    if (community.visibility !== CommunityVisibility.PUBLIC && !isMember) {
      throw new AppError("Community này không công khai", 403);
    }
    return community;
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
      return tx.communityMember.upsert({
        where: { communityId_userId: { communityId, userId } },
        update: { status: CommunityMemberStatus.ACTIVE, role: CommunityMemberRole.MEMBER, leftAt: null },
        create: { communityId, userId, role: CommunityMemberRole.MEMBER },
      });
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
      return tx.communityMember.update({
        where: { id: member.id },
        data: { status: CommunityMemberStatus.LEFT, leftAt: new Date() },
      });
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
      return tx.community.update({ where: { id: communityId }, data: { ownerId: newOwnerId } });
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
      await tx.communityInvite.update({ where: { id: invite.id }, data: { status: CommunityInviteStatus.ACCEPTED, respondedAt: new Date() } });
      return tx.communityMember.upsert({
        where: { communityId_userId: { communityId: invite.communityId, userId } },
        update: { status: CommunityMemberStatus.ACTIVE, role: CommunityMemberRole.MEMBER, leftAt: null },
        create: { communityId: invite.communityId, userId, role: CommunityMemberRole.MEMBER },
      });
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
      const member = await tx.communityMember.upsert({
        where: { communityId_userId: { communityId: request.communityId, userId: request.requesterId } },
        update: { status: CommunityMemberStatus.ACTIVE, role: CommunityMemberRole.MEMBER, leftAt: null },
        create: { communityId: request.communityId, userId: request.requesterId },
      });
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
}
