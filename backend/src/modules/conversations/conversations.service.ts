import {
  CallParticipantStatus,
  CallStatus,
  CallType,
  ConnectionStatus,
  ConversationMemberRole,
  ConversationMemberStatus,
  ConversationType,
  MessageSenderType,
  MessageType,
  MediaProcessingStatus,
  NotificationType,
  Prisma,
  ReactionType,
} from "@prisma/client";
import { randomUUID } from "crypto";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../common/errors/app-error";
import { EntitlementService } from "../../common/services/entitlement.service";
import { NotificationService } from "../../common/services/notification.service";
import { ModerationAdapterService } from "../../common/services/moderation-adapter.service";

function pairKey(first: string, second: string) {
  return [first, second].sort().join(":");
}

async function requireActiveMember(
  tx: Prisma.TransactionClient,
  conversationId: string,
  userId: string
) {
  const member = await tx.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
    include: { conversation: true },
  });
  if (!member || member.status !== ConversationMemberStatus.ACTIVE || member.conversation.deletedAt) {
    throw new AppError("Bạn không phải thành viên đang hoạt động của cuộc trò chuyện", 403);
  }
  return member;
}

async function assertDirectMessagingAllowed(
  tx: Prisma.TransactionClient,
  firstUserId: string,
  secondUserId: string
) {
  const canonicalPair = pairKey(firstUserId, secondUserId);
  const [connection, block] = await Promise.all([
    tx.connection.findUnique({ where: { pairKey: canonicalPair } }),
    tx.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: firstUserId, blockedId: secondUserId },
          { blockerId: secondUserId, blockedId: firstUserId },
        ],
      },
    }),
  ]);
  if (block) throw new AppError("Không thể nhắn tin do quan hệ block", 403);
  if (!connection || connection.status !== ConnectionStatus.ACCEPTED) {
    throw new AppError("Chat trực tiếp yêu cầu connection đã được chấp nhận", 403);
  }
  return canonicalPair;
}

export class ConversationsService {
  private static async requireGroupManager(
    tx: Prisma.TransactionClient,
    conversationId: string,
    userId: string
  ) {
    const member = await requireActiveMember(tx, conversationId, userId);
    if (member.conversation.type !== ConversationType.GROUP) {
      throw new AppError("Thao tác này chỉ áp dụng cho group chat", 409);
    }
    if (member.role !== ConversationMemberRole.OWNER && member.role !== ConversationMemberRole.ADMIN) {
      throw new AppError("Bạn không có quyền quản lý group chat", 403);
    }
    return member;
  }

