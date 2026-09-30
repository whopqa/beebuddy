ALTER TABLE "UserSetting" ADD COLUMN "travelStyles" TEXT[] NOT NULL DEFAULT ARRAY['Backpack & Trek', 'Foodie & Cafes']::TEXT[];

CREATE TABLE "LeadSubmission" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LeadSubmission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LeadSubmission_kind_email_key" ON "LeadSubmission"("kind", "email");
CREATE INDEX "LeadSubmission_createdAt_idx" ON "LeadSubmission"("createdAt");
