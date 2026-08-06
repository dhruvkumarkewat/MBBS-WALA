-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 015: College Facilities and Faculty
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── College Facilities ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS college_facilities (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  college_id      UUID NOT NULL REFERENCES colleges_v2(id) ON DELETE CASCADE,
  category        TEXT NOT NULL CHECK (category IN (
    'Campus', 'Hostel', 'Sports', 'Academic', 'Hospital', 'Other'
  )),
  name            TEXT NOT NULL,
  description     TEXT,
  is_available    BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER college_facilities_updated_at BEFORE UPDATE ON college_facilities
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_college_facilities_college ON college_facilities(college_id);

-- ── College Faculty ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS college_faculty (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  college_id      UUID NOT NULL REFERENCES colleges_v2(id) ON DELETE CASCADE,
  department      TEXT NOT NULL,
  name            TEXT NOT NULL,
  designation     TEXT NOT NULL,
  qualification   TEXT,
  experience_years INTEGER,
  is_hod          BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER college_faculty_updated_at BEFORE UPDATE ON college_faculty
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_college_faculty_college ON college_faculty(college_id);

-- ── RLS Policies ──────────────────────────────────────────────────────────────
ALTER TABLE college_facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE college_faculty ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read college_facilities" ON college_facilities FOR SELECT USING (true);
CREATE POLICY "Public read college_faculty" ON college_faculty FOR SELECT USING (true);
