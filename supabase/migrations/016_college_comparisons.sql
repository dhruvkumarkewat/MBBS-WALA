-- Migration 016: college_comparisons cache table
-- Stores AI-generated college comparison results to avoid redundant API calls

CREATE TABLE IF NOT EXISTS college_comparisons (
  id BIGSERIAL PRIMARY KEY,
  college_a_id INT NOT NULL,
  college_b_id INT NOT NULL,
  result_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique index on ordered pair so (3,5) and (5,3) map to same row
CREATE UNIQUE INDEX IF NOT EXISTS idx_compare_pair
  ON college_comparisons(
    LEAST(college_a_id, college_b_id),
    GREATEST(college_a_id, college_b_id)
  );

-- Index for fast lookup by pair
CREATE INDEX IF NOT EXISTS idx_compare_a ON college_comparisons(college_a_id);
CREATE INDEX IF NOT EXISTS idx_compare_b ON college_comparisons(college_b_id);
CREATE INDEX IF NOT EXISTS idx_compare_created ON college_comparisons(created_at DESC);
