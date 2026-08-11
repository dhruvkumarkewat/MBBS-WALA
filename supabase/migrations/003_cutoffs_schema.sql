-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 003: Cutoffs Schema — Fully normalized multi-year, multi-round
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cutoffs_v2 (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  college_id      UUID NOT NULL REFERENCES colleges_v2(id) ON DELETE CASCADE,
  course_id       UUID NOT NULL REFERENCES courses(id),
  year            INTEGER NOT NULL,
  round_id        UUID REFERENCES counselling_rounds(id),
  round_name      TEXT NOT NULL,              -- 'Round 1', 'Round 2', 'Mop Up', etc.
  category_code   TEXT NOT NULL,              -- 'UR', 'OBC', 'SC', 'ST', 'EWS', 'UR_PwD', etc.
  quota_code      TEXT NOT NULL DEFAULT 'AI', -- 'AI', 'HS', 'OS', 'IP', etc.
  gender          TEXT DEFAULT 'neutral' CHECK (gender IN ('neutral', 'female', 'male')),

  -- Rank data
  opening_rank    INTEGER,
  closing_rank    INTEGER,
  opening_score   NUMERIC(6,2),               -- NEET score (out of 720)
  closing_score   NUMERIC(6,2),

  -- Counselling body reference
  body_code       TEXT NOT NULL DEFAULT 'MCC', -- 'MCC', 'AACCC', 'KEA', etc.
  allotment_type  TEXT DEFAULT 'AIQ' CHECK (allotment_type IN (
    'AIQ', 'State', 'Deemed', 'Central', 'ESIC', 'AFMC', 'Internal', 'Management', 'NRI'
  )),

  -- Source tracking
  result_pdf_url  TEXT,                        -- Link to the official result PDF
  notice_id       UUID REFERENCES counselling_notices(id),

  -- Audit columns
  source          TEXT DEFAULT 'scraper',
  last_verified   TIMESTAMPTZ,
  checksum        TEXT,
  version         INTEGER DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),

  -- Composite unique to prevent duplicates
  UNIQUE(college_id, course_id, year, round_name, category_code, quota_code, gender)
);

-- Performance indexes
CREATE INDEX idx_cutoffs_v2_college ON cutoffs_v2(college_id);
CREATE INDEX idx_cutoffs_v2_year ON cutoffs_v2(year);
CREATE INDEX idx_cutoffs_v2_round ON cutoffs_v2(round_name);
CREATE INDEX idx_cutoffs_v2_category ON cutoffs_v2(category_code);
CREATE INDEX idx_cutoffs_v2_quota ON cutoffs_v2(quota_code);
CREATE INDEX idx_cutoffs_v2_body ON cutoffs_v2(body_code);
CREATE INDEX idx_cutoffs_v2_closing ON cutoffs_v2(closing_rank);
CREATE INDEX idx_cutoffs_v2_year_round ON cutoffs_v2(year, round_name);
CREATE INDEX idx_cutoffs_v2_lookup ON cutoffs_v2(college_id, year, category_code, quota_code);

CREATE TRIGGER cutoffs_v2_updated_at BEFORE UPDATE ON cutoffs_v2
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE cutoffs_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read cutoffs_v2" ON cutoffs_v2 FOR SELECT USING (true);
