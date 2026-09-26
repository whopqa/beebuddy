-- BeeBuddy Database V2 / P0 / M4: content lifecycle, audience, media and reactions.
-- Legacy Post.visibility/mediaUrls/likesCount remain during the compatibility window.

ALTER TYPE "PostVisibility" ADD VALUE IF NOT EXISTS 'CUSTOM';
ALTER TYPE "CommentStatus" ADD VALUE IF NOT EXISTS 'PENDING';
ALTER TYPE "CommentStatus" ADD VALUE IF NOT EXISTS 'REMOVED';

CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED', 'REMOVED');
CREATE TYPE "CommentPolicy" AS ENUM ('EVERYONE', 'CONNECTIONS', 'MENTIONED', 'DISABLED');
CREATE TYPE "MediaProcessingStatus" AS ENUM ('UPLOADING', 'PROCESSING', 'READY', 'FAILED', 'DELETED');
CREATE TYPE "ReactionType" AS ENUM ('LIKE', 'LOVE', 'SUPPORT', 'CELEBRATE', 'CURIOUS');
CREATE TYPE "ShareDestination" AS ENUM ('PROFILE', 'COMMUNITY', 'EXTERNAL');

ALTER TABLE "Post"
    ADD COLUMN "audience" "PostVisibility",
    ADD COLUMN "status" "PostStatus",
    ADD COLUMN "previewText" TEXT,
    ADD COLUMN "commentPolicy" "CommentPolicy",
    ADD COLUMN "publishedAt" TIMESTAMP(3),
    ADD COLUMN "deletedAt" TIMESTAMP(3);

UPDATE "Post"
SET
    "audience" = "visibility",
    "status" = 'PUBLISHED'::"PostStatus",
    "commentPolicy" = 'EVERYONE'::"CommentPolicy",
    "publishedAt" = "createdAt",
    "likesCount" = 0;

ALTER TABLE "Post"
    ALTER COLUMN "audience" SET NOT NULL,
    ALTER COLUMN "audience" SET DEFAULT 'PUBLIC',
    ALTER COLUMN "status" SET NOT NULL,
    ALTER COLUMN "status" SET DEFAULT 'PUBLISHED',
    ALTER COLUMN "commentPolicy" SET NOT NULL,
    ALTER COLUMN "commentPolicy" SET DEFAULT 'EVERYONE';

CREATE INDEX "Post_status_audience_publishedAt_id_idx" ON "Post"("status", "audience", "publishedAt", "id");
CREATE INDEX "Post_authorId_publishedAt_id_idx" ON "Post"("authorId", "publishedAt", "id");

