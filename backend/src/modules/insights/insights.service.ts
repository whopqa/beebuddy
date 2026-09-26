import { createHash, randomUUID } from "crypto";
import { AiExecutionStatus, ModerationScanStatus, OutboxEventType, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../common/errors/app-error";
import { ModerationAdapterService } from "../../common/services/moderation-adapter.service";

const forbiddenAnalyticsKeys = /email|phone|password|token|secret|prompt|message|content|note|address/i;
function safeProperties(input: Record<string, unknown>) {
  const entries = Object.entries(input).filter(([key, value]) => !forbiddenAnalyticsKeys.test(key) && ["string", "number", "boolean"].includes(typeof value));
  const value = Object.fromEntries(entries.slice(0, 50));
  if (JSON.stringify(value).length > 10_000) throw new AppError("Analytics properties quá lớn", 400);
  return value;
}

export class InsightsService {
  static async track(data: { userId?: string; anonymousId?: string; sessionId?: string; eventName: string; source: string; entityType?: string; entityId?: string; properties: Record<string, unknown>; dedupeKey?: string; occurredAt: Date }) {
    if (!data.userId && !data.anonymousId) throw new AppError("Analytics event cần user hoặc anonymous id", 400);
    return prisma.$transaction(async (tx) => {
      const event = await tx.analyticsEvent.upsert({
        where: { dedupeKey: data.dedupeKey ?? `generated:${randomUUID()}` },
        update: {},
        create: { ...data, properties: safeProperties(data.properties) as Prisma.InputJsonValue },
      });
      await tx.outboxEvent.upsert({ where: { dedupeKey: `analytics:${event.id}` }, update: {}, create: { aggregateType: "AnalyticsEvent", aggregateId: event.id, eventType: OutboxEventType.ANALYTICS_EVENT_RECORDED, dedupeKey: `analytics:${event.id}`, payload: { eventId: event.id, eventName: event.eventName } } });
      return event;
    });
  }

  static listScans(status?: ModerationScanStatus, limit = 50) { return prisma.contentModerationScan.findMany({ where: status ? { status } : {}, orderBy: { queuedAt: "desc" }, take: Math.min(Math.max(limit, 1), 200) }); }

  static async recordModerationResult(scanId: string, data: { provider: string; modelName: string; modelVersion?: string; promptVersion: string; classifications: unknown[]; scores: Record<string, number>; recommendedAction: string; latencyMs?: number; inputTokens?: number; outputTokens?: number }) {
    return prisma.$transaction(async (tx) => {
      const scan = await tx.contentModerationScan.findUnique({ where: { id: scanId } });
      if (!scan) throw new AppError("Không tìm thấy moderation scan", 404);
      const log = await tx.aiExecutionLog.create({ data: { feature: "content_moderation", provider: data.provider, modelName: data.modelName, promptVersion: data.promptVersion, latencyMs: data.latencyMs, inputTokens: data.inputTokens, outputTokens: data.outputTokens, status: AiExecutionStatus.SUCCESS } });
      await tx.contentModerationScan.update({ where: { id: scanId }, data: { provider: data.provider, modelName: data.modelName, modelVersion: data.modelVersion } });
      return ModerationAdapterService.complete(tx, scanId, { executionLogId: log.id, classifications: data.classifications, scores: data.scores, recommendedAction: data.recommendedAction });
    });
  }

  static async aggregateDaily(metricDate: Date) {
    const start = new Date(metricDate); start.setUTCHours(0, 0, 0, 0); const end = new Date(start); end.setUTCDate(end.getUTCDate() + 1);
    const groups = await prisma.analyticsEvent.groupBy({ by: ["eventName"], where: { occurredAt: { gte: start, lt: end } }, _count: { _all: true } });
    return prisma.$transaction(groups.map((group) => {
      const dimensions = {};
      const hash = createHash("sha256").update(JSON.stringify(dimensions)).digest("hex");
      return prisma.analyticsDailyMetric.upsert({ where: { metricDate_metricName_dimensionHash: { metricDate: start, metricName: group.eventName, dimensionHash: hash } }, update: { value: group._count._all, sampleCount: group._count._all }, create: { metricDate: start, metricName: group.eventName, dimensionHash: hash, dimensions, value: group._count._all, sampleCount: group._count._all } });
    }));
  }
}
