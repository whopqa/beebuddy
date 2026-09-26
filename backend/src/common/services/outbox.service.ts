import { OutboxStatus, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";

export class OutboxService {
  static async claimBatch(limit = 50) {
    const batchSize = Math.min(Math.max(limit, 1), 200);
    return prisma.$transaction(async (tx) => tx.$queryRaw<Array<{ id: string; eventType: string; payload: Prisma.JsonValue; attempts: number }>>`
      UPDATE "OutboxEvent"
      SET "status" = 'PROCESSING', "lockedAt" = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
          "attempts" = "attempts" + 1, "updatedAt" = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
      WHERE "id" IN (
        SELECT "id" FROM "OutboxEvent"
        WHERE "status" IN ('PENDING', 'FAILED') AND "availableAt" <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
        ORDER BY "availableAt", "createdAt"
        FOR UPDATE SKIP LOCKED
        LIMIT ${batchSize}
      )
      RETURNING "id", "eventType", "payload", "attempts"
    `);
  }

  static markProcessed(id: string) {
    return prisma.outboxEvent.update({ where: { id }, data: { status: OutboxStatus.PROCESSED, processedAt: new Date(), lockedAt: null, lastError: null } });
  }

  static async markFailed(id: string, error: unknown, maxAttempts = 8) {
    const row = await prisma.outboxEvent.findUniqueOrThrow({ where: { id } });
    const dead = row.attempts >= maxAttempts;
    const delayMs = Math.min(60 * 60 * 1000, 1000 * 2 ** Math.max(row.attempts - 1, 0));
    return prisma.outboxEvent.update({
      where: { id },
      data: {
        status: dead ? OutboxStatus.DEAD : OutboxStatus.FAILED,
        availableAt: dead ? row.availableAt : new Date(Date.now() + delayMs),
        lockedAt: null,
        lastError: error instanceof Error ? error.message.slice(0, 2000) : String(error).slice(0, 2000),
      },
    });
  }

  static recoverStaleLocks(olderThanMinutes = 10) {
    return prisma.outboxEvent.updateMany({
      where: { status: OutboxStatus.PROCESSING, lockedAt: { lt: new Date(Date.now() - olderThanMinutes * 60_000) } },
      data: { status: OutboxStatus.FAILED, lockedAt: null, lastError: "Recovered stale processing lock" },
    });
  }
}
