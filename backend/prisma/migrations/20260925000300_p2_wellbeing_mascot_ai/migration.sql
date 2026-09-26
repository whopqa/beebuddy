-- BeeBuddy P2 / M12: wellbeing activity, habit tracking and consented Mascot memory.

CREATE TYPE "MoodValue" AS ENUM ('VERY_LOW', 'LOW', 'NEUTRAL', 'GOOD', 'GREAT');
CREATE TYPE "HabitRoutineFrequency" AS ENUM ('DAILY', 'WEEKLY', 'CUSTOM');
CREATE TYPE "HabitCompletionSource" AS ENUM ('USER', 'SYSTEM', 'IMPORT');
CREATE TYPE "MascotSuggestionType" AS ENUM ('CHECK_IN', 'HABIT', 'SOCIAL', 'CONTENT');
CREATE TYPE "MascotSuggestionStatus" AS ENUM ('PENDING', 'SEEN', 'ACCEPTED', 'DISMISSED', 'EXPIRED');
CREATE TYPE "MascotMemoryCategory" AS ENUM ('PREFERENCE', 'GOAL', 'WELLBEING', 'CONTEXT');
CREATE TYPE "MascotMemorySourceType" AS ENUM ('USER_EXPLICIT', 'CONVERSATION', 'MOOD_CHECK_IN', 'HABIT');
CREATE TYPE "AiExecutionStatus" AS ENUM ('SUCCESS', 'FAILED', 'BLOCKED');

CREATE TABLE "MoodCheckIn" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "mood" "MoodValue" NOT NULL,
  "energyLevel" INTEGER NOT NULL, "note" TEXT, "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MoodCheckIn_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MoodCheckIn_energy_check" CHECK ("energyLevel" BETWEEN 1 AND 5),
  CONSTRAINT "MoodCheckIn_note_length_check" CHECK ("note" IS NULL OR length("note") <= 2000)
);

CREATE TABLE "HabitRoutine" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "habitId" TEXT, "name" TEXT NOT NULL,
  "frequency" "HabitRoutineFrequency" NOT NULL, "schedule" JSONB NOT NULL, "timezone" TEXT NOT NULL,
  "targetValue" DOUBLE PRECISION NOT NULL DEFAULT 1, "unit" TEXT NOT NULL DEFAULT 'times',
  "isActive" BOOLEAN NOT NULL DEFAULT true, "startsOn" DATE NOT NULL, "endsOn" DATE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HabitRoutine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "HabitRoutine_name_check" CHECK (length(trim("name")) > 0),
  CONSTRAINT "HabitRoutine_schedule_object_check" CHECK (jsonb_typeof("schedule") = 'object'),
  CONSTRAINT "HabitRoutine_target_check" CHECK ("targetValue" > 0),
  CONSTRAINT "HabitRoutine_dates_check" CHECK ("endsOn" IS NULL OR "endsOn" >= "startsOn")
);

CREATE TABLE "HabitCompletion" (
  "id" TEXT NOT NULL, "routineId" TEXT NOT NULL, "userId" TEXT NOT NULL, "localDate" DATE NOT NULL,
  "value" DOUBLE PRECISION NOT NULL DEFAULT 1, "source" "HabitCompletionSource" NOT NULL DEFAULT 'USER',
  "note" TEXT, "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HabitCompletion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "HabitCompletion_value_check" CHECK ("value" > 0)
);

CREATE TABLE "MascotSuggestion" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "type" "MascotSuggestionType" NOT NULL,
  "title" TEXT NOT NULL, "content" TEXT NOT NULL, "reason" TEXT, "payload" JSONB,
  "status" "MascotSuggestionStatus" NOT NULL DEFAULT 'PENDING', "seenAt" TIMESTAMP(3),
  "respondedAt" TIMESTAMP(3), "expiresAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MascotSuggestion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MascotSuggestion_content_check" CHECK (length(trim("title")) > 0 AND length(trim("content")) > 0),
  CONSTRAINT "MascotSuggestion_payload_object_check" CHECK ("payload" IS NULL OR jsonb_typeof("payload") = 'object')
);

CREATE TABLE "MascotMemory" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "category" "MascotMemoryCategory" NOT NULL,
  "summary" TEXT NOT NULL, "sourceType" "MascotMemorySourceType" NOT NULL, "sourceId" TEXT,
  "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1, "consentRecordedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "expiresAt" TIMESTAMP(3), "revokedAt" TIMESTAMP(3),
  CONSTRAINT "MascotMemory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MascotMemory_summary_check" CHECK (length(trim("summary")) BETWEEN 1 AND 2000),
  CONSTRAINT "MascotMemory_confidence_check" CHECK ("confidence" BETWEEN 0 AND 1),
  CONSTRAINT "MascotMemory_consent_check" CHECK ("consentRecordedAt" <= "createdAt"),
  CONSTRAINT "MascotMemory_expiry_check" CHECK ("expiresAt" IS NULL OR "expiresAt" > "createdAt")
);

