-- BeeBuddy P2 / M11: configurable, explainable and auditable matching recommendations.

CREATE TYPE "MatchRecommendationStatus" AS ENUM ('PENDING', 'VIEWED', 'ACCEPTED', 'DISMISSED', 'EXPIRED');
CREATE TYPE "MatchFeedbackType" AS ENUM ('LIKE', 'PASS', 'BLOCK', 'REPORT', 'CONNECT');

CREATE TABLE "MatchingPreference" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "minAge" INTEGER,
  "maxAge" INTEGER,
  "maxDistanceKm" INTEGER,
  "preferredGoals" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "weights" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MatchingPreference_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MatchingPreference_age_check" CHECK (
    ("minAge" IS NULL OR "minAge" BETWEEN 18 AND 120) AND
    ("maxAge" IS NULL OR "maxAge" BETWEEN 18 AND 120) AND
    ("minAge" IS NULL OR "maxAge" IS NULL OR "minAge" <= "maxAge")
  ),
  CONSTRAINT "MatchingPreference_distance_check" CHECK ("maxDistanceKm" IS NULL OR "maxDistanceKm" BETWEEN 1 AND 20000),
  CONSTRAINT "MatchingPreference_weights_object_check" CHECK ("weights" IS NULL OR jsonb_typeof("weights") = 'object')
);

CREATE TABLE "MatchRecommendation" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "candidateUserId" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "score" DOUBLE PRECISION NOT NULL,
  "reasons" JSONB NOT NULL,
  "algorithmVersion" TEXT NOT NULL,
  "status" "MatchRecommendationStatus" NOT NULL DEFAULT 'PENDING',
  "viewedAt" TIMESTAMP(3),
  "respondedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MatchRecommendation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MatchRecommendation_not_self_check" CHECK ("userId" <> "candidateUserId"),
  CONSTRAINT "MatchRecommendation_score_check" CHECK ("score" BETWEEN 0 AND 1),
  CONSTRAINT "MatchRecommendation_reasons_array_check" CHECK (jsonb_typeof("reasons") = 'array'),
  CONSTRAINT "MatchRecommendation_expiry_check" CHECK ("expiresAt" > "createdAt")
);

CREATE TABLE "MatchFeedback" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "candidateUserId" TEXT NOT NULL,
  "recommendationId" TEXT,
  "type" "MatchFeedbackType" NOT NULL,
  "reasons" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MatchFeedback_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MatchFeedback_not_self_check" CHECK ("userId" <> "candidateUserId"),
  CONSTRAINT "MatchFeedback_reasons_shape_check" CHECK ("reasons" IS NULL OR jsonb_typeof("reasons") IN ('array', 'object'))
);

CREATE UNIQUE INDEX "MatchingPreference_userId_key" ON "MatchingPreference"("userId");
CREATE UNIQUE INDEX "MatchRecommendation_userId_candidateUserId_batchId_key" ON "MatchRecommendation"("userId", "candidateUserId", "batchId");
CREATE INDEX "MatchRecommendation_userId_status_score_createdAt_idx" ON "MatchRecommendation"("userId", "status", "score", "createdAt");
CREATE INDEX "MatchRecommendation_candidateUserId_createdAt_idx" ON "MatchRecommendation"("candidateUserId", "createdAt");
CREATE INDEX "MatchFeedback_userId_candidateUserId_createdAt_idx" ON "MatchFeedback"("userId", "candidateUserId", "createdAt");
CREATE INDEX "MatchFeedback_recommendationId_createdAt_idx" ON "MatchFeedback"("recommendationId", "createdAt");

ALTER TABLE "MatchingPreference" ADD CONSTRAINT "MatchingPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchRecommendation" ADD CONSTRAINT "MatchRecommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchRecommendation" ADD CONSTRAINT "MatchRecommendation_candidateUserId_fkey" FOREIGN KEY ("candidateUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchFeedback" ADD CONSTRAINT "MatchFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchFeedback" ADD CONSTRAINT "MatchFeedback_candidateUserId_fkey" FOREIGN KEY ("candidateUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchFeedback" ADD CONSTRAINT "MatchFeedback_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "MatchRecommendation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
