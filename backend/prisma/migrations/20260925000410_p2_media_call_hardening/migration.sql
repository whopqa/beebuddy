-- P2 forward hardening: keep calls consistent with conversation lifecycle and
-- require message attachments to match their declared media type.

CREATE OR REPLACE FUNCTION "check_message_attachment_invariants"()
RETURNS TRIGGER AS $$
DECLARE checked_id TEXT; previous_id TEXT;
BEGIN
  IF TG_TABLE_NAME = 'Message' THEN checked_id := NEW."id";
  ELSIF TG_OP = 'DELETE' THEN checked_id := OLD."messageId";
  ELSE checked_id := NEW."messageId"; previous_id := OLD."messageId";
  END IF;

  IF EXISTS (
    SELECT 1 FROM "Message" m
    WHERE m."id" IN (checked_id, previous_id) AND m."deletedAt" IS NULL
      AND m."type" IN ('IMAGE', 'VIDEO', 'VOICE', 'FILE')
      AND NOT EXISTS (SELECT 1 FROM "MessageAttachment" a WHERE a."messageId" = m."id")
  ) THEN RAISE EXCEPTION 'Media message requires at least one attachment' USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "Message" m
    JOIN "MessageAttachment" a ON a."messageId" = m."id"
    JOIN "MediaAsset" asset ON asset."id" = a."mediaAssetId"
    WHERE m."id" IN (checked_id, previous_id)
      AND ((m."type" = 'IMAGE' AND asset."mimeType" NOT LIKE 'image/%')
        OR (m."type" = 'VIDEO' AND asset."mimeType" NOT LIKE 'video/%')
        OR (m."type" = 'VOICE' AND (asset."mimeType" NOT LIKE 'audio/%' OR asset."durationMs" IS NULL)))
  ) THEN RAISE EXCEPTION 'Message attachment mime type does not match message type' USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER "Message_attachment_invariant"
AFTER INSERT OR UPDATE OF "type", "deletedAt" ON "Message"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_message_attachment_invariants"();
CREATE CONSTRAINT TRIGGER "MessageAttachment_attachment_invariant"
AFTER INSERT OR UPDATE OF "messageId", "mediaAssetId" OR DELETE ON "MessageAttachment"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_message_attachment_invariants"();

CREATE OR REPLACE FUNCTION "end_calls_for_deleted_conversation"()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD."deletedAt" IS NULL AND NEW."deletedAt" IS NOT NULL THEN
    UPDATE "CallParticipant" p SET "status" = 'LEFT', "leftAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
    FROM "CallSession" c WHERE p."callSessionId" = c."id" AND c."conversationId" = NEW."id" AND p."status" IN ('INVITED', 'JOINED');
    UPDATE "CallSession" SET "status" = 'ENDED', "endedAt" = CURRENT_TIMESTAMP, "endReason" = 'CONVERSATION_CLOSED', "updatedAt" = CURRENT_TIMESTAMP
    WHERE "conversationId" = NEW."id" AND "status" IN ('RINGING', 'ACTIVE');
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "Conversation_end_live_calls" AFTER UPDATE OF "deletedAt" ON "Conversation"
FOR EACH ROW EXECUTE FUNCTION "end_calls_for_deleted_conversation"();
