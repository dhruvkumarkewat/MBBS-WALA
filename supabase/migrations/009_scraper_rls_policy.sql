-- ============================================================================
-- 009_scraper_rls_policy.sql
-- Enables public/anon read and write permissions for counselling data tables
-- and scraper telemetry when service_role key is not configured.
-- ============================================================================

-- 1. Enable RLS on counselling tables and add public policies
ALTER TABLE IF EXISTS counselling_notices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read notices" ON counselling_notices;
CREATE POLICY "Public can read notices" ON counselling_notices FOR SELECT USING (true);
DROP POLICY IF EXISTS "Scraper can write notices" ON counselling_notices;
CREATE POLICY "Scraper can write notices" ON counselling_notices FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS scraper_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read scraper_runs" ON scraper_runs;
CREATE POLICY "Public can read scraper_runs" ON scraper_runs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Scraper can write scraper_runs" ON scraper_runs;
CREATE POLICY "Scraper can write scraper_runs" ON scraper_runs FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS counselling_bodies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read counselling_bodies" ON counselling_bodies;
CREATE POLICY "Public can read counselling_bodies" ON counselling_bodies FOR SELECT USING (true);
DROP POLICY IF EXISTS "Scraper can write counselling_bodies" ON counselling_bodies;
CREATE POLICY "Scraper can write counselling_bodies" ON counselling_bodies FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS counselling_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read counselling_sessions" ON counselling_sessions;
CREATE POLICY "Public can read counselling_sessions" ON counselling_sessions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Scraper can write counselling_sessions" ON counselling_sessions;
CREATE POLICY "Scraper can write counselling_sessions" ON counselling_sessions FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS counselling_rounds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read counselling_rounds" ON counselling_rounds;
CREATE POLICY "Public can read counselling_rounds" ON counselling_rounds FOR SELECT USING (true);
DROP POLICY IF EXISTS "Scraper can write counselling_rounds" ON counselling_rounds;
CREATE POLICY "Scraper can write counselling_rounds" ON counselling_rounds FOR ALL USING (true) WITH CHECK (true);
