import { NotificationChannel, NotificationType, PushPlatform } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../common/errors/app-error";
import { NotificationService } from "../../common/services/notification.service";

export class NotificationsService {
  static async list(userId: string, cursor?: string, limit = 30, unreadOnly = false) {
    const take = Math.min(Math.max(limit, 1), 100);
    const now = new Date();
    const disabledTypes = (await prisma.notificationPreference.findMany({
      where: { userId, channel: NotificationChannel.IN_APP, enabled: false },
      select: { type: true },
    })).map((item) => item.type);
    const visibleWhere = {
      recipientId: userId,
      type: { notIn: disabledTypes },
      ...(unreadOnly ? { readAt: null } : {}),
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    };
    const rows = await prisma.notification.findMany({
      where: visibleWhere,
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: {
        actor: {
          select: {
            id: true,
            profile: { select: { fullName: true, username: true, avatarUrl: true } },
          },
        },
      },
    });
    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;
    const unreadCount = await prisma.notification.count({
      where: { ...visibleWhere, readAt: null },
    });
    return { items, unreadCount, nextCursor: hasMore ? items.at(-1)?.id ?? null : null };
  }

  static async markRead(userId: string, notificationId: string) {
    const result = await prisma.notification.updateMany({
      where: { id: notificationId, recipientId: userId, readAt: null },
      data: { readAt: new Date() },
    });
    if (!result.count) {
      const exists = await prisma.notification.count({ where: { id: notificationId, recipientId: userId } });
      if (!exists) throw new AppError("Không tìm thấy thông báo", 404);
    }
    return { read: true };
  }

  static async markAllRead(userId: string) {
    const result = await prisma.notification.updateMany({
      where: { recipientId: userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }

  static getPreferences(userId: string) {
    return prisma.notificationPreference.findMany({ where: { userId }, orderBy: [{ type: "asc" }, { channel: "asc" }] });
  }

  static setPreference(userId: string, type: NotificationType, channel: NotificationChannel, enabled: boolean) {
    return prisma.notificationPreference.upsert({
      where: { userId_type_channel: { userId, type, channel } },
      update: { enabled },
      create: { userId, type, channel, enabled },
    });
  }

  static registerToken(userId: string, platform: PushPlatform, deviceId: string, token: string) {
    return NotificationService.registerPushToken(userId, platform, deviceId, token);
  }

  static async revokeToken(userId: string, deviceId: string) {
    const result = await prisma.devicePushToken.updateMany({
      where: { userId, deviceId, isActive: true },
      data: { isActive: false, revokedAt: new Date() },
    });
    return { revoked: result.count };
  }
}
