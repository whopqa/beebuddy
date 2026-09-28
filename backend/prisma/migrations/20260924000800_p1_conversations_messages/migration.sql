-- BeeBuddy P1 / M8: direct/group/AI conversations, text messaging,
-- reconnect idempotency, attachments, reactions and read state.

CREATE TYPE "ConversationType" AS ENUM ('DIRECT', 'GROUP', 'AI');
CREATE TYPE "ConversationMemberRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');
CREATE TYPE "ConversationMemberStatus" AS ENUM ('ACTIVE', 'LEFT', 'REMOVED');
CREATE TYPE "MessageSenderType" AS ENUM ('USER', 'SYSTEM', 'ASSISTANT');
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'VOICE', 'FILE', 'SYSTEM');

CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "type" "ConversationType" NOT NULL,
    "communityId" TEXT,
    "directPairKey" TEXT,
    "title" TEXT,
    "avatarMediaId" TEXT,
    "createdByUserId" TEXT,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Conversation_type_shape_check" CHECK (
        ("type" = 'DIRECT' AND "directPairKey" IS NOT NULL AND "communityId" IS NULL)
        OR ("type" IN ('GROUP', 'AI') AND "directPairKey" IS NULL)
    )
);

CREATE TABLE "ConversationMember" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ConversationMemberRole" NOT NULL DEFAULT 'MEMBER',
    "status" "ConversationMemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "lastReadMessageId" TEXT,
    "lastReadAt" TIMESTAMP(3),
    "mutedUntil" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ConversationMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderType" "MessageSenderType" NOT NULL DEFAULT 'USER',
    "senderUserId" TEXT,
    "type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "body" TEXT,
    "replyToMessageId" TEXT,
    "clientMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "Message_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Message_sender_shape_check" CHECK (
        ("senderType" = 'USER' AND "senderUserId" IS NOT NULL)
        OR ("senderType" IN ('SYSTEM', 'ASSISTANT'))
    ),
    CONSTRAINT "Message_content_check" CHECK (
        "type" <> 'TEXT' OR ("body" IS NOT NULL AND length(trim("body")) > 0)
    ),
    CONSTRAINT "Message_reply_not_self_check" CHECK ("replyToMessageId" IS NULL OR "replyToMessageId" <> "id")
);

CREATE TABLE "MessageAttachment" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "mediaAssetId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MessageAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MessageReaction" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ReactionType" NOT NULL DEFAULT 'LIKE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MessageReaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MessageReadReceipt" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MessageReadReceipt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Conversation_directPairKey_key" ON "Conversation"("directPairKey");
CREATE INDEX "Conversation_communityId_type_updatedAt_idx" ON "Conversation"("communityId", "type", "updatedAt");
CREATE INDEX "Conversation_createdByUserId_type_updatedAt_idx" ON "Conversation"("createdByUserId", "type", "updatedAt");
CREATE INDEX "Conversation_lastMessageAt_id_idx" ON "Conversation"("lastMessageAt", "id");
CREATE UNIQUE INDEX "ConversationMember_conversationId_userId_key" ON "ConversationMember"("conversationId", "userId");
CREATE INDEX "ConversationMember_userId_status_updatedAt_idx" ON "ConversationMember"("userId", "status", "updatedAt");
CREATE INDEX "ConversationMember_conversationId_role_status_idx" ON "ConversationMember"("conversationId", "role", "status");
CREATE UNIQUE INDEX "Message_conversationId_senderUserId_clientMessageId_key" ON "Message"("conversationId", "senderUserId", "clientMessageId");
CREATE INDEX "Message_conversationId_createdAt_id_idx" ON "Message"("conversationId", "createdAt", "id");
CREATE INDEX "Message_senderUserId_createdAt_idx" ON "Message"("senderUserId", "createdAt");
CREATE INDEX "Message_replyToMessageId_idx" ON "Message"("replyToMessageId");
CREATE UNIQUE INDEX "MessageAttachment_messageId_mediaAssetId_key" ON "MessageAttachment"("messageId", "mediaAssetId");
CREATE UNIQUE INDEX "MessageAttachment_messageId_sortOrder_key" ON "MessageAttachment"("messageId", "sortOrder");
CREATE INDEX "MessageAttachment_mediaAssetId_idx" ON "MessageAttachment"("mediaAssetId");
CREATE UNIQUE INDEX "MessageReaction_messageId_userId_key" ON "MessageReaction"("messageId", "userId");
CREATE INDEX "MessageReaction_userId_createdAt_idx" ON "MessageReaction"("userId", "createdAt");
CREATE UNIQUE INDEX "MessageReadReceipt_messageId_userId_key" ON "MessageReadReceipt"("messageId", "userId");
CREATE INDEX "MessageReadReceipt_userId_readAt_idx" ON "MessageReadReceipt"("userId", "readAt");

ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_avatarMediaId_fkey" FOREIGN KEY ("avatarMediaId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ConversationMember" ADD CONSTRAINT "ConversationMember_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConversationMember" ADD CONSTRAINT "ConversationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_replyToMessageId_fkey" FOREIGN KEY ("replyToMessageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ConversationMember" ADD CONSTRAINT "ConversationMember_lastReadMessageId_fkey" FOREIGN KEY ("lastReadMessageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MessageAttachment" ADD CONSTRAINT "MessageAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageAttachment" ADD CONSTRAINT "MessageAttachment_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageReadReceipt" ADD CONSTRAINT "MessageReadReceipt_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageReadReceipt" ADD CONSTRAINT "MessageReadReceipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION "check_conversation_membership_invariants"()
RETURNS TRIGGER AS $$
DECLARE
    checked_id TEXT;
    previous_id TEXT;
