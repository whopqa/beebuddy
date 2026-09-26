-- Prisma DateTime maps to timestamp(3) without time zone in this project.
-- Force the database/session default to UTC and make trigger-generated values explicit.
DO $$
BEGIN
  EXECUTE format('ALTER DATABASE %I SET timezone TO %L', current_database(), 'UTC');
END $$;
SET TIME ZONE 'UTC';

CREATE OR REPLACE FUNCTION "end_calls_for_deleted_conversation"()
RETURNS TRIGGER AS $$
DECLARE utc_now TIMESTAMP(3) := (CURRENT_TIMESTAMP AT TIME ZONE 'UTC');
BEGIN
  IF OLD."deletedAt" IS NULL AND NEW."deletedAt" IS NOT NULL THEN
    UPDATE "CallParticipant" p SET "status" = 'LEFT', "leftAt" = utc_now, "updatedAt" = utc_now
    FROM "CallSession" c WHERE p."callSessionId" = c."id" AND c."conversationId" = NEW."id" AND p."status" IN ('INVITED', 'JOINED');
    UPDATE "CallSession" SET "status" = 'ENDED', "endedAt" = utc_now, "endReason" = 'CONVERSATION_CLOSED', "updatedAt" = utc_now
    WHERE "conversationId" = NEW."id" AND "status" IN ('RINGING', 'ACTIVE');
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "apply_user_block_social_cleanup"()
RETURNS TRIGGER AS $$
DECLARE
  pair_key TEXT;
  utc_now TIMESTAMP(3) := (CURRENT_TIMESTAMP AT TIME ZONE 'UTC');
BEGIN
  pair_key := LEAST(NEW."blockerId", NEW."blockedId") || ':' || GREATEST(NEW."blockerId", NEW."blockedId");
  DELETE FROM "Follow"
  WHERE ("followerId" = NEW."blockerId" AND "followingId" = NEW."blockedId")
     OR ("followerId" = NEW."blockedId" AND "followingId" = NEW."blockerId");
  UPDATE "Connection" SET "status" = 'CANCELLED', "endedAt" = utc_now, "updatedAt" = utc_now
  WHERE "pairKey" = pair_key AND "status" IN ('PENDING', 'ACCEPTED');
  UPDATE "Conversation" SET "deletedAt" = utc_now, "updatedAt" = utc_now
  WHERE "directPairKey" = pair_key AND "deletedAt" IS NULL;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
