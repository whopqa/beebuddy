-- BeeBuddy Database V2 / P0 / M6: moderation cases, append-only audit,
-- structured restrictions, versioned legal documents and data-subject requests.

CREATE TYPE "ReportSource" AS ENUM ('USER', 'RULE', 'AI', 'SYSTEM');
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'TRIAGED', 'RESOLVED', 'DISMISSED');
CREATE TYPE "ModerationCaseStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'RESOLVED', 'DISMISSED');
CREATE TYPE "ModerationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');
CREATE TYPE "AuditActorType" AS ENUM ('USER', 'ADMIN', 'SYSTEM', 'WORKER');
CREATE TYPE "UserRestrictionType" AS ENUM ('WARNING', 'SUSPENSION', 'BAN', 'FEATURE_RESTRICTION');
CREATE TYPE "LegalDocumentType" AS ENUM ('TERMS', 'PRIVACY', 'COOKIE_POLICY', 'MARKETING');
CREATE TYPE "ConsentDecision" AS ENUM ('ACCEPTED', 'REJECTED', 'CUSTOMIZED', 'REVOKED');
CREATE TYPE "UserDataRequestType" AS ENUM ('EXPORT', 'DELETE', 'CORRECT');
CREATE TYPE "UserDataRequestStatus" AS ENUM ('REQUESTED', 'VERIFIED', 'PROCESSING', 'COMPLETED', 'REJECTED');

