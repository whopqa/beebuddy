import { NotificationChannel, NotificationType, OutboxEventType } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  notificationPreference: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
  notification: {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  outboxEvent: { create: vi.fn() },
}));

vi.mock("../src/lib/prisma", () => ({ prisma: prismaMock }));

import { NotificationService } from "../src/common/services/notification.service";
import { NotificationsService } from "../src/modules/notifications/notifications.service";

const input = {
  recipientId: "recipient-1",
  actorId: "actor-1",
  type: NotificationType.MESSAGE,
  payload: { conversationId: "conversation-1" },
};

describe("in-app notification preferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.notificationPreference.findUnique.mockResolvedValue(null);
    prismaMock.notification.create.mockResolvedValue({
      id: "notification-1",
      recipientId: input.recipientId,
      type: input.type,
    });
  });

  it("does not create a notification or outbox event when its type is turned off", async () => {
    prismaMock.notificationPreference.findUnique.mockResolvedValue({ enabled: false });

    const result = await NotificationService.create(prismaMock as never, input);

    expect(result).toBeNull();
    expect(prismaMock.notificationPreference.findUnique).toHaveBeenCalledWith({
      where: { userId_type_channel: { userId: "recipient-1", type: NotificationType.MESSAGE, channel: NotificationChannel.IN_APP } },
      select: { enabled: true },
    });
    expect(prismaMock.notification.create).not.toHaveBeenCalled();
    expect(prismaMock.outboxEvent.create).not.toHaveBeenCalled();
  });

  it("creates notifications and an outbox event when the preference is on or unset", async () => {
    for (const preference of [null, { enabled: true }]) {
      prismaMock.notificationPreference.findUnique.mockResolvedValueOnce(preference);
      await expect(NotificationService.create(prismaMock as never, input)).resolves.toMatchObject({ id: "notification-1" });
    }

    expect(prismaMock.notification.create).toHaveBeenCalledTimes(2);
    expect(prismaMock.outboxEvent.create).toHaveBeenCalledTimes(2);
    expect(prismaMock.outboxEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ eventType: OutboxEventType.NOTIFICATION_CREATED, aggregateId: "notification-1" }),
    });
  });

  it("keeps hidden types out of the list and unread count while turned off", async () => {
    prismaMock.notificationPreference.findMany.mockResolvedValue([{ type: NotificationType.MESSAGE }]);
    prismaMock.notification.findMany.mockResolvedValue([]);
    prismaMock.notification.count.mockResolvedValue(0);

    const page = await NotificationsService.list("recipient-1", undefined, 20, true);

    expect(page.unreadCount).toBe(0);
    expect(prismaMock.notification.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ type: { notIn: [NotificationType.MESSAGE] }, readAt: null }),
    }));
    expect(prismaMock.notification.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ type: { notIn: [NotificationType.MESSAGE] }, readAt: null }),
    });
  });

  it("saves a preference for the in-app channel", async () => {
    prismaMock.notificationPreference.upsert.mockResolvedValue({ type: NotificationType.MESSAGE, channel: NotificationChannel.IN_APP, enabled: false });

    await NotificationsService.setPreference("recipient-1", NotificationType.MESSAGE, NotificationChannel.IN_APP, false);

    expect(prismaMock.notificationPreference.upsert).toHaveBeenCalledWith({
      where: { userId_type_channel: { userId: "recipient-1", type: NotificationType.MESSAGE, channel: NotificationChannel.IN_APP } },
      update: { enabled: false },
      create: { userId: "recipient-1", type: NotificationType.MESSAGE, channel: NotificationChannel.IN_APP, enabled: false },
    });
  });
});
