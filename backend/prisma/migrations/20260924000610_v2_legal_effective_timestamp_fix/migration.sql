-- Forward-fix for environments whose PostgreSQL session timezone writes a local
-- CURRENT_TIMESTAMP into Prisma's timestamp-without-time-zone columns.
-- Seed legal documents must already be effective when M6 is deployed.

UPDATE "LegalDocument"
SET
    "publishedAt" = TIMESTAMP '2026-01-01 00:00:00',
    "effectiveAt" = TIMESTAMP '2026-01-01 00:00:00'
WHERE "version" = '1.0'
  AND "type" IN ('TERMS', 'PRIVACY', 'COOKIE_POLICY')
  AND "effectiveAt" > TIMESTAMP '2026-01-01 00:00:00';
