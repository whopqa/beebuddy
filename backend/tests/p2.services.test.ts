import { MascotMemoryCategory } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  analyticsEvent: { upsert: vi.fn() },
  outboxEvent: { upsert: vi.fn() },
  mascotMemory: { create: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("../src/lib/prisma", () => ({ prisma: prismaMock }));

import { InsightsService } from "../src/modules/insights/insights.service";
import { WellbeingService } from "../src/modules/wellbeing/wellbeing.service";

describe("P2 service boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof prismaMock) => unknown) => callback(prismaMock));
    prismaMock.analyticsEvent.upsert.mockResolvedValue({ id: "event-1", eventName: "screen.opened" });
    prismaMock.outboxEvent.upsert.mockResolvedValue({ id: "outbox-1" });
  });

  it("removes sensitive analytics keys and creates an idempotent outbox event", async () => {
    await InsightsService.track({
      userId: "user-1",
      eventName: "screen.opened",
      source: "WEB",
      properties: { screen: "home", email: "private@example.com", accessToken: "secret" },
      dedupeKey: "event-dedupe-1",
      occurredAt: new Date("2026-09-25T00:00:00.000Z"),
    });

    expect(prismaMock.analyticsEvent.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ properties: { screen: "home" } }),
    }));
    expect(prismaMock.outboxEvent.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { dedupeKey: "analytics:event-1" },
    }));
  });

  it("refuses Mascot memory without explicit consent", async () => {
    expect(() => WellbeingService.createExplicitMemory("user-1", {
      category: MascotMemoryCategory.PREFERENCE,
      summary: "Thích check-in buổi sáng",
      consent: false,
    } as never)).toThrow(/đồng ý/);
    expect(prismaMock.mascotMemory.create).not.toHaveBeenCalled();
  });
});
