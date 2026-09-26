-- BeeBuddy Database V2 / P0 / M5: versioned plans, subscriptions,
-- data-driven entitlements and idempotent payment webhook events.

ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'REFUNDED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_REFUNDED';

CREATE TYPE "BillingPeriod" AS ENUM ('NONE', 'MONTHLY', 'ANNUAL');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED');
CREATE TYPE "SubscriptionSource" AS ENUM ('PAYOS', 'IN_APP', 'ADMIN', 'PROMOTION');
CREATE TYPE "PaymentProvider" AS ENUM ('PAYOS', 'GOOGLE_PLAY', 'APPLE', 'MANUAL');
CREATE TYPE "EntitlementSourceType" AS ENUM ('SUBSCRIPTION', 'PROMOTION', 'ADMIN', 'BETA');
CREATE TYPE "WebhookProcessingStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'FAILED', 'IGNORED');

CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "tier" "SubscriptionTier" NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "billingPeriod" "BillingPeriod" NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Feature" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "valueType" TEXT NOT NULL DEFAULT 'BOOLEAN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Feature_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlanFeature" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "limitValue" INTEGER,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlanFeature_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "source" "SubscriptionSource" NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EntitlementGrant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "sourceType" "EntitlementSourceType" NOT NULL,
    "sourceId" TEXT,
    "value" JSONB,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EntitlementGrant_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Payment"
    ADD COLUMN "planId" TEXT,
    ADD COLUMN "subscriptionId" TEXT,
    ADD COLUMN "provider" "PaymentProvider" NOT NULL DEFAULT 'PAYOS',
    ADD COLUMN "providerOrderId" TEXT,
    ADD COLUMN "providerTransactionId" TEXT,
    ADD COLUMN "idempotencyKey" TEXT,
    ADD COLUMN "refundedAt" TIMESTAMP(3);

CREATE TABLE "PaymentWebhookEvent" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT,
    "provider" "PaymentProvider" NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "rawPayload" JSONB NOT NULL,
    "signatureValid" BOOLEAN NOT NULL,
    "processingStatus" "WebhookProcessingStatus" NOT NULL DEFAULT 'RECEIVED',
    "processedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Plan_code_version_key" ON "Plan"("code", "version");
CREATE INDEX "Plan_tier_isActive_version_idx" ON "Plan"("tier", "isActive", "version");
CREATE UNIQUE INDEX "Feature_code_key" ON "Feature"("code");
CREATE UNIQUE INDEX "PlanFeature_planId_featureId_key" ON "PlanFeature"("planId", "featureId");
CREATE INDEX "PlanFeature_featureId_enabled_idx" ON "PlanFeature"("featureId", "enabled");
CREATE INDEX "Subscription_userId_status_currentPeriodEnd_idx" ON "Subscription"("userId", "status", "currentPeriodEnd");
CREATE INDEX "Subscription_planId_status_idx" ON "Subscription"("planId", "status");
CREATE UNIQUE INDEX "Subscription_one_active_per_user_key" ON "Subscription"("userId") WHERE "status" = 'ACTIVE';
CREATE INDEX "EntitlementGrant_userId_featureId_revokedAt_expiresAt_idx" ON "EntitlementGrant"("userId", "featureId", "revokedAt", "expiresAt");
CREATE INDEX "EntitlementGrant_sourceType_sourceId_idx" ON "EntitlementGrant"("sourceType", "sourceId");
CREATE UNIQUE INDEX "Payment_provider_providerOrderId_key" ON "Payment"("provider", "providerOrderId");
CREATE UNIQUE INDEX "Payment_providerTransactionId_key" ON "Payment"("providerTransactionId");
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");
CREATE INDEX "Payment_userId_status_createdAt_idx" ON "Payment"("userId", "status", "createdAt");
CREATE INDEX "Payment_planId_status_createdAt_idx" ON "Payment"("planId", "status", "createdAt");
CREATE UNIQUE INDEX "PaymentWebhookEvent_provider_providerEventId_key" ON "PaymentWebhookEvent"("provider", "providerEventId");
CREATE INDEX "PaymentWebhookEvent_processingStatus_createdAt_idx" ON "PaymentWebhookEvent"("processingStatus", "createdAt");
CREATE INDEX "PaymentWebhookEvent_paymentId_createdAt_idx" ON "PaymentWebhookEvent"("paymentId", "createdAt");

