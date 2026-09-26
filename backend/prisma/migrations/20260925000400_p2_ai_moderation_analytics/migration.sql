-- BeeBuddy P2 / M13: AI moderation adapter records and privacy-safe product analytics.

ALTER TYPE "OutboxEventType" ADD VALUE 'AI_MODERATION_REQUESTED';
ALTER TYPE "OutboxEventType" ADD VALUE 'ANALYTICS_EVENT_RECORDED';
CREATE TYPE "ModerationScanStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

CREATE TABLE "ContentModerationScan" (
  "id" TEXT NOT NULL, "targetType" TEXT NOT NULL, "targetId" TEXT NOT NULL, "contentHash" TEXT NOT NULL,
  "provider" TEXT NOT NULL, "modelName" TEXT NOT NULL, "modelVersion" TEXT, "policyVersion" TEXT NOT NULL,
  "status" "ModerationScanStatus" NOT NULL DEFAULT 'QUEUED', "classifications" JSONB, "scores" JSONB,
  "recommendedAction" TEXT, "executionLogId" TEXT, "errorCode" TEXT,
  "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContentModerationScan_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ContentModerationScan_hash_check" CHECK (length("contentHash") = 64),
  CONSTRAINT "ContentModerationScan_result_shape_check" CHECK (
    ("classifications" IS NULL OR jsonb_typeof("classifications") = 'array') AND
    ("scores" IS NULL OR jsonb_typeof("scores") = 'object')
  ),
  CONSTRAINT "ContentModerationScan_completion_check" CHECK (
    ("status" IN ('COMPLETED', 'FAILED') AND "completedAt" IS NOT NULL)
    OR ("status" IN ('QUEUED', 'PROCESSING') AND "completedAt" IS NULL)
  )
);

CREATE TABLE "AnalyticsEvent" (
  "id" TEXT NOT NULL, "userId" TEXT, "anonymousId" TEXT, "sessionId" TEXT,
  "eventName" TEXT NOT NULL, "source" TEXT NOT NULL, "entityType" TEXT, "entityId" TEXT,
  "properties" JSONB NOT NULL, "dedupeKey" TEXT, "occurredAt" TIMESTAMP(3) NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AnalyticsEvent_actor_check" CHECK ("userId" IS NOT NULL OR "anonymousId" IS NOT NULL),
  CONSTRAINT "AnalyticsEvent_name_check" CHECK ("eventName" ~ '^[a-z][a-z0-9_.-]{1,99}$'),
  CONSTRAINT "AnalyticsEvent_properties_object_check" CHECK (jsonb_typeof("properties") = 'object')
);

CREATE TABLE "AnalyticsDailyMetric" (
  "id" TEXT NOT NULL, "metricDate" DATE NOT NULL, "metricName" TEXT NOT NULL,
  "dimensionHash" TEXT NOT NULL, "dimensions" JSONB NOT NULL, "value" DECIMAL(20,6) NOT NULL,
  "sampleCount" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AnalyticsDailyMetric_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AnalyticsDailyMetric_hash_check" CHECK (length("dimensionHash") = 64),
  CONSTRAINT "AnalyticsDailyMetric_dimensions_object_check" CHECK (jsonb_typeof("dimensions") = 'object'),
  CONSTRAINT "AnalyticsDailyMetric_count_check" CHECK ("sampleCount" >= 0)
);

CREATE UNIQUE INDEX "ContentModerationScan_targetType_targetId_contentHash_policyVersion_key" ON "ContentModerationScan"("targetType", "targetId", "contentHash", "policyVersion");
CREATE INDEX "ContentModerationScan_status_queuedAt_idx" ON "ContentModerationScan"("status", "queuedAt");
CREATE INDEX "ContentModerationScan_targetType_targetId_createdAt_idx" ON "ContentModerationScan"("targetType", "targetId", "createdAt");
CREATE UNIQUE INDEX "AnalyticsEvent_dedupeKey_key" ON "AnalyticsEvent"("dedupeKey");
CREATE INDEX "AnalyticsEvent_eventName_occurredAt_idx" ON "AnalyticsEvent"("eventName", "occurredAt");
CREATE INDEX "AnalyticsEvent_userId_occurredAt_idx" ON "AnalyticsEvent"("userId", "occurredAt");
CREATE INDEX "AnalyticsEvent_entityType_entityId_occurredAt_idx" ON "AnalyticsEvent"("entityType", "entityId", "occurredAt");
CREATE UNIQUE INDEX "AnalyticsDailyMetric_metricDate_metricName_dimensionHash_key" ON "AnalyticsDailyMetric"("metricDate", "metricName", "dimensionHash");
CREATE INDEX "AnalyticsDailyMetric_metricName_metricDate_idx" ON "AnalyticsDailyMetric"("metricName", "metricDate");

ALTER TABLE "ContentModerationScan" ADD CONSTRAINT "ContentModerationScan_executionLogId_fkey" FOREIGN KEY ("executionLogId") REFERENCES "AiExecutionLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
