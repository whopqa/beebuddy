import { ConversationMemberStatus, ConversationType } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  conversationMember: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn(), findMany: vi.fn() },
  message: { findUnique: vi.fn(), findMany: vi.fn() },
  messageReadReceipt: { createMany: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("../src/lib/prisma", () => ({ prisma: prismaMock }));

import { ConversationEventsService } from "../src/modules/conversations/conversation-events.service";
import { ConversationsService } from "../src/modules/conversations/conversations.service";

describe("conversation read receipts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof prismaMock) => unknown) => callback(prismaMock));
    prismaMock.conversationMember.findUnique.mockResolvedValue({
      id: "membership-1",
      status: ConversationMemberStatus.ACTIVE,
      conversation: { id: "conversation-1", type: ConversationType.DIRECT, deletedAt: null },
    });
    prismaMock.conversationMember.findUniqueOrThrow.mockResolvedValue({ lastReadAt: null, lastReadMessageId: null });
    prismaMock.conversationMember.update.mockResolvedValue({ id: "membership-1" });
    prismaMock.conversationMember.findMany.mockResolvedValue([{ userId: "reader-1" }, { userId: "sender-1" }]);
    prismaMock.message.findUnique.mockResolvedValue({ id: "message-2", conversationId: "conversation-1", createdAt: new Date("2026-09-28T10:00:00Z") });
    prismaMock.message.findMany.mockResolvedValue([{ id: "message-1" }, { id: "message-2" }]);
    prismaMock.messageReadReceipt.createMany.mockResolvedValue({ count: 2 });
  });

  it("marks every incoming message through the selected message as read and emits realtime state", async () => {
    const publish = vi.spyOn(ConversationEventsService, "publish");

    await ConversationsService.markRead("reader-1", "conversation-1", "message-2");

    expect(prismaMock.messageReadReceipt.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ messageId: "message-1", userId: "reader-1" }),
        expect.objectContaining({ messageId: "message-2", userId: "reader-1" }),
      ]),
      skipDuplicates: true,
    });
    expect(publish).toHaveBeenCalledWith(["reader-1", "sender-1"], expect.objectContaining({
      type: "message.read",
      conversationId: "conversation-1",
      userId: "reader-1",
      messageId: "message-2",
    }));
  });
});
