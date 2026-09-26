-- BeeBuddy Database V2 / P0 / M3: canonical social graph.
-- Legacy userId/targetId remain during the dual-write compatibility window.

CREATE TYPE "ConnectionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');

-- Self-connections are invalid and cannot be assigned a canonical pair.
DELETE FROM "Connection" WHERE "userId" = "targetId";

ALTER TABLE "Connection"
    ADD COLUMN "requesterId" TEXT,
    ADD COLUMN "addresseeId" TEXT,
    ADD COLUMN "pairKey" TEXT,
    ADD COLUMN "requestedAt" TIMESTAMP(3),
    ADD COLUMN "respondedAt" TIMESTAMP(3),
    ADD COLUMN "endedAt" TIMESTAMP(3),
    ADD COLUMN "updatedAt" TIMESTAMP(3);

ALTER TABLE "Connection" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Connection"
    ALTER COLUMN "status" TYPE "ConnectionStatus"
    USING CASE upper("status")
        WHEN 'PENDING' THEN 'PENDING'::"ConnectionStatus"
        WHEN 'REJECTED' THEN 'REJECTED'::"ConnectionStatus"
        WHEN 'CANCELLED' THEN 'CANCELLED'::"ConnectionStatus"
        ELSE 'ACCEPTED'::"ConnectionStatus"
    END;
ALTER TABLE "Connection" ALTER COLUMN "status" SET DEFAULT 'PENDING';

UPDATE "Connection"
SET
    "requesterId" = "userId",
    "addresseeId" = "targetId",
    "pairKey" = LEAST("userId", "targetId") || ':' || GREATEST("userId", "targetId"),
    "requestedAt" = "createdAt",
    "respondedAt" = CASE
        WHEN "status" IN ('ACCEPTED', 'REJECTED') THEN "createdAt"
        ELSE NULL
    END,
    "endedAt" = CASE
        WHEN "status" = 'CANCELLED' THEN "createdAt"
        ELSE NULL
    END,
    "updatedAt" = "createdAt";

-- Merge reverse duplicate rows deterministically. Prefer an accepted relationship,
-- then the earliest request, so each unordered user pair has one lifecycle row.
WITH ranked AS (
    SELECT
        "id",
        row_number() OVER (
            PARTITION BY "pairKey"
            ORDER BY
                CASE "status"
                    WHEN 'ACCEPTED' THEN 0
                    WHEN 'PENDING' THEN 1
                    WHEN 'REJECTED' THEN 2
                    ELSE 3
                END,
                "createdAt",
                "id"
        ) AS row_number
    FROM "Connection"
)
DELETE FROM "Connection" c
USING ranked r
WHERE c."id" = r."id" AND r.row_number > 1;

ALTER TABLE "Connection"
    ALTER COLUMN "requesterId" SET NOT NULL,
    ALTER COLUMN "addresseeId" SET NOT NULL,
    ALTER COLUMN "pairKey" SET NOT NULL,
    ALTER COLUMN "requestedAt" SET NOT NULL,
    ALTER COLUMN "requestedAt" SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN "updatedAt" SET NOT NULL;

CREATE UNIQUE INDEX "Connection_pairKey_key" ON "Connection"("pairKey");
CREATE INDEX "Connection_requesterId_status_requestedAt_idx" ON "Connection"("requesterId", "status", "requestedAt");
CREATE INDEX "Connection_addresseeId_status_requestedAt_idx" ON "Connection"("addresseeId", "status", "requestedAt");
CREATE INDEX "Connection_status_updatedAt_idx" ON "Connection"("status", "updatedAt");

ALTER TABLE "Connection" ADD CONSTRAINT "Connection_requesterId_fkey"
    FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_addresseeId_fkey"
    FOREIGN KEY ("addresseeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_distinct_users_check"
    CHECK ("requesterId" <> "addresseeId");
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_pair_key_canonical_check"
    CHECK ("pairKey" = LEAST("requesterId", "addresseeId") || ':' || GREATEST("requesterId", "addresseeId"));

CREATE TABLE "Follow" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Follow_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Follow_distinct_users_check" CHECK ("followerId" <> "followingId")
);

CREATE UNIQUE INDEX "Follow_followerId_followingId_key" ON "Follow"("followerId", "followingId");
CREATE INDEX "Follow_followingId_createdAt_idx" ON "Follow"("followingId", "createdAt");
CREATE INDEX "Follow_followerId_createdAt_idx" ON "Follow"("followerId", "createdAt");
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey"
    FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followingId_fkey"
    FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "UserBlock" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserBlock_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "UserBlock_distinct_users_check" CHECK ("blockerId" <> "blockedId")
);

CREATE UNIQUE INDEX "UserBlock_blockerId_blockedId_key" ON "UserBlock"("blockerId", "blockedId");
CREATE INDEX "UserBlock_blockedId_createdAt_idx" ON "UserBlock"("blockedId", "createdAt");
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockerId_fkey"
    FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockedId_fkey"
    FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
