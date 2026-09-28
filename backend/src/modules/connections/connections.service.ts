import { ConnectionStatus, NotificationType, Prisma } from "@prisma/client";
import { AppError } from "../../common/errors/app-error";
import { NotificationService } from "../../common/services/notification.service";
import { prisma } from "../../lib/prisma";

const personSelect = {
  id: true,
  tier: true,
  profile: {
    select: { fullName: true, username: true, avatarUrl: true, location: true, bio: true },
  },
} satisfies Prisma.UserSelect;

const connectionInclude = {
  requester: { select: personSelect },
  addressee: { select: personSelect },
} satisfies Prisma.ConnectionInclude;

function pairKey(first: string, second: string) {
  return [first, second].sort().join(":");
}

export class ConnectionsService {
  static list(userId: string, status?: ConnectionStatus, limit = 50) {
    return prisma.connection.findMany({
      where: {
        OR: [{ requesterId: userId }, { addresseeId: userId }],
        ...(status ? { status } : {}),
      },
      take: Math.min(Math.max(limit, 1), 100),
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      include: connectionInclude,
    });
  }

  static async request(userId: string, targetId: string) {
    if (userId === targetId) throw new AppError("Không thể tự kết nối với chính mình", 400);
    return prisma.$transaction(async (tx) => {
      const [target, blocked, existing] = await Promise.all([
        tx.user.findUnique({ where: { id: targetId }, select: { id: true, isBanned: true } }),
        tx.userBlock.findFirst({
          where: { OR: [{ blockerId: userId, blockedId: targetId }, { blockerId: targetId, blockedId: userId }] },
        }),
        tx.connection.findUnique({ where: { pairKey: pairKey(userId, targetId) } }),
      ]);
      if (!target || target.isBanned) throw new AppError("Người dùng không khả dụng", 404);
      if (blocked) throw new AppError("Không thể kết nối với người dùng này", 403);
      if (existing?.status === ConnectionStatus.ACCEPTED) return existing;
      if (existing?.status === ConnectionStatus.PENDING) {
        if (existing.addresseeId === userId) throw new AppError("Bạn đang có lời mời kết nối từ người này", 409);
        return existing;
      }

      const now = new Date();
      const connection = await tx.connection.upsert({
        where: { pairKey: pairKey(userId, targetId) },
        update: {
          userId,
          targetId,
          requesterId: userId,
          addresseeId: targetId,
          status: ConnectionStatus.PENDING,
          requestedAt: now,
          respondedAt: null,
          endedAt: null,
        },
        create: {
          userId,
          targetId,
          requesterId: userId,
          addresseeId: targetId,
          pairKey: pairKey(userId, targetId),
        },
        include: connectionInclude,
      });
      await NotificationService.create(tx, {
        recipientId: targetId,
        actorId: userId,
        type: NotificationType.CONNECTION_REQUEST,
        entityType: "Connection",
        entityId: connection.id,
        payload: { connectionId: connection.id, requesterId: userId },
        dedupeKey: `connection-request:${connection.id}:${connection.requestedAt.toISOString()}`,
      });
      return connection;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  static async respond(userId: string, connectionId: string, accept: boolean) {
    return prisma.$transaction(async (tx) => {
      const connection = await tx.connection.findUnique({ where: { id: connectionId } });
      if (!connection) throw new AppError("Không tìm thấy lời mời kết nối", 404);
      if (connection.addresseeId !== userId) throw new AppError("Chỉ người nhận mới có thể phản hồi lời mời", 403);
      if (connection.status !== ConnectionStatus.PENDING) throw new AppError("Lời mời kết nối không còn hiệu lực", 409);
      const now = new Date();
      const updated = await tx.connection.update({
        where: { id: connection.id },
        data: {
          status: accept ? ConnectionStatus.ACCEPTED : ConnectionStatus.REJECTED,
          respondedAt: now,
          endedAt: accept ? null : now,
        },
        include: connectionInclude,
      });
      if (accept) {
        await NotificationService.create(tx, {
          recipientId: connection.requesterId,
          actorId: userId,
          type: NotificationType.CONNECTION_ACCEPTED,
          entityType: "Connection",
          entityId: connection.id,
          payload: { connectionId: connection.id, userId },
          dedupeKey: `connection-accepted:${connection.id}:${now.toISOString()}`,
        });
      }
      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  static async cancel(userId: string, connectionId: string) {
    const connection = await prisma.connection.findUnique({ where: { id: connectionId } });
    if (!connection) throw new AppError("Không tìm thấy lời mời kết nối", 404);
    if (connection.requesterId !== userId) throw new AppError("Chỉ người gửi mới có thể hủy lời mời", 403);
    if (connection.status !== ConnectionStatus.PENDING) throw new AppError("Lời mời kết nối không còn hiệu lực", 409);
    return prisma.connection.update({
      where: { id: connection.id },
      data: { status: ConnectionStatus.CANCELLED, endedAt: new Date() },
      include: connectionInclude,
    });
  }

  static async remove(userId: string, connectionId: string) {
    const connection = await prisma.connection.findUnique({ where: { id: connectionId } });
    if (!connection) throw new AppError("Không tìm thấy kết nối", 404);
    if (connection.requesterId !== userId && connection.addresseeId !== userId) {
      throw new AppError("Bạn không thuộc kết nối này", 403);
    }
    if (connection.status !== ConnectionStatus.ACCEPTED) throw new AppError("Kết nối không còn hoạt động", 409);
    return prisma.connection.update({
      where: { id: connection.id },
      data: { status: ConnectionStatus.CANCELLED, endedAt: new Date() },
      include: connectionInclude,
    });
  }
}
