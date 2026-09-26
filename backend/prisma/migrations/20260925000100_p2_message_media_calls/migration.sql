-- BeeBuddy P2 / M10: richer message media and durable call lifecycle metadata.
-- Audio/video streams remain with the provider and are never stored in PostgreSQL.

CREATE TYPE "CallType" AS ENUM ('AUDIO', 'VIDEO');
CREATE TYPE "CallStatus" AS ENUM ('RINGING', 'ACTIVE', 'ENDED', 'DECLINED', 'MISSED', 'FAILED');
CREATE TYPE "CallParticipantRole" AS ENUM ('HOST', 'PARTICIPANT');
CREATE TYPE "CallParticipantStatus" AS ENUM ('INVITED', 'JOINED', 'LEFT', 'DECLINED', 'MISSED');

CREATE TABLE "CallSession" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "initiatorId" TEXT NOT NULL,
    "type" "CallType" NOT NULL,
    "status" "CallStatus" NOT NULL DEFAULT 'RINGING',
    "provider" TEXT NOT NULL,
    "providerRoomId" TEXT NOT NULL,
    "quality" TEXT NOT NULL DEFAULT 'STANDARD',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answeredAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "endReason" TEXT,
    "providerMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CallSession_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CallSession_provider_check" CHECK (length(trim("provider")) > 0),
    CONSTRAINT "CallSession_room_check" CHECK (length(trim("providerRoomId")) > 0),
    CONSTRAINT "CallSession_quality_check" CHECK ("quality" IN ('STANDARD', 'HD')),
    CONSTRAINT "CallSession_timeline_check" CHECK (
      ("answeredAt" IS NULL OR "answeredAt" >= "startedAt") AND
      ("endedAt" IS NULL OR "endedAt" >= "startedAt")
    ),
    CONSTRAINT "CallSession_terminal_check" CHECK (
      ("status" IN ('ENDED', 'DECLINED', 'MISSED', 'FAILED') AND "endedAt" IS NOT NULL)
      OR ("status" IN ('RINGING', 'ACTIVE') AND "endedAt" IS NULL)
    )
);

CREATE TABLE "CallParticipant" (
    "id" TEXT NOT NULL,
    "callSessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "CallParticipantRole" NOT NULL DEFAULT 'PARTICIPANT',
    "status" "CallParticipantStatus" NOT NULL DEFAULT 'INVITED',
    "joinedAt" TIMESTAMP(3),
    "leftAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CallParticipant_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CallParticipant_timeline_check" CHECK ("leftAt" IS NULL OR "joinedAt" IS NULL OR "leftAt" >= "joinedAt")
);

CREATE UNIQUE INDEX "CallSession_providerRoomId_key" ON "CallSession"("providerRoomId");
CREATE INDEX "CallSession_conversationId_startedAt_idx" ON "CallSession"("conversationId", "startedAt");
CREATE INDEX "CallSession_initiatorId_status_startedAt_idx" ON "CallSession"("initiatorId", "status", "startedAt");
CREATE INDEX "CallSession_status_startedAt_idx" ON "CallSession"("status", "startedAt");
CREATE UNIQUE INDEX "CallSession_one_live_per_conversation_idx" ON "CallSession"("conversationId") WHERE "status" IN ('RINGING', 'ACTIVE');
CREATE UNIQUE INDEX "CallParticipant_callSessionId_userId_key" ON "CallParticipant"("callSessionId", "userId");
CREATE INDEX "CallParticipant_userId_status_createdAt_idx" ON "CallParticipant"("userId", "status", "createdAt");

ALTER TABLE "CallSession" ADD CONSTRAINT "CallSession_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CallSession" ADD CONSTRAINT "CallSession_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CallParticipant" ADD CONSTRAINT "CallParticipant_callSessionId_fkey" FOREIGN KEY ("callSessionId") REFERENCES "CallSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CallParticipant" ADD CONSTRAINT "CallParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION "check_call_participant_invariants"()
RETURNS TRIGGER AS $$
DECLARE checked_id TEXT; previous_id TEXT;
BEGIN
  IF TG_TABLE_NAME = 'CallSession' THEN checked_id := NEW."id";
  ELSIF TG_OP = 'DELETE' THEN checked_id := OLD."callSessionId";
  ELSE checked_id := NEW."callSessionId"; previous_id := OLD."callSessionId";
  END IF;

  IF EXISTS (
    SELECT 1 FROM "CallSession" call
    WHERE call."id" IN (checked_id, previous_id)
      AND (
        (SELECT count(*) FROM "CallParticipant" p WHERE p."callSessionId" = call."id" AND p."role" = 'HOST') <> 1
        OR NOT EXISTS (SELECT 1 FROM "CallParticipant" p WHERE p."callSessionId" = call."id" AND p."userId" = call."initiatorId" AND p."role" = 'HOST')
      )
  ) THEN RAISE EXCEPTION 'Call requires exactly one host matching initiator' USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER "CallSession_participant_invariant"
AFTER INSERT OR UPDATE OF "initiatorId" ON "CallSession"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_call_participant_invariants"();

CREATE CONSTRAINT TRIGGER "CallParticipant_participant_invariant"
AFTER INSERT OR UPDATE OF "callSessionId", "userId", "role" OR DELETE ON "CallParticipant"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_call_participant_invariants"();