BEGIN
    IF TG_TABLE_NAME = 'Conversation' THEN
        checked_id := NEW."id";
    ELSIF TG_OP = 'DELETE' THEN
        checked_id := OLD."conversationId";
    ELSE
        checked_id := NEW."conversationId";
        previous_id := OLD."conversationId";
    END IF;

    IF EXISTS (
        SELECT 1 FROM "Conversation" conversation
        WHERE conversation."id" IN (checked_id, previous_id)
          AND conversation."deletedAt" IS NULL
          AND conversation."type" = 'DIRECT'
          AND (
              (SELECT count(*) FROM "ConversationMember" member
               WHERE member."conversationId" = conversation."id" AND member."status" = 'ACTIVE') <> 2
              OR conversation."directPairKey" <> (
                  SELECT min(member."userId") || ':' || max(member."userId")
                  FROM "ConversationMember" member
                  WHERE member."conversationId" = conversation."id" AND member."status" = 'ACTIVE'
              )
          )
    ) THEN
        RAISE EXCEPTION 'DIRECT conversation requires exactly two active members matching directPairKey'
            USING ERRCODE = '23514';
    END IF;

    IF EXISTS (
        SELECT 1 FROM "Conversation" conversation
        WHERE conversation."id" IN (checked_id, previous_id)
          AND conversation."deletedAt" IS NULL
          AND conversation."type" = 'GROUP'
          AND (SELECT count(*) FROM "ConversationMember" member
               WHERE member."conversationId" = conversation."id"
                 AND member."status" = 'ACTIVE' AND member."role" = 'OWNER') <> 1
    ) THEN
        RAISE EXCEPTION 'GROUP conversation requires exactly one active owner'
            USING ERRCODE = '23514';
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER "Conversation_member_invariant"
AFTER INSERT OR UPDATE OF "type", "directPairKey", "deletedAt" ON "Conversation"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "check_conversation_membership_invariants"();

CREATE CONSTRAINT TRIGGER "ConversationMember_member_invariant"
AFTER INSERT OR UPDATE OF "conversationId", "userId", "role", "status" OR DELETE ON "ConversationMember"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "check_conversation_membership_invariants"();

CREATE OR REPLACE FUNCTION "check_message_conversation_links"()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."replyToMessageId" IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM "Message" reply
        WHERE reply."id" = NEW."replyToMessageId" AND reply."conversationId" = NEW."conversationId"
    ) THEN
        RAISE EXCEPTION 'Reply target must belong to the same conversation' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Message_same_conversation_reply"
BEFORE INSERT OR UPDATE OF "conversationId", "replyToMessageId" ON "Message"
FOR EACH ROW EXECUTE FUNCTION "check_message_conversation_links"();

CREATE OR REPLACE FUNCTION "touch_conversation_last_message"()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE "Conversation" SET "lastMessageAt" = NEW."createdAt" WHERE "id" = NEW."conversationId";
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Message_touch_conversation"
AFTER INSERT ON "Message"
FOR EACH ROW EXECUTE FUNCTION "touch_conversation_last_message"();

CREATE OR REPLACE FUNCTION "apply_user_block_social_cleanup"()
RETURNS TRIGGER AS $$
DECLARE
    pair_key TEXT;
BEGIN
    pair_key := LEAST(NEW."blockerId", NEW."blockedId") || ':' || GREATEST(NEW."blockerId", NEW."blockedId");
    DELETE FROM "Follow"
    WHERE ("followerId" = NEW."blockerId" AND "followingId" = NEW."blockedId")
       OR ("followerId" = NEW."blockedId" AND "followingId" = NEW."blockerId");
    UPDATE "Connection"
    SET "status" = 'CANCELLED', "endedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "pairKey" = pair_key AND "status" IN ('PENDING', 'ACCEPTED');
    UPDATE "Conversation"
    SET "deletedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "directPairKey" = pair_key AND "deletedAt" IS NULL;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "UserBlock_cleanup_social_graph"
AFTER INSERT ON "UserBlock"
FOR EACH ROW EXECUTE FUNCTION "apply_user_block_social_cleanup"();