ALTER TABLE "Comment"
    ADD COLUMN "parentCommentId" TEXT,
    ADD COLUMN "moderationState" TEXT,
    ADD COLUMN "editedAt" TIMESTAMP(3),
    ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "Comment_postId_parentCommentId_createdAt_id_idx" ON "Comment"("postId", "parentCommentId", "createdAt", "id");
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentCommentId_fkey"
    FOREIGN KEY ("parentCommentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parent_not_self_check"
    CHECK ("parentCommentId" IS NULL OR "parentCommentId" <> "id");

CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "storageProvider" TEXT NOT NULL,
    "bucket" TEXT NOT NULL DEFAULT '',
    "objectKey" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "mimeType" TEXT NOT NULL,
    "byteSize" BIGINT,
    "width" INTEGER,
    "height" INTEGER,
    "durationMs" INTEGER,
    "checksum" TEXT,
    "processingStatus" "MediaProcessingStatus" NOT NULL DEFAULT 'UPLOADING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PostMedia" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "mediaAssetId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "altText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PostMedia_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PostAudienceUser" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PostAudienceUser_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AudienceList" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AudienceList_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AudienceListMember" (
    "id" TEXT NOT NULL,
    "audienceListId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AudienceListMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PostAudienceList" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "audienceListId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PostAudienceList_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PostExcludedUser" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PostExcludedUser_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PostReaction" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ReactionType" NOT NULL DEFAULT 'LIKE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PostReaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommentReaction" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ReactionType" NOT NULL DEFAULT 'LIKE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CommentReaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PostBookmark" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PostBookmark_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PostShare" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "destination" "ShareDestination" NOT NULL,
    "targetRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PostShare_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MediaAsset_storageProvider_bucket_objectKey_key" ON "MediaAsset"("storageProvider", "bucket", "objectKey");
CREATE INDEX "MediaAsset_ownerId_processingStatus_createdAt_idx" ON "MediaAsset"("ownerId", "processingStatus", "createdAt");
CREATE UNIQUE INDEX "PostMedia_postId_mediaAssetId_key" ON "PostMedia"("postId", "mediaAssetId");
CREATE UNIQUE INDEX "PostMedia_postId_sortOrder_key" ON "PostMedia"("postId", "sortOrder");
CREATE INDEX "PostMedia_mediaAssetId_idx" ON "PostMedia"("mediaAssetId");
CREATE UNIQUE INDEX "PostAudienceUser_postId_userId_key" ON "PostAudienceUser"("postId", "userId");
CREATE INDEX "PostAudienceUser_userId_postId_idx" ON "PostAudienceUser"("userId", "postId");
CREATE UNIQUE INDEX "AudienceList_ownerId_name_key" ON "AudienceList"("ownerId", "name");
CREATE INDEX "AudienceList_ownerId_updatedAt_idx" ON "AudienceList"("ownerId", "updatedAt");
CREATE UNIQUE INDEX "AudienceListMember_audienceListId_userId_key" ON "AudienceListMember"("audienceListId", "userId");
CREATE INDEX "AudienceListMember_userId_audienceListId_idx" ON "AudienceListMember"("userId", "audienceListId");
CREATE UNIQUE INDEX "PostAudienceList_postId_audienceListId_key" ON "PostAudienceList"("postId", "audienceListId");
CREATE INDEX "PostAudienceList_audienceListId_postId_idx" ON "PostAudienceList"("audienceListId", "postId");
CREATE UNIQUE INDEX "PostExcludedUser_postId_userId_key" ON "PostExcludedUser"("postId", "userId");
CREATE INDEX "PostExcludedUser_userId_postId_idx" ON "PostExcludedUser"("userId", "postId");
CREATE UNIQUE INDEX "PostReaction_postId_userId_key" ON "PostReaction"("postId", "userId");
CREATE INDEX "PostReaction_userId_createdAt_idx" ON "PostReaction"("userId", "createdAt");
CREATE UNIQUE INDEX "CommentReaction_commentId_userId_key" ON "CommentReaction"("commentId", "userId");
CREATE INDEX "CommentReaction_userId_createdAt_idx" ON "CommentReaction"("userId", "createdAt");
CREATE UNIQUE INDEX "PostBookmark_postId_userId_key" ON "PostBookmark"("postId", "userId");
CREATE INDEX "PostBookmark_userId_createdAt_idx" ON "PostBookmark"("userId", "createdAt");
CREATE INDEX "PostShare_postId_createdAt_idx" ON "PostShare"("postId", "createdAt");
CREATE INDEX "PostShare_userId_createdAt_idx" ON "PostShare"("userId", "createdAt");

ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostMedia" ADD CONSTRAINT "PostMedia_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostMedia" ADD CONSTRAINT "PostMedia_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PostAudienceUser" ADD CONSTRAINT "PostAudienceUser_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostAudienceUser" ADD CONSTRAINT "PostAudienceUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AudienceList" ADD CONSTRAINT "AudienceList_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AudienceListMember" ADD CONSTRAINT "AudienceListMember_audienceListId_fkey" FOREIGN KEY ("audienceListId") REFERENCES "AudienceList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AudienceListMember" ADD CONSTRAINT "AudienceListMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostAudienceList" ADD CONSTRAINT "PostAudienceList_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostAudienceList" ADD CONSTRAINT "PostAudienceList_audienceListId_fkey" FOREIGN KEY ("audienceListId") REFERENCES "AudienceList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostExcludedUser" ADD CONSTRAINT "PostExcludedUser_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostExcludedUser" ADD CONSTRAINT "PostExcludedUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostReaction" ADD CONSTRAINT "PostReaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostReaction" ADD CONSTRAINT "PostReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommentReaction" ADD CONSTRAINT "CommentReaction_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommentReaction" ADD CONSTRAINT "CommentReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostBookmark" ADD CONSTRAINT "PostBookmark_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostBookmark" ADD CONSTRAINT "PostBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostShare" ADD CONSTRAINT "PostShare_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostShare" ADD CONSTRAINT "PostShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Convert every legacy URL into a reusable media fact while keeping mediaUrls for dual-read.
WITH media_source AS (
    SELECT
        p."id" AS post_id,
        p."authorId" AS owner_id,
        media.url,
        media.ordinality - 1 AS sort_order
    FROM "Post" p
    CROSS JOIN LATERAL unnest(p."mediaUrls") WITH ORDINALITY AS media(url, ordinality)
    WHERE trim(media.url) <> ''
)
INSERT INTO "MediaAsset" (
    "id", "ownerId", "storageProvider", "bucket", "objectKey", "sourceUrl",
    "mimeType", "processingStatus", "createdAt"
)
SELECT
    md5('media:' || post_id || ':' || sort_order::text || ':' || url),
    owner_id,
    'LEGACY_URL',
    '',
    'legacy/' || post_id || '/' || sort_order::text,
    url,
    'application/octet-stream',
    'READY'::"MediaProcessingStatus",
    CURRENT_TIMESTAMP
FROM media_source
ON CONFLICT ("storageProvider", "bucket", "objectKey") DO NOTHING;

INSERT INTO "PostMedia" ("id", "postId", "mediaAssetId", "sortOrder", "createdAt")
SELECT
    md5('post-media:' || p."id" || ':' || media.ordinality::text),
    p."id",
    asset."id",
    media.ordinality - 1,
    CURRENT_TIMESTAMP
FROM "Post" p
CROSS JOIN LATERAL unnest(p."mediaUrls") WITH ORDINALITY AS media(url, ordinality)
JOIN "MediaAsset" asset
  ON asset."storageProvider" = 'LEGACY_URL'
 AND asset."bucket" = ''
 AND asset."objectKey" = 'legacy/' || p."id" || '/' || (media.ordinality - 1)::text
WHERE trim(media.url) <> ''
ON CONFLICT ("postId", "sortOrder") DO NOTHING;

-- Enforce SELECTED audience at transaction commit so a post and its recipients
-- can be inserted in either order inside the same transaction.
CREATE OR REPLACE FUNCTION "check_selected_post_has_recipient"()
RETURNS TRIGGER AS $$
DECLARE
    checked_post_id TEXT;
    previous_post_id TEXT;
BEGIN
    IF TG_TABLE_NAME = 'Post' THEN
        checked_post_id := NEW."id";
    ELSIF TG_OP = 'DELETE' THEN
        checked_post_id := OLD."postId";
    ELSE
        checked_post_id := NEW."postId";
        previous_post_id := OLD."postId";
    END IF;
    IF EXISTS (
        SELECT 1
        FROM "Post" p
        WHERE p."id" IN (checked_post_id, previous_post_id)
          AND p."audience" = 'SELECTED'::"PostVisibility"
          AND p."status" <> 'REMOVED'::"PostStatus"
          AND NOT EXISTS (
              SELECT 1 FROM "PostAudienceUser" recipient WHERE recipient."postId" = p."id"
          )
    ) THEN
        RAISE EXCEPTION 'SELECTED post % requires at least one recipient', checked_post_id
            USING ERRCODE = '23514';
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER "Post_selected_audience_check"
AFTER INSERT OR UPDATE OF "audience", "status" ON "Post"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "check_selected_post_has_recipient"();

CREATE CONSTRAINT TRIGGER "PostAudienceUser_selected_audience_check"
AFTER DELETE OR UPDATE OF "postId" ON "PostAudienceUser"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "check_selected_post_has_recipient"();
