import { createHash } from "crypto";
import { ModerationScanStatus, OutboxEventType, Prisma } from "@prisma/client";
import { AppError } from "../errors/app-error";

export class ModerationAdapterService {
  static async enqueue(tx: Prisma.TransactionClient, targetType: string, targetId: string, content: string, policyVersion = "beebuddy-v1") {
    const normalized = content.trim();
    if (!normalized) return null;
    const contentHash = createHash("sha256").update(normalized).digest("hex");
    const scan = await tx.contentModerationScan.upsert({
      where: { targetType_targetId_contentHash_policyVersion: { targetType, targetId, contentHash, policyVersion } },
      update: {},
      create: { targetType, targetId, contentHash, policyVersion, provider: "UNASSIGNED", modelName: "UNASSIGNED" },
    });
    await tx.outboxEvent.upsert({
      where: { dedupeKey: `ai-moderation:${scan.id}` }, update: {},
      create: { aggregateType: "ContentModerationScan", aggregateId: scan.id, eventType: OutboxEventType.AI_MODERATION_REQUESTED, dedupeKey: `ai-moderation:${scan.id}`, payload: { scanId: scan.id, targetType, targetId } },
    });
    return scan;
  }

  static async complete(tx: Prisma.TransactionClient, scanId: string, data: { executionLogId?: string; classifications: unknown[]; scores: Record<string, number>; recommendedAction: string }) {
    const scan = await tx.contentModerationScan.findUnique({ where: { id: scanId } });
    if (!scan || scan.status !== ModerationScanStatus.QUEUED && scan.status !== ModerationScanStatus.PROCESSING) throw new AppError("Moderation scan không còn chờ xử lý", 409);
    return tx.contentModerationScan.update({
      where: { id: scanId }, data: { status: ModerationScanStatus.COMPLETED, executionLogId: data.executionLogId, classifications: data.classifications as Prisma.InputJsonValue, scores: data.scores, recommendedAction: data.recommendedAction, completedAt: new Date() },
    });
  }
}
