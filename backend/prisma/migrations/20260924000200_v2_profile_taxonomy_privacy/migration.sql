-- BeeBuddy Database V2 / P0 / M2: profile taxonomy and field-level privacy.
-- Legacy Profile string fields remain during the dual-write compatibility window.

CREATE TYPE "OnboardingStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');
CREATE TYPE "ProfileSection" AS ENUM ('BASIC', 'BIO', 'AGE', 'OCCUPATION', 'INTERESTS', 'HABITS', 'PLACES', 'GOALS', 'INTRO_MEDIA');
CREATE TYPE "ProfileAudience" AS ENUM ('PUBLIC', 'CONNECTIONS', 'ONLY_ME');
CREATE TYPE "UserPlaceRelation" AS ENUM ('HOME', 'CURRENT', 'FREQUENT', 'FAVORITE');

ALTER TABLE "Profile"
    ADD COLUMN "occupation" TEXT,
    ADD COLUMN "industry" TEXT,
    ADD COLUMN "countryCode" TEXT,
    ADD COLUMN "onboardingStatus" "OnboardingStatus" NOT NULL DEFAULT 'NOT_STARTED',
    ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3),
    ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "Interest" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Interest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserInterest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "interestId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "proficiency" TEXT,
    "source" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserInterest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Habit" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Habit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserHabit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "frequency" TEXT,
    "preferredTime" TEXT,
    "source" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserHabit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Place" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "countryCode" TEXT,
    "regionCode" TEXT,
    "city" TEXT,
    "district" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Place_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserPlace" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "relationType" "UserPlaceRelation" NOT NULL DEFAULT 'CURRENT',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserPlace_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConnectionGoal" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ConnectionGoal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserConnectionGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "connectionGoalId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserConnectionGoal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProfileVisibilityRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "section" "ProfileSection" NOT NULL,
    "audience" "ProfileAudience" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProfileVisibilityRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Interest_slug_key" ON "Interest"("slug");
CREATE UNIQUE INDEX "Interest_normalizedName_key" ON "Interest"("normalizedName");
CREATE INDEX "Interest_isActive_sortOrder_idx" ON "Interest"("isActive", "sortOrder");
CREATE UNIQUE INDEX "UserInterest_userId_interestId_key" ON "UserInterest"("userId", "interestId");
CREATE INDEX "UserInterest_interestId_userId_idx" ON "UserInterest"("interestId", "userId");

CREATE UNIQUE INDEX "Habit_slug_key" ON "Habit"("slug");
CREATE UNIQUE INDEX "Habit_normalizedName_key" ON "Habit"("normalizedName");
CREATE INDEX "Habit_isActive_sortOrder_idx" ON "Habit"("isActive", "sortOrder");
CREATE UNIQUE INDEX "UserHabit_userId_habitId_key" ON "UserHabit"("userId", "habitId");
CREATE INDEX "UserHabit_habitId_userId_idx" ON "UserHabit"("habitId", "userId");

CREATE UNIQUE INDEX "Place_slug_key" ON "Place"("slug");
CREATE UNIQUE INDEX "Place_normalizedName_key" ON "Place"("normalizedName");
CREATE INDEX "Place_countryCode_city_isActive_idx" ON "Place"("countryCode", "city", "isActive");
CREATE UNIQUE INDEX "UserPlace_userId_placeId_relationType_key" ON "UserPlace"("userId", "placeId", "relationType");
CREATE INDEX "UserPlace_placeId_userId_idx" ON "UserPlace"("placeId", "userId");

CREATE UNIQUE INDEX "ConnectionGoal_slug_key" ON "ConnectionGoal"("slug");
CREATE UNIQUE INDEX "ConnectionGoal_normalizedName_key" ON "ConnectionGoal"("normalizedName");
CREATE INDEX "ConnectionGoal_isActive_sortOrder_idx" ON "ConnectionGoal"("isActive", "sortOrder");
CREATE UNIQUE INDEX "UserConnectionGoal_userId_connectionGoalId_key" ON "UserConnectionGoal"("userId", "connectionGoalId");
CREATE INDEX "UserConnectionGoal_connectionGoalId_userId_idx" ON "UserConnectionGoal"("connectionGoalId", "userId");

CREATE UNIQUE INDEX "ProfileVisibilityRule_userId_section_key" ON "ProfileVisibilityRule"("userId", "section");
CREATE INDEX "ProfileVisibilityRule_userId_audience_idx" ON "ProfileVisibilityRule"("userId", "audience");

ALTER TABLE "UserInterest" ADD CONSTRAINT "UserInterest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserInterest" ADD CONSTRAINT "UserInterest_interestId_fkey" FOREIGN KEY ("interestId") REFERENCES "Interest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserHabit" ADD CONSTRAINT "UserHabit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserHabit" ADD CONSTRAINT "UserHabit_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserPlace" ADD CONSTRAINT "UserPlace_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserPlace" ADD CONSTRAINT "UserPlace_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserConnectionGoal" ADD CONSTRAINT "UserConnectionGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserConnectionGoal" ADD CONSTRAINT "UserConnectionGoal_connectionGoalId_fkey" FOREIGN KEY ("connectionGoalId") REFERENCES "ConnectionGoal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProfileVisibilityRule" ADD CONSTRAINT "ProfileVisibilityRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill interest catalog and user relationships from legacy arrays.
WITH source AS (
    SELECT DISTINCT trim(value) AS display_name, lower(trim(value)) AS normalized_name
    FROM "Profile", LATERAL unnest("interests") AS value
    WHERE trim(value) <> ''
)
INSERT INTO "Interest" ("id", "slug", "displayName", "normalizedName", "createdAt", "updatedAt")
SELECT md5('interest:' || normalized_name), 'legacy-' || substr(md5(normalized_name), 1, 16), display_name, normalized_name, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM source
ON CONFLICT ("normalizedName") DO NOTHING;

