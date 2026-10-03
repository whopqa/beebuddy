import { createCipheriv, createHash, randomBytes } from "crypto";
import {
  NotificationChannel,
  NotificationType,
  OutboxEventType,
  Prisma,
  PushPlatform,
} from "@prisma/client";
import { ENV } from "../../config/environment";

export type NotificationInput = {
  recipientId: string;
  actorId?: string;
  type: NotificationType;
  entityType?: string;
  entityId?: string;
  payload: Record<string, unknown>;
  dedupeKey?: string;
};

function encryptPushToken(token: string) {
  const key = createHash("sha256").update(ENV.PUSH_TOKEN_ENCRYPTION_KEY).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return `v1:${iv.toString("base64url")}:${cipher.getAuthTag().toString("base64url")}:${encrypted.toString("base64url")}`;
}

export class NotificationService {
  static async create(tx: Prisma.TransactionClient, input: NotificationInput) {
    if (input.recipientId === input.actorId) return null;
    const preference = await tx.notificationPreference.findUnique({
      where: {
        userId_type_channel: {
          userId: input.recipientId,
          type: input.type,
          channel: NotificationChannel.IN_APP,
        },
      },
      select: { enabled: true },
    });
    if (preference?.enabled === false) return null;
    const notification = await tx.notification.create({
      data: {
        recipientId: input.recipientId,
        actorId: input.actorId,
        type: input.type,
        entityType: input.entityType,
        entityId: input.entityId,
        payload: input.payload as Prisma.InputJsonValue,
      },
    });
    await tx.outboxEvent.create({
      data: {
        aggregateType: "Notification",
        aggregateId: notification.id,
        eventType: OutboxEventType.NOTIFICATION_CREATED,
        dedupeKey: input.dedupeKey,
        payload: {
          notificationId: notification.id,
          recipientId: notification.recipientId,
          type: notification.type,
        },
      },
    });
    return notification;
  }

  static hashPushToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  static async registerPushToken(userId: string, platform: PushPlatform, deviceId: string, token: string) {
    const tokenHash = this.hashPushToken(token);
    return (await import("../../lib/prisma")).prisma.$transaction(async (tx) => {
      await tx.devicePushToken.deleteMany({
        where: {
          OR: [
            { tokenHash },
            { userId, platform, deviceId },
          ],
        },
      });
      return tx.devicePushToken.create({
        data: {
          userId,
          platform,
          deviceId,
          tokenHash,
          encryptedToken: encryptPushToken(token),
        },
        select: { id: true, platform: true, deviceId: true, isActive: true, lastSeenAt: true },
      });
    });
  }
}
