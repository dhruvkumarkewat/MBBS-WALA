-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 001: Core Schema — States, Universities, Colleges, Courses
-- MBBS Wala Automated Counselling Intelligence Platform
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── Helper: updated_at trigger ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── States ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS states (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  code        TEXT NOT NULL UNIQUE,        -- e.g. 'MH', 'KA', 'TN'
  type        TEXT NOT NULL DEFAULT 'State' CHECK (type IN ('State', 'Union Territory')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER states_updated_at BEFORE UPDATE ON states
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Seed Indian states
INSERT INTO states (name, code, type) VALUES
  ('Andhra Pradesh', 'AP', 'State'),
  ('Arunachal Pradesh', 'AR', 'State'),
  ('Assam', 'AS', 'State'),
  ('Bihar', 'BR', 'State'),
  ('Chhattisgarh', 'CG', 'State'),
  ('Goa', 'GA', 'State'),
  ('Gujarat', 'GJ', 'State'),
  ('Haryana', 'HR', 'State'),
  ('Himachal Pradesh', 'HP', 'State'),
  ('Jharkhand', 'JH', 'State'),
  ('Karnataka', 'KA', 'State'),
  ('Kerala', 'KL', 'State'),
  ('Madhya Pradesh', 'MP', 'State'),
  ('Maharashtra', 'MH', 'State'),
  ('Manipur', 'MN', 'State'),
  ('Meghalaya', 'ML', 'State'),
  ('Mizoram', 'MZ', 'State'),
  ('Nagaland', 'NL', 'State'),
  ('Odisha', 'OR', 'State'),
  ('Punjab', 'PB', 'State'),
  ('Rajasthan', 'RJ', 'State'),
  ('Sikkim', 'SK', 'State'),
  ('Tamil Nadu', 'TN', 'State'),
  ('Telangana', 'TS', 'State'),
  ('Tripura', 'TR', 'State'),
  ('Uttar Pradesh', 'UP', 'State'),
  ('Uttarakhand', 'UK', 'State'),
  ('West Bengal', 'WB', 'State'),
  ('Andaman and Nicobar Islands', 'AN', 'Union Territory'),
  ('Chandigarh', 'CH', 'Union Territory'),
  ('Dadra and Nagar Haveli and Daman and Diu', 'DD', 'Union Territory'),
  ('Delhi', 'DL', 'Union Territory'),
  ('Jammu and Kashmir', 'JK', 'Union Territory'),
  ('Ladakh', 'LA', 'Union Territory'),
  ('Lakshadweep', 'LD', 'Union Territory'),
  ('Puducherry', 'PY', 'Union Territory')
ON CONFLICT (code) DO NOTHING;

-- ── Universities ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS universities (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  state_id    UUID REFERENCES states(id),
  type        TEXT,                        -- 'Central', 'State', 'Deemed', 'Private'
  website     TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER universities_updated_at BEFORE UPDATE ON universities
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── Courses ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS courses (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code            TEXT NOT NULL UNIQUE,     -- 'MBBS', 'BDS', 'BAMS', etc.
  name            TEXT NOT NULL,            -- 'Bachelor of Medicine and Bachelor of Surgery'
  category        TEXT NOT NULL,            -- 'Allopathy', 'Dental', 'AYUSH'
  duration_years  NUMERIC(3,1) NOT NULL,    -- 5.5, 4.5, etc.
  internship      TEXT,                     -- '1 year compulsory rotating internship'
  entrance_exam   TEXT NOT NULL DEFAULT 'NEET UG',
  regulator       TEXT,                     -- 'NMC', 'DCI', 'NCISM', 'NCH'
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER courses_updated_at BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Seed courses
INSERT INTO courses (code, name, category, duration_years, internship, entrance_exam, regulator) VALUES
  ('MBBS', 'Bachelor of Medicine and Bachelor of Surgery', 'Allopathy', 5.5, '1 year compulsory rotating internship', 'NEET UG', 'NMC'),
  ('BDS', 'Bachelor of Dental Surgery', 'Dental', 5.0, '1 year compulsory rotating internship', 'NEET UG', 'DCI'),
  ('BAMS', 'Bachelor of Ayurvedic Medicine and Surgery', 'AYUSH', 5.5, '1 year compulsory rotating internship', 'NEET UG', 'NCISM'),
  ('BHMS', 'Bachelor of Homeopathic Medicine and Surgery', 'AYUSH', 5.5, '1 year compulsory rotating internship', 'NEET UG', 'NCH'),
  ('BUMS', 'Bachelor of Unani Medicine and Surgery', 'AYUSH', 5.5, '1 year compulsory rotating internship', 'NEET UG', 'NCISM'),
  ('BSMS', 'Bachelor of Siddha Medicine and Surgery', 'AYUSH', 5.5, '1 year compulsory rotating internship', 'NEET UG', 'NCISM'),
  ('BNYS', 'Bachelor of Naturopathy and Yogic Sciences', 'AYUSH', 5.5, '1 year compulsory rotating internship', 'NEET UG', 'NCISM')
ON CONFLICT (code) DO NOTHING;

-- ── Categories ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,     -- 'UR', 'OBC', 'SC', 'ST', 'EWS', 'UR_PwD', etc.
  name        TEXT NOT NULL,            -- 'Unreserved', 'Other Backward Classes', etc.
  is_pwd      BOOLEAN DEFAULT false,
  parent_code TEXT,                     -- e.g. 'UR_PwD' parent is 'UR'
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Seed categories
INSERT INTO categories (code, name, is_pwd, parent_code) VALUES
  ('UR', 'Unreserved (General)', false, NULL),
  ('OBC', 'Other Backward Classes', false, NULL),
  ('SC', 'Scheduled Castes', false, NULL),
  ('ST', 'Scheduled Tribes', false, NULL),
  ('EWS', 'Economically Weaker Sections', false, NULL),
  ('UR_PwD', 'Unreserved PwD', true, 'UR'),
  ('OBC_PwD', 'OBC PwD', true, 'OBC'),
  ('SC_PwD', 'SC PwD', true, 'SC'),
  ('ST_PwD', 'ST PwD', true, 'ST'),
  ('EWS_PwD', 'EWS PwD', true, 'EWS'),
  ('Internal_PwD', 'Internal Quota PwD', true, NULL)
ON CONFLICT (code) DO NOTHING;

-- ── Quotas ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quotas (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,     -- 'AI', 'HS', 'OS', 'JK', 'LA', 'IP', etc.
  name        TEXT NOT NULL,            -- 'All India Quota', 'Home State', etc.
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER quotas_updated_at BEFORE UPDATE ON quotas
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Seed quotas
INSERT INTO quotas (code, name, description) VALUES
  ('AI', 'All India Quota', 'Central pool seats under MCC counselling'),
  ('HS', 'Home State', 'State quota seats for domicile students'),
  ('OS', 'Other State', 'State quota seats for non-domicile students'),
  ('JK', 'Jammu & Kashmir', 'J&K migrant quota'),
  ('LA', 'Ladakh', 'Ladakh UT quota'),
  ('IP', 'Internal (Private/Deemed)', 'Internal seats of deemed/private universities'),
  ('MQ', 'Management Quota', 'Management/NRI seats'),
  ('NRI', 'NRI Quota', 'Non-Resident Indian quota'),
  ('FN', 'Foreign National', 'Foreign national quota'),
  ('ESIC', 'ESIC', 'Employees State Insurance Corporation'),
  ('AFMC', 'AFMC', 'Armed Forces Medical College')
ON CONFLICT (code) DO NOTHING;

-- ── Colleges (Normalized) ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS colleges_v2 (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  legacy_id       TEXT UNIQUE,                -- Maps to old 'id' field for migration
  name            TEXT NOT NULL,
  short_name      TEXT,
  college_code    TEXT,                        -- Official MCC/AACCC college code
  state_id        UUID REFERENCES states(id),
  state           TEXT,                        -- Denormalized for query speed
  city            TEXT,
  district        TEXT,
  address         TEXT,
  pincode         TEXT,
  latitude        NUMERIC(10,7),
  longitude       NUMERIC(10,7),
  university_id   UUID REFERENCES universities(id),
  college_type    TEXT NOT NULL CHECK (college_type IN (
    'Government', 'Government (Central)', 'Private', 'Private (Deemed)',
    'Private (Minority)', 'Central Government', 'ESIC', 'AFMC', 'Municipal'
  )),
  country         TEXT NOT NULL DEFAULT 'INDIA',
  established     INTEGER,
  website         TEXT,
  email           TEXT,
  phone           TEXT,
  hospital_name   TEXT,
  hospital_beds   INTEGER,
  is_active       BOOLEAN DEFAULT true,

  -- Audit columns (required on every table)
  source          TEXT DEFAULT 'manual',       -- 'mcc_scraper', 'aaccc_scraper', 'manual', 'migration'
  last_verified   TIMESTAMPTZ,
  checksum        TEXT,                        -- SHA-256 of record content
  version         INTEGER DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_colleges_v2_state ON colleges_v2(state);
CREATE INDEX idx_colleges_v2_type ON colleges_v2(college_type);
CREATE INDEX idx_colleges_v2_name ON colleges_v2(name);
CREATE INDEX idx_colleges_v2_legacy ON colleges_v2(legacy_id);

CREATE TRIGGER colleges_v2_updated_at BEFORE UPDATE ON colleges_v2
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── College ↔ Course junction ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS college_courses (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  college_id  UUID NOT NULL REFERENCES colleges_v2(id) ON DELETE CASCADE,
  course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  intake      INTEGER,                     -- Total sanctioned seats for this course
  year        INTEGER NOT NULL DEFAULT 2025,
  is_active   BOOLEAN DEFAULT true,
  source      TEXT DEFAULT 'manual',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(college_id, course_id, year)
);

CREATE TRIGGER college_courses_updated_at BEFORE UPDATE ON college_courses
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── College Images ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS college_images (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  college_id  UUID NOT NULL REFERENCES colleges_v2(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  type        TEXT DEFAULT 'campus' CHECK (type IN ('campus', 'hospital', 'hostel', 'infrastructure', 'logo')),
  caption     TEXT,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── RLS Policies ──────────────────────────────────────────────────────────────
ALTER TABLE states ENABLE ROW LEVEL SECURITY;
ALTER TABLE universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE colleges_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE college_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE college_images ENABLE ROW LEVEL SECURITY;

-- Public read for all reference data
CREATE POLICY "Public read states" ON states FOR SELECT USING (true);
CREATE POLICY "Public read universities" ON universities FOR SELECT USING (true);
CREATE POLICY "Public read courses" ON courses FOR SELECT USING (true);
CREATE POLICY "Public read categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Public read quotas" ON quotas FOR SELECT USING (true);
CREATE POLICY "Public read colleges_v2" ON colleges_v2 FOR SELECT USING (true);
CREATE POLICY "Public read college_courses" ON college_courses FOR SELECT USING (true);
CREATE POLICY "Public read college_images" ON college_images FOR SELECT USING (true);
