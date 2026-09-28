import { ConnectionStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  userBlock: { findFirst: vi.fn() },
  connection: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
  },
  notification: { create: vi.fn() },
  outboxEvent: { create: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("../src/lib/prisma", () => ({ prisma: prismaMock }));

import { ConnectionsService } from "../src/modules/connections/connections.service";

describe("ConnectionsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof prismaMock) => unknown) => callback(prismaMock));
    prismaMock.user.findUnique.mockResolvedValue({ id: "user-b", isBanned: false });
    prismaMock.userBlock.findFirst.mockResolvedValue(null);
    prismaMock.connection.findUnique.mockResolvedValue(null);
    prismaMock.notification.create.mockResolvedValue({ id: "notification-1", recipientId: "user-b", type: "CONNECTION_REQUEST" });
    prismaMock.outboxEvent.create.mockResolvedValue({ id: "outbox-1" });
  });

  it("creates a canonical pending connection and notifies the recipient", async () => {
    prismaMock.connection.upsert.mockResolvedValue({
      id: "connection-1",
      requesterId: "user-a",
      addresseeId: "user-b",
      requestedAt: new Date("2026-09-26T00:00:00.000Z"),
    });

    await ConnectionsService.request("user-a", "user-b");

    expect(prismaMock.connection.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { pairKey: "user-a:user-b" },
      create: expect.objectContaining({ requesterId: "user-a", addresseeId: "user-b" }),
    }));
    expect(prismaMock.notification.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ recipientId: "user-b", actorId: "user-a", type: "CONNECTION_REQUEST" }),
    }));
  });

  it("only lets the addressee accept a pending request", async () => {
    prismaMock.connection.findUnique.mockResolvedValue({
      id: "connection-1",
      requesterId: "user-a",
      addresseeId: "user-b",
      status: ConnectionStatus.PENDING,
    });

    await expect(ConnectionsService.respond("user-a", "connection-1", true)).rejects.toMatchObject({ statusCode: 403 });
    expect(prismaMock.connection.update).not.toHaveBeenCalled();
  });

  it("accepts a pending request and notifies the requester", async () => {
    prismaMock.connection.findUnique.mockResolvedValue({
      id: "connection-1",
      requesterId: "user-a",
      addresseeId: "user-b",
      status: ConnectionStatus.PENDING,
    });
    prismaMock.connection.update.mockResolvedValue({ id: "connection-1", status: ConnectionStatus.ACCEPTED });
    prismaMock.notification.create.mockResolvedValue({ id: "notification-2", recipientId: "user-a", type: "CONNECTION_ACCEPTED" });

    const result = await ConnectionsService.respond("user-b", "connection-1", true);

    expect(result.status).toBe(ConnectionStatus.ACCEPTED);
    expect(prismaMock.connection.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: ConnectionStatus.ACCEPTED }),
    }));
    expect(prismaMock.notification.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ recipientId: "user-a", actorId: "user-b", type: "CONNECTION_ACCEPTED" }),
    }));
  });
});