ALTER TABLE "PlanFeature" ADD CONSTRAINT "PlanFeature_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlanFeature" ADD CONSTRAINT "PlanFeature_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "Feature"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EntitlementGrant" ADD CONSTRAINT "EntitlementGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EntitlementGrant" ADD CONSTRAINT "EntitlementGrant_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "Feature"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed versioned plans and capability catalog before backfilling subscriptions/payments.
INSERT INTO "Plan" ("id", "code", "tier", "displayName", "description", "billingPeriod", "price", "currency", "version", "createdAt", "updatedAt") VALUES
    (md5('plan:FREE:1'), 'FREE', 'FREE', 'Gói Cơ Bản (Free)', 'Khám phá và kết nối cơ bản', 'NONE', 0, 'VND', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (md5('plan:VIP:1'), 'VIP', 'VIP', 'Gói VIP BeeBuddy', 'Mở rộng kết nối và cộng đồng', 'MONTHLY', 49000, 'VND', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (md5('plan:PRO:1'), 'PRO', 'PRO', 'Gói PRO Không Giới Hạn', 'Toàn bộ tính năng nâng cao', 'MONTHLY', 99000, 'VND', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "Feature" ("id", "code", "displayName", "valueType", "createdAt", "updatedAt") VALUES
    (md5('feature:community.create'), 'community.create', 'Tạo community', 'BOOLEAN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (md5('feature:community.max_owned'), 'community.max_owned', 'Số community sở hữu tối đa', 'INTEGER', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (md5('feature:community.max_joined'), 'community.max_joined', 'Số community tham gia tối đa', 'INTEGER', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (md5('feature:group_chat.create'), 'group_chat.create', 'Tạo group chat', 'BOOLEAN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (md5('feature:group_chat.max_members'), 'group_chat.max_members', 'Số thành viên group chat tối đa', 'INTEGER', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (md5('feature:profile.extended_visibility'), 'profile.extended_visibility', 'Tuỳ chỉnh quyền riêng tư mở rộng', 'BOOLEAN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (md5('feature:voice_message.send'), 'voice_message.send', 'Gửi tin nhắn thoại', 'BOOLEAN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (md5('feature:video_call.hd'), 'video_call.hd', 'Gọi video HD', 'BOOLEAN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "PlanFeature" ("id", "planId", "featureId", "enabled", "limitValue", "createdAt", "updatedAt")
SELECT
    md5('plan-feature:' || p."code" || ':' || f."code"),
    p."id",
    f."id",
    CASE
        WHEN p."code" = 'PRO' THEN true
        WHEN p."code" = 'VIP' AND f."code" <> 'video_call.hd' THEN true
        WHEN p."code" = 'FREE' AND f."code" = 'community.max_joined' THEN true
        ELSE false
    END,
    CASE
        WHEN f."code" = 'community.max_owned' AND p."code" = 'FREE' THEN 0
        WHEN f."code" = 'community.max_owned' AND p."code" = 'VIP' THEN 5
        WHEN f."code" = 'community.max_joined' AND p."code" = 'FREE' THEN 2
        WHEN f."code" = 'community.max_joined' AND p."code" = 'VIP' THEN 20
        WHEN f."code" = 'group_chat.max_members' AND p."code" = 'VIP' THEN 50
        ELSE NULL
    END,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Plan" p CROSS JOIN "Feature" f;

INSERT INTO "Subscription" (
    "id", "userId", "planId", "status", "source", "startsAt",
    "currentPeriodStart", "currentPeriodEnd", "createdAt", "updatedAt"
)
SELECT
    md5('subscription:' || u."id"),
    u."id",
    p."id",
    'ACTIVE'::"SubscriptionStatus",
    'ADMIN'::"SubscriptionSource",
    u."createdAt",
    u."createdAt",
    u."tierExpiresAt",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "User" u
JOIN "Plan" p ON p."tier" = u."tier" AND p."version" = 1;

UPDATE "Payment" payment
SET
    "planId" = (
        SELECT plan."id" FROM "Plan" plan
        WHERE plan."tier" = payment."tier" AND plan."version" = 1
    ),
    "subscriptionId" = (
        SELECT subscription."id"
        FROM "Subscription" subscription
        JOIN "Plan" plan ON plan."id" = subscription."planId"
        WHERE subscription."userId" = payment."userId" AND plan."tier" = payment."tier"
        LIMIT 1
    ),
    "provider" = CASE
        WHEN upper(payment."paymentMethod") LIKE 'PAYOS%' THEN 'PAYOS'::"PaymentProvider"
        ELSE 'MANUAL'::"PaymentProvider"
    END,
    "providerOrderId" = payment."orderCode"::text,
    "providerTransactionId" = payment."transactionRef",
    "idempotencyKey" = 'legacy:' || payment."id";

ALTER TABLE "Payment" ALTER COLUMN "planId" SET NOT NULL;
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_userId_fkey";
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentWebhookEvent" ADD CONSTRAINT "PaymentWebhookEvent_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