CREATE TABLE "AiExecutionLog" (
  "id" TEXT NOT NULL, "userId" TEXT, "feature" TEXT NOT NULL, "provider" TEXT NOT NULL,
  "modelName" TEXT NOT NULL, "promptVersion" TEXT NOT NULL,
  "inputSafetyClassification" TEXT, "outputSafetyClassification" TEXT,
  "latencyMs" INTEGER, "inputTokens" INTEGER, "outputTokens" INTEGER,
  "estimatedCost" DECIMAL(12,6), "status" "AiExecutionStatus" NOT NULL,
  "errorCode" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiExecutionLog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AiExecutionLog_metrics_check" CHECK (
    ("latencyMs" IS NULL OR "latencyMs" >= 0) AND
    ("inputTokens" IS NULL OR "inputTokens" >= 0) AND
    ("outputTokens" IS NULL OR "outputTokens" >= 0) AND
    ("estimatedCost" IS NULL OR "estimatedCost" >= 0)
  )
);

CREATE INDEX "MoodCheckIn_userId_recordedAt_idx" ON "MoodCheckIn"("userId", "recordedAt");
CREATE INDEX "HabitRoutine_userId_isActive_createdAt_idx" ON "HabitRoutine"("userId", "isActive", "createdAt");
CREATE INDEX "HabitRoutine_habitId_isActive_idx" ON "HabitRoutine"("habitId", "isActive");
CREATE UNIQUE INDEX "HabitCompletion_routineId_localDate_key" ON "HabitCompletion"("routineId", "localDate");
CREATE INDEX "HabitCompletion_userId_localDate_idx" ON "HabitCompletion"("userId", "localDate");
CREATE INDEX "MascotSuggestion_userId_status_createdAt_idx" ON "MascotSuggestion"("userId", "status", "createdAt");
CREATE INDEX "MascotMemory_userId_revokedAt_expiresAt_createdAt_idx" ON "MascotMemory"("userId", "revokedAt", "expiresAt", "createdAt");
CREATE INDEX "MascotMemory_sourceType_sourceId_idx" ON "MascotMemory"("sourceType", "sourceId");
CREATE INDEX "AiExecutionLog_feature_status_createdAt_idx" ON "AiExecutionLog"("feature", "status", "createdAt");
CREATE INDEX "AiExecutionLog_userId_createdAt_idx" ON "AiExecutionLog"("userId", "createdAt");
CREATE UNIQUE INDEX "Conversation_one_active_ai_per_user_idx" ON "Conversation"("createdByUserId") WHERE "type" = 'AI' AND "deletedAt" IS NULL;

ALTER TABLE "MoodCheckIn" ADD CONSTRAINT "MoodCheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HabitRoutine" ADD CONSTRAINT "HabitRoutine_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HabitRoutine" ADD CONSTRAINT "HabitRoutine_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HabitCompletion" ADD CONSTRAINT "HabitCompletion_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "HabitRoutine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HabitCompletion" ADD CONSTRAINT "HabitCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MascotSuggestion" ADD CONSTRAINT "MascotSuggestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MascotMemory" ADD CONSTRAINT "MascotMemory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiExecutionLog" ADD CONSTRAINT "AiExecutionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION "check_habit_completion_owner"()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "HabitRoutine" r WHERE r."id" = NEW."routineId" AND r."userId" = NEW."userId") THEN
    RAISE EXCEPTION 'Habit completion user must own routine' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "HabitCompletion_owner_check" BEFORE INSERT OR UPDATE OF "routineId", "userId" ON "HabitCompletion"
FOR EACH ROW EXECUTE FUNCTION "check_habit_completion_owner"();

CREATE OR REPLACE FUNCTION "check_ai_conversation_membership"()
RETURNS TRIGGER AS $$
DECLARE checked_id TEXT; previous_id TEXT;
BEGIN
  IF TG_TABLE_NAME = 'Conversation' THEN checked_id := NEW."id";
  ELSIF TG_OP = 'DELETE' THEN checked_id := OLD."conversationId";
  ELSE checked_id := NEW."conversationId"; previous_id := OLD."conversationId";
  END IF;
  IF EXISTS (
    SELECT 1 FROM "Conversation" c WHERE c."id" IN (checked_id, previous_id)
      AND c."type" = 'AI' AND c."deletedAt" IS NULL
      AND (SELECT count(*) FROM "ConversationMember" m WHERE m."conversationId" = c."id" AND m."status" = 'ACTIVE') <> 1
  ) THEN RAISE EXCEPTION 'AI conversation requires exactly one active user member' USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
CREATE CONSTRAINT TRIGGER "Conversation_ai_member_invariant" AFTER INSERT OR UPDATE OF "type", "deletedAt" ON "Conversation"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_ai_conversation_membership"();
CREATE CONSTRAINT TRIGGER "ConversationMember_ai_member_invariant" AFTER INSERT OR UPDATE OF "conversationId", "status" OR DELETE ON "ConversationMember"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_ai_conversation_membership"();
