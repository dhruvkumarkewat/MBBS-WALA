-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 002: Counselling Schema — Bodies, Sessions, Rounds, Notices
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── Counselling Bodies ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS counselling_bodies (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code          TEXT NOT NULL UNIQUE,       -- 'MCC', 'AACCC', 'KEA', 'UPDGME', etc.
  name          TEXT NOT NULL,
  full_name     TEXT,
  website       TEXT,
  type          TEXT NOT NULL CHECK (type IN ('Central', 'State', 'AYUSH')),
  state_id      UUID REFERENCES states(id),  -- NULL for central bodies
  courses       TEXT[],                      -- {'MBBS','BDS'} or {'BAMS','BHMS','BUMS','BSMS','BNYS'}
  is_active     BOOLEAN DEFAULT true,
  scraper_class TEXT,                        -- 'MCCScraper', 'AACCCScraper', etc.
  check_interval_minutes INTEGER DEFAULT 15,
  source        TEXT DEFAULT 'manual',
  last_verified TIMESTAMPTZ,
  checksum      TEXT,
  version       INTEGER DEFAULT 1,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER counselling_bodies_updated_at BEFORE UPDATE ON counselling_bodies
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Seed counselling bodies
INSERT INTO counselling_bodies (code, name, full_name, website, type, courses, scraper_class) VALUES
  ('MCC', 'MCC', 'Medical Counselling Committee', 'https://mcc.nic.in', 'Central', ARRAY['MBBS','BDS'], 'MCCScraper'),
  ('AACCC', 'AACCC', 'AYUSH Admissions Central Counseling Committee', 'https://aaccc.gov.in', 'AYUSH', ARRAY['BAMS','BHMS','BUMS','BSMS','BNYS'], 'AACCCScraper'),
  ('KEA', 'KEA', 'Karnataka Examinations Authority', 'https://kea.kar.nic.in', 'State', ARRAY['MBBS','BDS'], NULL),
  ('UPDGME', 'UPDGME', 'UP Directorate of Medical Education', 'https://updgme.in', 'State', ARRAY['MBBS','BDS'], NULL),
  ('MPDME', 'MPDME', 'MP Directorate of Medical Education', NULL, 'State', ARRAY['MBBS','BDS'], NULL),
  ('BCECEB', 'BCECEB', 'Bihar Combined Entrance Competitive Examination Board', 'https://bceceboard.bihar.gov.in', 'State', ARRAY['MBBS','BDS'], NULL),
  ('RUHS', 'RUHS', 'Rajasthan University of Health Sciences', 'https://ruhsraj.org', 'State', ARRAY['MBBS','BDS'], NULL),
  ('IPU', 'IPU', 'Guru Gobind Singh Indraprastha University', 'http://www.ipu.ac.in', 'State', ARRAY['MBBS','BDS'], NULL),
  ('JKBOPEE', 'JKBOPEE', 'J&K Board of Professional Entrance Examinations', 'https://jkbopee.gov.in', 'State', ARRAY['MBBS','BDS'], NULL)
ON CONFLICT (code) DO NOTHING;

-- ── Counselling Sessions ──────────────────────────────────────────────────────
-- e.g. "MCC UG 2025", "AACCC 2025", "KEA NEET UG 2025"
CREATE TABLE IF NOT EXISTS counselling_sessions (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  body_id           UUID NOT NULL REFERENCES counselling_bodies(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,          -- 'MCC UG Counselling 2025'
  year              INTEGER NOT NULL,
  exam              TEXT NOT NULL DEFAULT 'NEET UG',
  level             TEXT DEFAULT 'UG' CHECK (level IN ('UG', 'PG')),
  status            TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN (
    'upcoming', 'active', 'completed', 'cancelled'
  )),
  start_date        DATE,
  end_date          DATE,
  official_url      TEXT,

  source            TEXT DEFAULT 'manual',
  last_verified     TIMESTAMPTZ,
  checksum          TEXT,
  version           INTEGER DEFAULT 1,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(body_id, year, exam, level)
);

CREATE TRIGGER counselling_sessions_updated_at BEFORE UPDATE ON counselling_sessions
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── Counselling Rounds ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS counselling_rounds (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id        UUID NOT NULL REFERENCES counselling_sessions(id) ON DELETE CASCADE,
  round_number      INTEGER NOT NULL,       -- 1, 2, 3, etc.
  round_name        TEXT NOT NULL,           -- 'Round 1', 'Mop Up', 'Stray Vacancy', 'Special Stray'
  round_type        TEXT NOT NULL CHECK (round_type IN (
    'regular', 'mop_up', 'stray_vacancy', 'special_stray', 'online_stray'
  )),
  status            TEXT NOT NULL DEFAULT 'locked' CHECK (status IN (
    'locked',           -- Not yet announced
    'announced',        -- Officially announced, dates published
    'registration',     -- Registration window open
    'choice_filling',   -- Choice filling open
    'choice_locked',    -- Choice filling closed, processing
    'allotment',        -- Result/seat allotment published
    'reporting',        -- Reporting/joining phase
    'completed',        -- Round fully completed
    'cancelled'         -- Round was cancelled
  )),

  -- Timeline
  registration_start TIMESTAMPTZ,
  registration_end   TIMESTAMPTZ,
  choice_filling_start TIMESTAMPTZ,
  choice_filling_end   TIMESTAMPTZ,
  allotment_date       TIMESTAMPTZ,
  reporting_start      TIMESTAMPTZ,
  reporting_end        TIMESTAMPTZ,

  -- Metadata
  result_url         TEXT,                   -- URL to official result PDF
  seat_matrix_url    TEXT,                   -- URL to seat matrix for this round
  notice_url         TEXT,                   -- URL to official notice

  source             TEXT DEFAULT 'manual',
  last_verified      TIMESTAMPTZ,
  checksum           TEXT,
  version            INTEGER DEFAULT 1,
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, round_number)
);

