-- BeeBuddy P1 / M7: community, membership, join requests and invites.

CREATE TYPE "CommunityVisibility" AS ENUM ('PUBLIC', 'PRIVATE', 'INVITE_ONLY');
CREATE TYPE "CommunityStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'SUSPENDED', 'DELETED');
CREATE TYPE "CommunityJoinPolicy" AS ENUM ('OPEN', 'APPROVAL', 'INVITE_ONLY');
CREATE TYPE "CommunityMemberRole" AS ENUM ('OWNER', 'MODERATOR', 'MEMBER');
CREATE TYPE "CommunityMemberStatus" AS ENUM ('INVITED', 'ACTIVE', 'LEFT', 'REMOVED', 'BANNED');
CREATE TYPE "CommunityJoinRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED');
CREATE TYPE "CommunityInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'REVOKED', 'EXPIRED');

CREATE TABLE "Community" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "avatarMediaId" TEXT,
    "coverMediaId" TEXT,
    "visibility" "CommunityVisibility" NOT NULL DEFAULT 'PUBLIC',
    "status" "CommunityStatus" NOT NULL DEFAULT 'ACTIVE',
    "joinPolicy" "CommunityJoinPolicy" NOT NULL DEFAULT 'OPEN',
    "membersCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "Community_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommunityMember" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "CommunityMemberRole" NOT NULL DEFAULT 'MEMBER',
    "status" "CommunityMemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CommunityMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommunityJoinRequest" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "status" "CommunityJoinRequestStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CommunityJoinRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommunityInvite" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "inviteeId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "CommunityInviteStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CommunityInvite_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Post" ADD COLUMN "communityId" TEXT;

CREATE UNIQUE INDEX "Community_slug_key" ON "Community"("slug");
CREATE INDEX "Community_status_visibility_createdAt_idx" ON "Community"("status", "visibility", "createdAt");
CREATE INDEX "Community_ownerId_status_idx" ON "Community"("ownerId", "status");
CREATE UNIQUE INDEX "CommunityMember_communityId_userId_key" ON "CommunityMember"("communityId", "userId");
CREATE INDEX "CommunityMember_userId_status_joinedAt_idx" ON "CommunityMember"("userId", "status", "joinedAt");
CREATE INDEX "CommunityMember_communityId_role_status_idx" ON "CommunityMember"("communityId", "role", "status");
CREATE UNIQUE INDEX "CommunityJoinRequest_communityId_requesterId_key" ON "CommunityJoinRequest"("communityId", "requesterId");
CREATE INDEX "CommunityJoinRequest_communityId_status_createdAt_idx" ON "CommunityJoinRequest"("communityId", "status", "createdAt");
CREATE INDEX "CommunityJoinRequest_requesterId_status_createdAt_idx" ON "CommunityJoinRequest"("requesterId", "status", "createdAt");
CREATE UNIQUE INDEX "CommunityInvite_tokenHash_key" ON "CommunityInvite"("tokenHash");
CREATE UNIQUE INDEX "CommunityInvite_communityId_inviteeId_key" ON "CommunityInvite"("communityId", "inviteeId");
CREATE INDEX "CommunityInvite_inviteeId_status_expiresAt_idx" ON "CommunityInvite"("inviteeId", "status", "expiresAt");
CREATE INDEX "CommunityInvite_communityId_status_createdAt_idx" ON "CommunityInvite"("communityId", "status", "createdAt");
CREATE INDEX "Post_communityId_status_publishedAt_id_idx" ON "Post"("communityId", "status", "publishedAt", "id");

ALTER TABLE "Community" ADD CONSTRAINT "Community_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Community" ADD CONSTRAINT "Community_avatarMediaId_fkey" FOREIGN KEY ("avatarMediaId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Community" ADD CONSTRAINT "Community_coverMediaId_fkey" FOREIGN KEY ("coverMediaId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommunityMember" ADD CONSTRAINT "CommunityMember_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityMember" ADD CONSTRAINT "CommunityMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityJoinRequest" ADD CONSTRAINT "CommunityJoinRequest_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityJoinRequest" ADD CONSTRAINT "CommunityJoinRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityJoinRequest" ADD CONSTRAINT "CommunityJoinRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommunityInvite" ADD CONSTRAINT "CommunityInvite_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityInvite" ADD CONSTRAINT "CommunityInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityInvite" ADD CONSTRAINT "CommunityInvite_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Post" ADD CONSTRAINT "Post_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION "refresh_community_member_count"()
RETURNS TRIGGER AS $$
DECLARE
    affected_community_id TEXT;
BEGIN
    affected_community_id := COALESCE(NEW."communityId", OLD."communityId");
    UPDATE "Community"
    SET "membersCount" = (
        SELECT count(*) FROM "CommunityMember"
        WHERE "communityId" = affected_community_id AND "status" = 'ACTIVE'
    )
    WHERE "id" = affected_community_id;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "CommunityMember_refresh_count"
AFTER INSERT OR UPDATE OF "status", "communityId" OR DELETE ON "CommunityMember"
FOR EACH ROW EXECUTE FUNCTION "refresh_community_member_count"();

CREATE OR REPLACE FUNCTION "check_community_has_owner"()
RETURNS TRIGGER AS $$
DECLARE
    checked_id TEXT;
    previous_id TEXT;
BEGIN
    IF TG_TABLE_NAME = 'Community' THEN
        checked_id := NEW."id";
    ELSIF TG_OP = 'DELETE' THEN
        checked_id := OLD."communityId";
    ELSE
        checked_id := NEW."communityId";
        previous_id := OLD."communityId";
    END IF;

    IF EXISTS (
        SELECT 1 FROM "Community" community
        WHERE community."id" IN (checked_id, previous_id)
          AND community."status" <> 'DELETED'
          AND (
              (SELECT count(*) FROM "CommunityMember" member
               WHERE member."communityId" = community."id"
                 AND member."role" = 'OWNER'
                 AND member."status" = 'ACTIVE') <> 1
              OR NOT EXISTS (
                  SELECT 1 FROM "CommunityMember" member
                  WHERE member."communityId" = community."id"
                    AND member."userId" = community."ownerId"
                    AND member."role" = 'OWNER'
                    AND member."status" = 'ACTIVE'
              )
          )
    ) THEN
        RAISE EXCEPTION 'Community requires exactly one active owner matching ownerId'
            USING ERRCODE = '23514';
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER "Community_owner_invariant"
AFTER INSERT OR UPDATE OF "ownerId", "status" ON "Community"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "check_community_has_owner"();

CREATE CONSTRAINT TRIGGER "CommunityMember_owner_invariant"
AFTER INSERT OR UPDATE OF "communityId", "userId", "role", "status" OR DELETE ON "CommunityMember"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "check_community_has_owner"();
