-- ============================================================================
-- 011_deduplicate_state_competition.sql
-- Removes duplicate rows in state_competition and adds unique constraint
-- ============================================================================

-- Remove duplicate rows, keeping only the lowest ID per (state_key, year)
DELETE FROM state_competition
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY state_key, year ORDER BY id ASC) as rnum
    FROM state_competition
  ) t
  WHERE t.rnum > 1
);

-- Add unique index to prevent future duplicate state competition seeds
CREATE UNIQUE INDEX IF NOT EXISTS idx_state_competition_unique 
  ON state_competition(state_key, year);