  public static async getOrCreateDirect(userId: string, otherUserId: string) {
    if (userId === otherUserId) throw new AppError("Không thể tự tạo chat trực tiếp", 400);
    return prisma.$transaction(async (tx) => {
      const directPairKey = await assertDirectMessagingAllowed(tx, userId, otherUserId);
      const existing = await tx.conversation.findUnique({ where: { directPairKey } });
      if (existing) {
        await tx.conversation.update({ where: { id: existing.id }, data: { deletedAt: null } });
        for (const memberId of [userId, otherUserId]) {
          await tx.conversationMember.upsert({
            where: { conversationId_userId: { conversationId: existing.id, userId: memberId } },
            update: { status: ConversationMemberStatus.ACTIVE, leftAt: null },
            create: { conversationId: existing.id, userId: memberId },
          });
        }
        return tx.conversation.findUniqueOrThrow({ where: { id: existing.id }, include: { members: true } });
      }
      return tx.conversation.create({
        data: {
          type: ConversationType.DIRECT,
          directPairKey,
          createdByUserId: userId,
          members: {
            create: [
              { userId, role: ConversationMemberRole.MEMBER },
              { userId: otherUserId, role: ConversationMemberRole.MEMBER },
            ],
          },
        },
        include: { members: true },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  public static async createGroup(userId: string, data: {
    title: string;
    memberIds: string[];
    communityId?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      await EntitlementService.require(tx, userId, "group_chat.create");
      const quota = await EntitlementService.resolve(tx, userId, "group_chat.max_members");
      const memberIds = Array.from(new Set([userId, ...data.memberIds]));
      if (quota.limitValue !== null && memberIds.length > quota.limitValue) {
        throw new AppError(`Nhóm chat vượt giới hạn ${quota.limitValue} thành viên`, 403);
      }
      if (data.communityId) {
        const activeCount = await tx.communityMember.count({
          where: {
            communityId: data.communityId,
            userId: { in: memberIds },
            status: "ACTIVE",
          },
        });
        if (activeCount !== memberIds.length) {
          throw new AppError("Mọi thành viên group chat phải thuộc community", 409);
        }
      }
      return tx.conversation.create({
        data: {
          type: ConversationType.GROUP,
          title: data.title.trim(),
          communityId: data.communityId,
          createdByUserId: userId,
          members: {
            create: memberIds.map((memberId) => ({
              userId: memberId,
              role: memberId === userId ? ConversationMemberRole.OWNER : ConversationMemberRole.MEMBER,
            })),
          },
        },
        include: { members: true },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  public static async list(userId: string, cursor?: string, limit = 20) {
    const take = Math.min(Math.max(limit, 1), 50);
    const memberships = await prisma.conversationMember.findMany({
      where: { userId, status: ConversationMemberStatus.ACTIVE },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: [{ conversation: { lastMessageAt: "desc" } }, { id: "desc" }],
      include: {
        lastReadMessage: { select: { id: true, createdAt: true } },
        conversation: {
          include: {
            members: {
              where: { status: ConversationMemberStatus.ACTIVE },
              include: { user: { select: { id: true, profile: true } } },
            },
            messages: {
              where: { deletedAt: null },
              take: 1,
              orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            },
          },
        },
      },
    });
    const hasMore = memberships.length > take;
    const items = hasMore ? memberships.slice(0, take) : memberships;
    const hydrated = await Promise.all(items.map(async (membership) => ({
      ...membership,
      unreadCount: await prisma.message.count({
        where: {
          conversationId: membership.conversationId,
          deletedAt: null,
          senderUserId: { not: userId },
          ...(membership.lastReadMessage ? {
            OR: [
              { createdAt: { gt: membership.lastReadMessage.createdAt } },
              { createdAt: membership.lastReadMessage.createdAt, id: { gt: membership.lastReadMessage.id } },
            ],
          } : {}),
        },
      }),
    })));
    return { items: hydrated, nextCursor: hasMore ? items.at(-1)?.id ?? null : null };
  }

  public static async listMessages(userId: string, conversationId: string, cursor?: string, limit = 30) {
    await requireActiveMember(prisma, conversationId, userId);
    const take = Math.min(Math.max(limit, 1), 100);
    const messages = await prisma.message.findMany({
      where: { conversationId, deletedAt: null },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: {
        senderUser: { select: { id: true, profile: true } },
        replyToMessage: { select: { id: true, body: true, senderUserId: true } },
        attachments: { orderBy: { sortOrder: "asc" }, include: { mediaAsset: true } },
        reactions: true,
      },
    });
    const hasMore = messages.length > take;
    const items = hasMore ? messages.slice(0, take) : messages;
    return { items, nextCursor: hasMore ? items.at(-1)?.id ?? null : null };
  }

  public static async sendMessage(userId: string, conversationId: string, data: {
    body: string;
    clientMessageId: string;
    replyToMessageId?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const membership = await requireActiveMember(tx, conversationId, userId);
      if (membership.conversation.type === ConversationType.DIRECT) {
        const other = await tx.conversationMember.findFirst({
          where: { conversationId, userId: { not: userId }, status: ConversationMemberStatus.ACTIVE },
        });
        if (!other) throw new AppError("Chat trực tiếp không còn người nhận", 409);
        await assertDirectMessagingAllowed(tx, userId, other.userId);
      }
      const existing = await tx.message.findUnique({
        where: {
          conversationId_senderUserId_clientMessageId: {
            conversationId,
            senderUserId: userId,
            clientMessageId: data.clientMessageId,
          },
        },
      });
      if (existing) return existing;
      if (data.replyToMessageId) {
        const reply = await tx.message.findUnique({ where: { id: data.replyToMessageId } });
        if (!reply || reply.conversationId !== conversationId) {
          throw new AppError("Tin nhắn được trả lời không thuộc cuộc trò chuyện", 409);
        }
      }
      const message = await tx.message.create({
        data: {
          conversationId,
          senderType: MessageSenderType.USER,
          senderUserId: userId,
          type: MessageType.TEXT,
          body: data.body.trim(),
          clientMessageId: data.clientMessageId,
          replyToMessageId: data.replyToMessageId,
        },
      });
      await ModerationAdapterService.enqueue(tx, "MESSAGE", message.id, message.body ?? "");
      await tx.conversationMember.update({
        where: { conversationId_userId: { conversationId, userId } },
        data: { lastReadMessageId: message.id, lastReadAt: message.createdAt },
      });
      await tx.messageReadReceipt.upsert({
        where: { messageId_userId: { messageId: message.id, userId } },
        update: { readAt: message.createdAt },
        create: { messageId: message.id, userId, readAt: message.createdAt },
      });
      const recipients = await tx.conversationMember.findMany({
        where: { conversationId, status: ConversationMemberStatus.ACTIVE, userId: { not: userId } },
        select: { userId: true, mutedUntil: true },
      });
      for (const recipient of recipients) {
        await NotificationService.create(tx, {
          recipientId: recipient.userId,
          actorId: userId,
          type: NotificationType.MESSAGE,
          entityType: "Conversation",
          entityId: conversationId,
          payload: { conversationId, messageId: message.id, muted: Boolean(recipient.mutedUntil && recipient.mutedUntil > new Date()) },
          dedupeKey: `message:${message.id}:${recipient.userId}`,
        });
      }
      return message;
    });
  }

  public static async markRead(userId: string, conversationId: string, messageId: string) {
    return prisma.$transaction(async (tx) => {
      await requireActiveMember(tx, conversationId, userId);
      const message = await tx.message.findUnique({ where: { id: messageId } });
      if (!message || message.conversationId !== conversationId) {
        throw new AppError("Tin nhắn không thuộc cuộc trò chuyện", 409);
      }
      const membership = await tx.conversationMember.findUniqueOrThrow({
        where: { conversationId_userId: { conversationId, userId } },
      });
      const advances = !membership.lastReadAt || message.createdAt > membership.lastReadAt ||
        (message.createdAt.getTime() === membership.lastReadAt.getTime() && message.id > (membership.lastReadMessageId ?? ""));
      if (advances) {
        await tx.conversationMember.update({
          where: { conversationId_userId: { conversationId, userId } },
          data: { lastReadMessageId: messageId, lastReadAt: message.createdAt },
        });
      }
      return tx.messageReadReceipt.upsert({
        where: { messageId_userId: { messageId, userId } },
        update: { readAt: new Date() },
        create: { messageId, userId },
      });
    });
  }

  public static async react(userId: string, messageId: string, type: ReactionType) {
    return prisma.$transaction(async (tx) => {
      const message = await tx.message.findUnique({ where: { id: messageId } });
      if (!message) throw new AppError("Không tìm thấy tin nhắn", 404);
      await requireActiveMember(tx, message.conversationId, userId);
      return tx.messageReaction.upsert({
        where: { messageId_userId: { messageId, userId } },
        update: { type },
        create: { messageId, userId, type },
      });
    });
  }

  public static async addMembers(userId: string, conversationId: string, memberIds: string[]) {
    return prisma.$transaction(async (tx) => {
      const manager = await this.requireGroupManager(tx, conversationId, userId);
      const uniqueIds = Array.from(new Set(memberIds)).filter((id) => id !== userId);
      const existingActive = await tx.conversationMember.findMany({
        where: { conversationId, userId: { in: uniqueIds }, status: ConversationMemberStatus.ACTIVE },
        select: { userId: true },
      });
      const existingSet = new Set(existingActive.map((member) => member.userId));
      const newIds = uniqueIds.filter((id) => !existingSet.has(id));
      const currentCount = await tx.conversationMember.count({
        where: { conversationId, status: ConversationMemberStatus.ACTIVE },
      });
      const quota = await EntitlementService.resolve(tx, manager.conversation.createdByUserId ?? userId, "group_chat.max_members");
      if (quota.limitValue !== null && currentCount + newIds.length > quota.limitValue) {
        throw new AppError(`Nhóm chat vượt giới hạn ${quota.limitValue} thành viên`, 403);
      }
      if (manager.conversation.communityId) {
        const validCount = await tx.communityMember.count({
          where: {
            communityId: manager.conversation.communityId,
            userId: { in: newIds },
            status: "ACTIVE",
          },
        });
        if (validCount !== newIds.length) {
          throw new AppError("Mọi thành viên group chat phải thuộc community", 409);
        }
      }
      for (const memberId of newIds) {
        await tx.conversationMember.upsert({
          where: { conversationId_userId: { conversationId, userId: memberId } },
          update: { status: ConversationMemberStatus.ACTIVE, role: ConversationMemberRole.MEMBER, leftAt: null },
          create: { conversationId, userId: memberId },
        });
      }
      return tx.conversation.findUniqueOrThrow({ where: { id: conversationId }, include: { members: true } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  public static async removeMember(userId: string, conversationId: string, targetUserId: string) {
    return prisma.$transaction(async (tx) => {
      const manager = await this.requireGroupManager(tx, conversationId, userId);
      const target = await requireActiveMember(tx, conversationId, targetUserId);
      if (target.role === ConversationMemberRole.OWNER) {
        throw new AppError("Hãy chuyển quyền owner trước khi xóa owner", 409);
      }
      if (manager.role !== ConversationMemberRole.OWNER && target.role === ConversationMemberRole.ADMIN) {
        throw new AppError("Chỉ owner có thể xóa admin", 403);
      }
      return tx.conversationMember.update({
        where: { conversationId_userId: { conversationId, userId: targetUserId } },
        data: { status: ConversationMemberStatus.REMOVED, leftAt: new Date() },
      });
    });
  }

  public static async leaveGroup(userId: string, conversationId: string) {
    return prisma.$transaction(async (tx) => {
      const member = await requireActiveMember(tx, conversationId, userId);
      if (member.conversation.type !== ConversationType.GROUP) {
        throw new AppError("Không thể rời chat trực tiếp", 409);
      }
      if (member.role === ConversationMemberRole.OWNER) {
        throw new AppError("Owner phải chuyển quyền trước khi rời nhóm", 409);
      }
      return tx.conversationMember.update({
        where: { conversationId_userId: { conversationId, userId } },
        data: { status: ConversationMemberStatus.LEFT, leftAt: new Date() },
      });
    });
  }

  public static async transferOwnership(userId: string, conversationId: string, newOwnerId: string) {
    return prisma.$transaction(async (tx) => {
      const owner = await requireActiveMember(tx, conversationId, userId);
      if (owner.conversation.type !== ConversationType.GROUP || owner.role !== ConversationMemberRole.OWNER) {
        throw new AppError("Chỉ owner group chat có thể chuyển quyền", 403);
      }
      const target = await requireActiveMember(tx, conversationId, newOwnerId);
      await tx.conversationMember.update({
        where: { conversationId_userId: { conversationId, userId } },
        data: { role: ConversationMemberRole.ADMIN },
      });
      await tx.conversationMember.update({
        where: { conversationId_userId: { conversationId, userId: target.userId } },
        data: { role: ConversationMemberRole.OWNER },
      });
      return tx.conversation.findUniqueOrThrow({ where: { id: conversationId }, include: { members: true } });
    });
  }

  public static async sendMediaMessage(userId: string, conversationId: string, data: {
    type: "IMAGE" | "VIDEO" | "VOICE" | "FILE";
    mediaAssetIds: string[];
    body?: string;
    clientMessageId: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const membership = await requireActiveMember(tx, conversationId, userId);
      if (data.type === MessageType.VOICE) await EntitlementService.require(tx, userId, "voice_message.send");
      if (membership.conversation.type === ConversationType.DIRECT) {
        const other = await tx.conversationMember.findFirst({ where: { conversationId, userId: { not: userId }, status: ConversationMemberStatus.ACTIVE } });
        if (!other) throw new AppError("Chat trực tiếp không còn người nhận", 409);
        await assertDirectMessagingAllowed(tx, userId, other.userId);
      }
      const existing = await tx.message.findUnique({
        where: { conversationId_senderUserId_clientMessageId: { conversationId, senderUserId: userId, clientMessageId: data.clientMessageId } },
      });
      if (existing) return existing;
      const ids = Array.from(new Set(data.mediaAssetIds));
      const assets = await tx.mediaAsset.findMany({ where: { id: { in: ids }, ownerId: userId, processingStatus: MediaProcessingStatus.READY, deletedAt: null } });
      if (assets.length !== ids.length) throw new AppError("Media không tồn tại, chưa sẵn sàng hoặc không thuộc người gửi", 409);
      const validMime = assets.every((asset) => {
        if (data.type === MessageType.IMAGE) return asset.mimeType.startsWith("image/");
        if (data.type === MessageType.VIDEO) return asset.mimeType.startsWith("video/");
        if (data.type === MessageType.VOICE) return asset.mimeType.startsWith("audio/") && Boolean(asset.durationMs);
        return true;
      });
      if (!validMime) throw new AppError("Loại media không khớp loại tin nhắn", 400);
      const message = await tx.message.create({
        data: {
          conversationId,
          senderType: MessageSenderType.USER,
          senderUserId: userId,
          type: data.type,
          body: data.body?.trim(),
          clientMessageId: data.clientMessageId,
          attachments: { create: ids.map((mediaAssetId, sortOrder) => ({ mediaAssetId, sortOrder })) },
        },
        include: { attachments: { include: { mediaAsset: true } } },
      });
      if (message.body) await ModerationAdapterService.enqueue(tx, "MESSAGE", message.id, message.body);
      const recipients = await tx.conversationMember.findMany({ where: { conversationId, status: ConversationMemberStatus.ACTIVE, userId: { not: userId } }, select: { userId: true } });
      for (const recipient of recipients) {
        await NotificationService.create(tx, {
          recipientId: recipient.userId, actorId: userId, type: NotificationType.MESSAGE,
          entityType: "Conversation", entityId: conversationId,
          payload: { conversationId, messageId: message.id, messageType: data.type },
          dedupeKey: `message:${message.id}:${recipient.userId}`,
        });
      }
      return message;
    });
  }

  public static async startCall(userId: string, conversationId: string, type: CallType, quality = "STANDARD") {
    return prisma.$transaction(async (tx) => {
      const member = await requireActiveMember(tx, conversationId, userId);
      if (type === CallType.VIDEO && quality === "HD") await EntitlementService.require(tx, userId, "video_call.hd");
      if (member.conversation.type === ConversationType.DIRECT) {
        const other = await tx.conversationMember.findFirst({ where: { conversationId, userId: { not: userId }, status: ConversationMemberStatus.ACTIVE } });
        if (!other) throw new AppError("Không còn người nhận cuộc gọi", 409);
        await assertDirectMessagingAllowed(tx, userId, other.userId);
      }
      const members = await tx.conversationMember.findMany({ where: { conversationId, status: ConversationMemberStatus.ACTIVE }, select: { userId: true } });
      return tx.callSession.create({
        data: {
          conversationId, initiatorId: userId, type, quality, provider: "UNASSIGNED",
          providerRoomId: `beebuddy_${randomUUID()}`,
          participants: { create: members.map((item) => ({
            userId: item.userId,
            role: item.userId === userId ? "HOST" : "PARTICIPANT",
            status: item.userId === userId ? CallParticipantStatus.JOINED : CallParticipantStatus.INVITED,
            joinedAt: item.userId === userId ? new Date() : undefined,
          })) },
        },
        include: { participants: true },
      });
    });
  }

  public static async respondToCall(userId: string, callId: string, accept: boolean) {
    return prisma.$transaction(async (tx) => {
      const participant = await tx.callParticipant.findUnique({ where: { callSessionId_userId: { callSessionId: callId, userId } }, include: { callSession: true } });
      if (!participant || participant.callSession.status !== CallStatus.RINGING) throw new AppError("Cuộc gọi không còn chờ phản hồi", 409);
      const now = new Date();
      await tx.callParticipant.update({
        where: { id: participant.id },
        data: accept ? { status: CallParticipantStatus.JOINED, joinedAt: now } : { status: CallParticipantStatus.DECLINED, leftAt: now },
      });
      if (accept) return tx.callSession.update({ where: { id: callId }, data: { status: CallStatus.ACTIVE, answeredAt: now }, include: { participants: true } });
      const pending = await tx.callParticipant.count({ where: { callSessionId: callId, role: "PARTICIPANT", status: CallParticipantStatus.INVITED } });
      if (!pending) return tx.callSession.update({ where: { id: callId }, data: { status: CallStatus.DECLINED, endedAt: now, endReason: "ALL_DECLINED" }, include: { participants: true } });
      return tx.callSession.findUniqueOrThrow({ where: { id: callId }, include: { participants: true } });
    });
  }

  public static async endCall(userId: string, callId: string) {
    return prisma.$transaction(async (tx) => {
      const participant = await tx.callParticipant.findUnique({ where: { callSessionId_userId: { callSessionId: callId, userId } }, include: { callSession: true } });
      if (!participant) throw new AppError("Bạn không thuộc cuộc gọi", 403);
      if (participant.callSession.status !== CallStatus.RINGING && participant.callSession.status !== CallStatus.ACTIVE) return participant.callSession;
      const now = new Date();
      await tx.callParticipant.updateMany({ where: { callSessionId: callId, status: { in: [CallParticipantStatus.INVITED, CallParticipantStatus.JOINED] } }, data: { status: CallParticipantStatus.LEFT, leftAt: now } });
      return tx.callSession.update({ where: { id: callId }, data: { status: CallStatus.ENDED, endedAt: now, endReason: "USER_ENDED" } });
    });
  }

  public static async listCalls(userId: string, conversationId: string, limit = 30) {
    await requireActiveMember(prisma, conversationId, userId);
    return prisma.callSession.findMany({ where: { conversationId, participants: { some: { userId } } }, orderBy: { startedAt: "desc" }, take: Math.min(Math.max(limit, 1), 100), include: { participants: true } });
  }
}
