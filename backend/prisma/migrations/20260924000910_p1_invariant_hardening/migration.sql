-- P1 forward-only hardening after staging verification.

ALTER TABLE "Community"
  ADD CONSTRAINT "Community_name_not_blank_check" CHECK (length(trim("name")) > 0),
  ADD CONSTRAINT "Community_members_count_check" CHECK ("membersCount" >= 0);

ALTER TABLE "CommunityInvite"
  ADD CONSTRAINT "CommunityInvite_token_hash_shape_check" CHECK (length("tokenHash") = 64);

ALTER TABLE "Conversation"
  ADD CONSTRAINT "Conversation_group_title_check" CHECK (
    "type" <> 'GROUP' OR ("title" IS NOT NULL AND length(trim("title")) > 0)
  );

ALTER TABLE "Message"
  ADD CONSTRAINT "Message_user_client_id_check" CHECK (
    "senderType" <> 'USER' OR ("clientMessageId" IS NOT NULL AND length(trim("clientMessageId")) > 0)
  );

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_actor_not_recipient_check" CHECK ("actorId" IS NULL OR "actorId" <> "recipientId");

ALTER TABLE "DevicePushToken"
  ADD CONSTRAINT "DevicePushToken_hash_shape_check" CHECK (length("tokenHash") = 64),
  ADD CONSTRAINT "DevicePushToken_ciphertext_shape_check" CHECK ("encryptedToken" LIKE 'v1:%');

ALTER TABLE "OutboxEvent"
  ADD CONSTRAINT "OutboxEvent_processed_state_check" CHECK (
    ("status" = 'PROCESSED' AND "processedAt" IS NOT NULL)
    OR ("status" <> 'PROCESSED' AND "processedAt" IS NULL)
  );