CREATE TABLE "ModerationCase" (
    "id" TEXT NOT NULL,
    "caseType" TEXT NOT NULL,
    "priority" "ModerationPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "ModerationCaseStatus" NOT NULL DEFAULT 'OPEN',
    "assigneeId" TEXT,
    "ruleVersion" TEXT,
    "modelName" TEXT,
    "modelVersion" TEXT,
    "summary" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ModerationCase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ModerationDecision" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ModerationDecision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorType" "AuditActorType" NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "beforeData" JSONB,
    "afterData" JSONB,
    "metadata" JSONB,
    "requestId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserRestriction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "UserRestrictionType" NOT NULL,
    "reasonCode" TEXT NOT NULL,
    "note" TEXT,
    "featureCode" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "revokedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserRestriction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LegalDocument" (
    "id" TEXT NOT NULL,
    "type" "LegalDocumentType" NOT NULL,
    "version" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "retiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LegalDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserDataRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "UserDataRequestType" NOT NULL,
    "status" "UserDataRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "resultLocation" TEXT,
    "resultExpiresAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserDataRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ModerationCase_status_priority_openedAt_idx" ON "ModerationCase"("status", "priority", "openedAt");
CREATE INDEX "ModerationCase_assigneeId_status_idx" ON "ModerationCase"("assigneeId", "status");
CREATE INDEX "ModerationDecision_caseId_createdAt_idx" ON "ModerationDecision"("caseId", "createdAt");
CREATE INDEX "ModerationDecision_actorId_createdAt_idx" ON "ModerationDecision"("actorId", "createdAt");
CREATE INDEX "AuditLog_targetType_targetId_createdAt_idx" ON "AuditLog"("targetType", "targetId", "createdAt");
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");
CREATE INDEX "AuditLog_requestId_idx" ON "AuditLog"("requestId");
CREATE INDEX "UserRestriction_userId_type_revokedAt_expiresAt_idx" ON "UserRestriction"("userId", "type", "revokedAt", "expiresAt");
CREATE INDEX "UserRestriction_featureCode_revokedAt_idx" ON "UserRestriction"("featureCode", "revokedAt");
CREATE UNIQUE INDEX "LegalDocument_type_version_key" ON "LegalDocument"("type", "version");
CREATE INDEX "LegalDocument_type_effectiveAt_retiredAt_idx" ON "LegalDocument"("type", "effectiveAt", "retiredAt");
CREATE INDEX "UserDataRequest_userId_status_requestedAt_idx" ON "UserDataRequest"("userId", "status", "requestedAt");
CREATE INDEX "UserDataRequest_status_requestedAt_idx" ON "UserDataRequest"("status", "requestedAt");

ALTER TABLE "ModerationCase" ADD CONSTRAINT "ModerationCase_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ModerationDecision" ADD CONSTRAINT "ModerationDecision_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ModerationCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ModerationDecision" ADD CONSTRAINT "ModerationDecision_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserRestriction" ADD CONSTRAINT "UserRestriction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserRestriction" ADD CONSTRAINT "UserRestriction_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserRestriction" ADD CONSTRAINT "UserRestriction_revokedByUserId_fkey" FOREIGN KEY ("revokedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserDataRequest" ADD CONSTRAINT "UserDataRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Report evolves from a loose string queue into typed moderation facts.
ALTER TABLE "Report"
    ALTER COLUMN "reporterId" DROP NOT NULL,
    ADD COLUMN "source" "ReportSource" NOT NULL DEFAULT 'USER',
    ADD COLUMN "moderationCaseId" TEXT,
    ADD COLUMN "reasonCode" TEXT,
    ADD COLUMN "details" TEXT,
    ADD COLUMN "resolvedAt" TIMESTAMP(3);
ALTER TABLE "Report" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Report"
    ALTER COLUMN "status" TYPE "ReportStatus"
    USING CASE upper("status")
        WHEN 'RESOLVED' THEN 'RESOLVED'::"ReportStatus"
        WHEN 'DISMISSED' THEN 'DISMISSED'::"ReportStatus"
        WHEN 'TRIAGED' THEN 'TRIAGED'::"ReportStatus"
        ELSE 'OPEN'::"ReportStatus"
    END;
ALTER TABLE "Report" ALTER COLUMN "status" SET DEFAULT 'OPEN';
UPDATE "Report" SET "source" = CASE WHEN "reporterId" IS NULL THEN 'SYSTEM'::"ReportSource" ELSE 'USER'::"ReportSource" END;
UPDATE "Report" SET "postId" = NULL, "targetUserId" = NULL WHERE "commentId" IS NOT NULL;
UPDATE "Report" SET "targetUserId" = NULL WHERE "commentId" IS NULL AND "postId" IS NOT NULL;
UPDATE "Report" SET "targetUserId" = "reporterId" WHERE "commentId" IS NULL AND "postId" IS NULL AND "targetUserId" IS NULL AND "reporterId" IS NOT NULL;
DELETE FROM "Report" WHERE num_nonnulls("targetUserId", "postId", "commentId") = 0;
ALTER TABLE "Report" DROP CONSTRAINT "Report_reporterId_fkey";
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_moderationCaseId_fkey" FOREIGN KEY ("moderationCaseId") REFERENCES "ModerationCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_exactly_one_target_check" CHECK (num_nonnulls("targetUserId", "postId", "commentId") = 1);
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");
CREATE INDEX "Report_moderationCaseId_createdAt_idx" ON "Report"("moderationCaseId", "createdAt");

-- Seed legal versions used by existing consent events.
INSERT INTO "LegalDocument" ("id", "type", "version", "contentHash", "publishedAt", "effectiveAt", "createdAt") VALUES
    (md5('legal:TERMS:1.0'), 'TERMS', '1.0', md5('beebuddy-terms-1.0'), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (md5('legal:PRIVACY:1.0'), 'PRIVACY', '1.0', md5('beebuddy-privacy-1.0'), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (md5('legal:COOKIE_POLICY:1.0'), 'COOKIE_POLICY', '1.0', md5('beebuddy-cookie-1.0'), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

ALTER TABLE "UserConsent"
    ADD COLUMN "anonymousSessionId" TEXT,
    ADD COLUMN "legalDocumentId" TEXT,
    ADD COLUMN "decision" "ConsentDecision" NOT NULL DEFAULT 'ACCEPTED',
    ADD COLUMN "categories" JSONB,
    ADD COLUMN "consentedAt" TIMESTAMP(3);

UPDATE "UserConsent" consent
SET
    "anonymousSessionId" = CASE WHEN consent."userId" IS NULL THEN COALESCE(consent."sessionId", 'legacy:' || consent."id") ELSE NULL END,
    "legalDocumentId" = document."id",
    "decision" = CASE WHEN consent."isAccepted" THEN 'ACCEPTED'::"ConsentDecision" ELSE 'REJECTED'::"ConsentDecision" END,
    "consentedAt" = consent."acceptedAt"
FROM "LegalDocument" document
WHERE document."version" = '1.0'
  AND document."type" = CASE upper(consent."consentType")
      WHEN 'TERMS' THEN 'TERMS'::"LegalDocumentType"
      WHEN 'COOKIES' THEN 'COOKIE_POLICY'::"LegalDocumentType"
      ELSE 'PRIVACY'::"LegalDocumentType"
  END;

ALTER TABLE "UserConsent"
    ALTER COLUMN "legalDocumentId" SET NOT NULL,
    ALTER COLUMN "consentedAt" SET NOT NULL,
    ALTER COLUMN "consentedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "UserConsent" ADD CONSTRAINT "UserConsent_legalDocumentId_fkey" FOREIGN KEY ("legalDocumentId") REFERENCES "LegalDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserConsent" ADD CONSTRAINT "UserConsent_exactly_one_owner_check" CHECK (num_nonnulls("userId", "anonymousSessionId") = 1);
CREATE INDEX "UserConsent_legalDocumentId_consentedAt_idx" ON "UserConsent"("legalDocumentId", "consentedAt");
CREATE INDEX "UserConsent_anonymousSessionId_consentedAt_idx" ON "UserConsent"("anonymousSessionId", "consentedAt");

-- Preserve legacy moderation activity in the immutable audit stream.
INSERT INTO "AuditLog" ("id", "actorType", "actorUserId", "action", "targetType", "targetId", "metadata", "createdAt")
SELECT md5('audit:moderation-log:' || log."id"), 'ADMIN', log."adminId", log."action", log."targetType", log."targetId", jsonb_build_object('legacyNote', log."note"), log."createdAt"
FROM "ModerationLog" log;

INSERT INTO "UserRestriction" ("id", "userId", "type", "reasonCode", "note", "startsAt", "createdAt")
SELECT md5('restriction:legacy-ban:' || u."id"), u."id", 'BAN', 'LEGACY_BAN', u."banReason", u."updatedAt", CURRENT_TIMESTAMP
FROM "User" u WHERE u."isBanned" = true;

-- AuditLog is append-only at the database boundary.
CREATE OR REPLACE FUNCTION "reject_audit_log_mutation"()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'AuditLog is append-only' USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "AuditLog_no_update_or_delete"
BEFORE UPDATE OR DELETE ON "AuditLog"
FOR EACH ROW EXECUTE FUNCTION "reject_audit_log_mutation"();