CREATE INDEX idx_rounds_session ON counselling_rounds(session_id);
CREATE INDEX idx_rounds_status ON counselling_rounds(status);

CREATE TRIGGER counselling_rounds_updated_at BEFORE UPDATE ON counselling_rounds
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── Counselling Notices ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS counselling_notices (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id        UUID REFERENCES counselling_sessions(id) ON DELETE SET NULL,
  body_id           UUID NOT NULL REFERENCES counselling_bodies(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  description       TEXT,
  notice_type       TEXT NOT NULL CHECK (notice_type IN (
    'schedule', 'registration', 'choice_filling', 'seat_matrix',
    'result', 'reporting', 'resignation', 'upgrade', 'vacancy',
    'fee', 'eligibility', 'bulletin', 'general', 'correction'
  )),
  notice_date       DATE,
  pdf_url           TEXT,
  page_url          TEXT,                   -- URL where notice was found
  file_hash         TEXT,                   -- SHA-256 of downloaded PDF
  is_processed      BOOLEAN DEFAULT false,  -- Has data been extracted?
  priority          TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

  source            TEXT DEFAULT 'scraper',
  last_verified     TIMESTAMPTZ,
  checksum          TEXT,
  version           INTEGER DEFAULT 1,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notices_body ON counselling_notices(body_id);
CREATE INDEX idx_notices_session ON counselling_notices(session_id);
CREATE INDEX idx_notices_type ON counselling_notices(notice_type);
CREATE INDEX idx_notices_date ON counselling_notices(notice_date DESC);

CREATE TRIGGER counselling_notices_updated_at BEFORE UPDATE ON counselling_notices
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── Counselling Schedules ─────────────────────────────────────────────────────
-- Granular timeline events within a round
CREATE TABLE IF NOT EXISTS counselling_schedule_events (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id          UUID NOT NULL REFERENCES counselling_rounds(id) ON DELETE CASCADE,
  event_type        TEXT NOT NULL CHECK (event_type IN (
    'registration_start', 'registration_end', 'payment_start', 'payment_end',
    'choice_filling_start', 'choice_filling_end', 'choice_locking',
    'seat_allotment', 'reporting_start', 'reporting_end',
    'resignation_start', 'resignation_end', 'fresh_choice_filling',
    'result_publication', 'schedule_announcement'
  )),
  event_date        TIMESTAMPTZ NOT NULL,
  description       TEXT,
  notice_id         UUID REFERENCES counselling_notices(id),  -- Which notice announced this

  source            TEXT DEFAULT 'scraper',
  last_verified     TIMESTAMPTZ,
  checksum          TEXT,
  version           INTEGER DEFAULT 1,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER schedule_events_updated_at BEFORE UPDATE ON counselling_schedule_events
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE counselling_bodies ENABLE ROW LEVEL SECURITY;
ALTER TABLE counselling_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE counselling_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE counselling_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE counselling_schedule_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read counselling_bodies" ON counselling_bodies FOR SELECT USING (true);
CREATE POLICY "Public read counselling_sessions" ON counselling_sessions FOR SELECT USING (true);
CREATE POLICY "Public read counselling_rounds" ON counselling_rounds FOR SELECT USING (true);
CREATE POLICY "Public read counselling_notices" ON counselling_notices FOR SELECT USING (true);
CREATE POLICY "Public read counselling_schedule_events" ON counselling_schedule_events FOR SELECT USING (true);