INSERT INTO "UserInterest" ("id", "userId", "interestId", "priority", "source", "createdAt", "updatedAt")
SELECT md5('user-interest:' || p."userId" || ':' || i."id"), p."userId", i."id", value.ordinality - 1, 'LEGACY', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Profile" p
CROSS JOIN LATERAL unnest(p."interests") WITH ORDINALITY AS value(name, ordinality)
JOIN "Interest" i ON i."normalizedName" = lower(trim(value.name))
WHERE trim(value.name) <> ''
ON CONFLICT ("userId", "interestId") DO NOTHING;

-- Backfill habits.
WITH source AS (
    SELECT DISTINCT trim(value) AS display_name, lower(trim(value)) AS normalized_name
    FROM "Profile", LATERAL unnest("habits") AS value
    WHERE trim(value) <> ''
)
INSERT INTO "Habit" ("id", "slug", "displayName", "normalizedName", "createdAt", "updatedAt")
SELECT md5('habit:' || normalized_name), 'legacy-' || substr(md5(normalized_name), 1, 16), display_name, normalized_name, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM source
ON CONFLICT ("normalizedName") DO NOTHING;

INSERT INTO "UserHabit" ("id", "userId", "habitId", "priority", "source", "createdAt", "updatedAt")
SELECT md5('user-habit:' || p."userId" || ':' || h."id"), p."userId", h."id", value.ordinality - 1, 'LEGACY', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Profile" p
CROSS JOIN LATERAL unnest(p."habits") WITH ORDINALITY AS value(name, ordinality)
JOIN "Habit" h ON h."normalizedName" = lower(trim(value.name))
WHERE trim(value.name) <> ''
ON CONFLICT ("userId", "habitId") DO NOTHING;

-- Backfill the legacy free-text location as a coarse CURRENT place.
WITH source AS (
    SELECT DISTINCT trim("location") AS display_name, lower(trim("location")) AS normalized_name
    FROM "Profile"
    WHERE "location" IS NOT NULL AND trim("location") <> ''
)
INSERT INTO "Place" ("id", "slug", "displayName", "normalizedName", "createdAt", "updatedAt")
SELECT md5('place:' || normalized_name), 'legacy-' || substr(md5(normalized_name), 1, 16), display_name, normalized_name, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM source
ON CONFLICT ("normalizedName") DO NOTHING;

INSERT INTO "UserPlace" ("id", "userId", "placeId", "relationType", "isPrimary", "createdAt", "updatedAt")
SELECT md5('user-place:' || p."userId" || ':' || place."id"), p."userId", place."id", 'CURRENT'::"UserPlaceRelation", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Profile" p
JOIN "Place" place ON place."normalizedName" = lower(trim(p."location"))
WHERE p."location" IS NOT NULL AND trim(p."location") <> ''
ON CONFLICT ("userId", "placeId", "relationType") DO NOTHING;

-- Backfill connection goals.
WITH source AS (
    SELECT DISTINCT trim("connectionGoal") AS display_name, lower(trim("connectionGoal")) AS normalized_name
    FROM "Profile"
    WHERE "connectionGoal" IS NOT NULL AND trim("connectionGoal") <> ''
)
INSERT INTO "ConnectionGoal" ("id", "slug", "displayName", "normalizedName", "createdAt", "updatedAt")
SELECT md5('goal:' || normalized_name), 'legacy-' || substr(md5(normalized_name), 1, 16), display_name, normalized_name, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM source
ON CONFLICT ("normalizedName") DO NOTHING;

INSERT INTO "UserConnectionGoal" ("id", "userId", "connectionGoalId", "priority", "createdAt", "updatedAt")
SELECT md5('user-goal:' || p."userId" || ':' || goal."id"), p."userId", goal."id", 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Profile" p
JOIN "ConnectionGoal" goal ON goal."normalizedName" = lower(trim(p."connectionGoal"))
WHERE p."connectionGoal" IS NOT NULL AND trim(p."connectionGoal") <> ''
ON CONFLICT ("userId", "connectionGoalId") DO NOTHING;

-- Approved default privacy. Existing data is development-only, so defaults are
-- applied consistently instead of inferring intent from the legacy global flag.
INSERT INTO "ProfileVisibilityRule" ("id", "userId", "section", "audience", "createdAt", "updatedAt")
SELECT
    md5('privacy:' || u."id" || ':' || defaults.section::text),
    u."id",
    defaults.section,
    defaults.audience,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "User" u
CROSS JOIN (VALUES
    ('BASIC'::"ProfileSection", 'PUBLIC'::"ProfileAudience"),
    ('BIO'::"ProfileSection", 'PUBLIC'::"ProfileAudience"),
    ('INTERESTS'::"ProfileSection", 'PUBLIC'::"ProfileAudience"),
    ('AGE'::"ProfileSection", 'CONNECTIONS'::"ProfileAudience"),
    ('OCCUPATION'::"ProfileSection", 'CONNECTIONS'::"ProfileAudience"),
    ('PLACES'::"ProfileSection", 'CONNECTIONS'::"ProfileAudience"),
    ('GOALS'::"ProfileSection", 'CONNECTIONS'::"ProfileAudience"),
    ('INTRO_MEDIA'::"ProfileSection", 'CONNECTIONS'::"ProfileAudience"),
    ('HABITS'::"ProfileSection", 'ONLY_ME'::"ProfileAudience")
) AS defaults(section, audience)
ON CONFLICT ("userId", "section") DO NOTHING;
