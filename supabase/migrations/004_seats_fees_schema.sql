-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 004: Seat Matrix — Year-wise, quota-wise, category-wise
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS seat_matrix_v2 (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  college_id      UUID NOT NULL REFERENCES colleges_v2(id) ON DELETE CASCADE,
  course_id       UUID NOT NULL REFERENCES courses(id),
  session_id      UUID REFERENCES counselling_sessions(id),
  year            INTEGER NOT NULL,
  round_name      TEXT,                       -- NULL = pre-counselling published seats
  body_code       TEXT NOT NULL DEFAULT 'MCC',

  -- Seat counts by quota and category
  quota_code      TEXT NOT NULL DEFAULT 'AI',
  category_code   TEXT NOT NULL DEFAULT 'UR',
  gender          TEXT DEFAULT 'neutral' CHECK (gender IN ('neutral', 'female', 'male')),
  total_seats     INTEGER NOT NULL DEFAULT 0,
  filled_seats    INTEGER DEFAULT 0,
  vacant_seats    INTEGER DEFAULT 0,

  -- Source
  seat_matrix_url TEXT,                       -- PDF/page link
  notice_id       UUID REFERENCES counselling_notices(id),

  -- Audit columns
  source          TEXT DEFAULT 'scraper',
  last_verified   TIMESTAMPTZ,
  checksum        TEXT,
  version         INTEGER DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),

  UNIQUE(college_id, course_id, year, quota_code, category_code, gender, COALESCE(round_name, 'pre'))
);

CREATE INDEX idx_seat_matrix_v2_college ON seat_matrix_v2(college_id);
CREATE INDEX idx_seat_matrix_v2_year ON seat_matrix_v2(year);
CREATE INDEX idx_seat_matrix_v2_body ON seat_matrix_v2(body_code);

CREATE TRIGGER seat_matrix_v2_updated_at BEFORE UPDATE ON seat_matrix_v2
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE seat_matrix_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read seat_matrix_v2" ON seat_matrix_v2 FOR SELECT USING (true);

-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 005: Fee Structures — Tuition, Hostel, Bond, Stipend
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS fee_structures (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  college_id      UUID NOT NULL REFERENCES colleges_v2(id) ON DELETE CASCADE,
  course_id       UUID NOT NULL REFERENCES courses(id),
  year            INTEGER NOT NULL,
  quota_code      TEXT DEFAULT 'AI',

  -- Fee breakdown (all in INR)
  tuition_annual  NUMERIC(12,2),
  tuition_total   NUMERIC(12,2),
  hostel_annual   NUMERIC(12,2),
  mess_annual     NUMERIC(12,2),
  development_fee NUMERIC(12,2),
  admission_fee   NUMERIC(12,2),
  other_fees      NUMERIC(12,2),
  total_annual    NUMERIC(12,2),
  total_course    NUMERIC(12,2),

  -- Bond details
  bond_amount     NUMERIC(14,2),
  bond_years      INTEGER,
  bond_penalty    NUMERIC(14,2),
  stipend_monthly NUMERIC(10,2),

  -- NRI/Management fees
  nri_fee_annual  NUMERIC(14,2),
  mgmt_fee_annual NUMERIC(14,2),

  -- Audit columns
  source          TEXT DEFAULT 'manual',
  last_verified   TIMESTAMPTZ,
  checksum        TEXT,
  version         INTEGER DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),

  UNIQUE(college_id, course_id, year, quota_code)
);

CREATE INDEX idx_fees_college ON fee_structures(college_id);
CREATE INDEX idx_fees_year ON fee_structures(year);

CREATE TRIGGER fee_structures_updated_at BEFORE UPDATE ON fee_structures
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE fee_structures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read fee_structures" ON fee_structures FOR SELECT USING (true);
