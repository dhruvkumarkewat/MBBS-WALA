-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 013: AI Predictor Schema
-- Tables required for the grounded AI College & Scholarship Predictor.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── Sources — Trust scoring for all ingested data ────────────────────────────
CREATE TABLE IF NOT EXISTS sources (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  url             TEXT NOT NULL,
  authority_tier  INTEGER NOT NULL DEFAULT 3 CHECK (authority_tier IN (1, 2, 3)),
  -- 1 = official authority (mcc.nic.in, aaccc.gov.in, state DME)
  -- 2 = college's own official prospectus/website
  -- 3 = reputable aggregator (always labeled "unverified, Tier 3")
  domain          TEXT,                        -- 'mcc.nic.in', 'aaccc.gov.in', etc.
  authority_name  TEXT,                        -- 'MCC', 'AACCC', 'DME MP', etc.
  description     TEXT,
  fetched_at      TIMESTAMPTZ,
  verified_at     TIMESTAMPTZ,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sources_domain ON sources(domain);
CREATE INDEX IF NOT EXISTS idx_sources_tier ON sources(authority_tier);

CREATE TRIGGER sources_updated_at BEFORE UPDATE ON sources
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read sources" ON sources FOR SELECT USING (true);
CREATE POLICY "Service write sources" ON sources FOR ALL USING (true) WITH CHECK (true);

-- Seed core sources
INSERT INTO sources (url, authority_tier, domain, authority_name, description, verified_at) VALUES
  ('https://mcc.nic.in', 1, 'mcc.nic.in', 'MCC', 'Medical Counselling Committee — Central AIQ counselling', now()),
  ('https://aaccc.gov.in', 1, 'aaccc.gov.in', 'AACCC', 'AYUSH Admissions Central Counseling Committee', now()),
  ('https://nta.ac.in', 1, 'nta.ac.in', 'NTA', 'National Testing Agency — NEET exam authority', now()),
  ('https://scholarships.gov.in', 1, 'scholarships.gov.in', 'NSP', 'National Scholarship Portal', now())
ON CONFLICT DO NOTHING;

-- ── Qualifying Cutoffs — NEET eligibility floor per year/category ────────────
CREATE TABLE IF NOT EXISTS qualifying_cutoffs (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  neet_year       INTEGER NOT NULL,
  category        TEXT NOT NULL,                -- 'General', 'EWS', 'OBC-NCL', 'SC', 'ST', 'General-PwD', etc.
  exam_track      TEXT NOT NULL DEFAULT 'MBBS_BDS' CHECK (exam_track IN ('MBBS_BDS', 'AYUSH')),
  cutoff_score    INTEGER NOT NULL,             -- Minimum NEET score to be eligible
  cutoff_percentile NUMERIC(5,2),               -- e.g. 50.00 for 50th percentile
  source_url      TEXT,
  source_id       UUID REFERENCES sources(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),

  UNIQUE(neet_year, category, exam_track)
);

CREATE INDEX IF NOT EXISTS idx_qc_year ON qualifying_cutoffs(neet_year);
CREATE INDEX IF NOT EXISTS idx_qc_category ON qualifying_cutoffs(category);

CREATE TRIGGER qualifying_cutoffs_updated_at BEFORE UPDATE ON qualifying_cutoffs
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE qualifying_cutoffs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read qualifying_cutoffs" ON qualifying_cutoffs FOR SELECT USING (true);
CREATE POLICY "Service write qualifying_cutoffs" ON qualifying_cutoffs FOR ALL USING (true) WITH CHECK (true);

-- Seed with NTA published qualifying cutoffs (2024–2026)
-- 2024 actual NTA data
INSERT INTO qualifying_cutoffs (neet_year, category, exam_track, cutoff_score, cutoff_percentile, source_url) VALUES
  (2024, 'General', 'MBBS_BDS', 164, 50.00, 'https://nta.ac.in/Download/ExamPaper/Paper_20240605195051.pdf'),
  (2024, 'EWS', 'MBBS_BDS', 164, 50.00, 'https://nta.ac.in/Download/ExamPaper/Paper_20240605195051.pdf'),
  (2024, 'OBC-NCL', 'MBBS_BDS', 136, 40.00, 'https://nta.ac.in/Download/ExamPaper/Paper_20240605195051.pdf'),
  (2024, 'SC', 'MBBS_BDS', 136, 40.00, 'https://nta.ac.in/Download/ExamPaper/Paper_20240605195051.pdf'),
  (2024, 'ST', 'MBBS_BDS', 136, 40.00, 'https://nta.ac.in/Download/ExamPaper/Paper_20240605195051.pdf'),
  (2024, 'General-PwD', 'MBBS_BDS', 146, 45.00, 'https://nta.ac.in/Download/ExamPaper/Paper_20240605195051.pdf'),
  (2024, 'OBC-PwD', 'MBBS_BDS', 129, 40.00, 'https://nta.ac.in/Download/ExamPaper/Paper_20240605195051.pdf'),
  (2024, 'SC-PwD', 'MBBS_BDS', 129, 40.00, 'https://nta.ac.in/Download/ExamPaper/Paper_20240605195051.pdf'),
  (2024, 'ST-PwD', 'MBBS_BDS', 129, 40.00, 'https://nta.ac.in/Download/ExamPaper/Paper_20240605195051.pdf'),
  -- 2025 NTA data (approx, same percentile thresholds)
  (2025, 'General', 'MBBS_BDS', 164, 50.00, 'https://nta.ac.in'),
  (2025, 'EWS', 'MBBS_BDS', 164, 50.00, 'https://nta.ac.in'),
  (2025, 'OBC-NCL', 'MBBS_BDS', 136, 40.00, 'https://nta.ac.in'),
  (2025, 'SC', 'MBBS_BDS', 136, 40.00, 'https://nta.ac.in'),
  (2025, 'ST', 'MBBS_BDS', 136, 40.00, 'https://nta.ac.in'),
  (2025, 'General-PwD', 'MBBS_BDS', 146, 45.00, 'https://nta.ac.in'),
  (2025, 'OBC-PwD', 'MBBS_BDS', 129, 40.00, 'https://nta.ac.in'),
  (2025, 'SC-PwD', 'MBBS_BDS', 129, 40.00, 'https://nta.ac.in'),
  (2025, 'ST-PwD', 'MBBS_BDS', 129, 40.00, 'https://nta.ac.in'),
  -- 2026 NTA data (approx, same percentile thresholds — update when NTA publishes)
  (2026, 'General', 'MBBS_BDS', 164, 50.00, 'https://nta.ac.in'),
  (2026, 'EWS', 'MBBS_BDS', 164, 50.00, 'https://nta.ac.in'),
  (2026, 'OBC-NCL', 'MBBS_BDS', 136, 40.00, 'https://nta.ac.in'),
  (2026, 'SC', 'MBBS_BDS', 136, 40.00, 'https://nta.ac.in'),
  (2026, 'ST', 'MBBS_BDS', 136, 40.00, 'https://nta.ac.in'),
  (2026, 'General-PwD', 'MBBS_BDS', 146, 45.00, 'https://nta.ac.in'),
  (2026, 'OBC-PwD', 'MBBS_BDS', 129, 40.00, 'https://nta.ac.in'),
  (2026, 'SC-PwD', 'MBBS_BDS', 129, 40.00, 'https://nta.ac.in'),
  (2026, 'ST-PwD', 'MBBS_BDS', 129, 40.00, 'https://nta.ac.in'),
  -- AYUSH qualifying cutoffs (same percentile thresholds apply)
  (2024, 'General', 'AYUSH', 164, 50.00, 'https://aaccc.gov.in'),
  (2024, 'SC', 'AYUSH', 136, 40.00, 'https://aaccc.gov.in'),
  (2024, 'ST', 'AYUSH', 136, 40.00, 'https://aaccc.gov.in'),
  (2024, 'OBC-NCL', 'AYUSH', 136, 40.00, 'https://aaccc.gov.in'),
  (2025, 'General', 'AYUSH', 164, 50.00, 'https://aaccc.gov.in'),
  (2025, 'SC', 'AYUSH', 136, 40.00, 'https://aaccc.gov.in'),
  (2025, 'ST', 'AYUSH', 136, 40.00, 'https://aaccc.gov.in'),
  (2025, 'OBC-NCL', 'AYUSH', 136, 40.00, 'https://aaccc.gov.in'),
  (2026, 'General', 'AYUSH', 164, 50.00, 'https://aaccc.gov.in'),
  (2026, 'SC', 'AYUSH', 136, 40.00, 'https://aaccc.gov.in'),
  (2026, 'ST', 'AYUSH', 136, 40.00, 'https://aaccc.gov.in'),
  (2026, 'OBC-NCL', 'AYUSH', 136, 40.00, 'https://aaccc.gov.in')
ON CONFLICT DO NOTHING;

-- ── Scholarships — Official schemes for medical students ─────────────────────
CREATE TABLE IF NOT EXISTS scholarships (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name            TEXT NOT NULL,
  provider        TEXT NOT NULL,                -- 'Central Government', 'State: Maharashtra', etc.
  description     TEXT,
  eligibility     JSONB DEFAULT '{}',           -- { "categories": [...], "income_limit": ..., "domicile_states": [...], "courses": [...] }
  amount_description TEXT,                      -- Human-readable: "Up to ₹20,000 per year"
  amount_min      INTEGER,                      -- In INR, null if variable
  amount_max      INTEGER,
  official_portal TEXT NOT NULL,                -- Must be a real official URL
  category_scope  TEXT[],                       -- ARRAY['SC','ST','OBC-NCL'] or null = all
  state_scope     TEXT[],                       -- ARRAY['Maharashtra','Karnataka'] or null = all India
  course_scope    TEXT[],                       -- ARRAY['MBBS','BDS'] or null = all
  income_limit    INTEGER,                      -- Annual family income ceiling in INR
  is_active       BOOLEAN DEFAULT true,
  source_id       UUID REFERENCES sources(id),
  last_verified_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scholarships_active ON scholarships(is_active);
CREATE INDEX IF NOT EXISTS idx_scholarships_category ON scholarships USING GIN(category_scope);
CREATE INDEX IF NOT EXISTS idx_scholarships_state ON scholarships USING GIN(state_scope);

CREATE TRIGGER scholarships_updated_at BEFORE UPDATE ON scholarships
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE scholarships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read scholarships" ON scholarships FOR SELECT USING (true);
CREATE POLICY "Service write scholarships" ON scholarships FOR ALL USING (true) WITH CHECK (true);

-- Seed major national & category-specific scholarship schemes
INSERT INTO scholarships (name, provider, description, eligibility, amount_description, amount_min, amount_max, official_portal, category_scope, state_scope, course_scope, income_limit, is_active, last_verified_at) VALUES
(
  'Central Sector Scheme of Scholarship for College and University Students',
  'Ministry of Education, Government of India',
  'Merit-based scholarship for students who scored above 80th percentile in Class 12. Covers tuition and maintenance for professional courses including MBBS.',
  '{"min_class12_percentile": 80, "family_income_limit": 800000}',
  '₹20,000 per year (renewed annually for course duration)',
  20000, 20000,
  'https://scholarships.gov.in',
  NULL, NULL, NULL,
  800000, true, now()
),
(
  'Post-Matric Scholarship for SC Students',
  'Ministry of Social Justice and Empowerment',
  'Covers tuition fees, maintenance allowance, and other charges for SC students in professional courses including medical.',
  '{"categories": ["SC"], "family_income_limit": 250000}',
  'Full tuition + ₹1,200/month maintenance (hosteller) or ₹550/month (day scholar)',
  6600, 14400,
  'https://scholarships.gov.in',
  ARRAY['SC'], NULL, NULL,
  250000, true, now()
),
(
  'Post-Matric Scholarship for ST Students',
  'Ministry of Tribal Affairs',
  'Covers tuition fees and maintenance for ST students in recognized institutions for professional courses.',
  '{"categories": ["ST"], "family_income_limit": 250000}',
  'Full tuition + ₹1,200/month maintenance (hosteller) or ₹550/month (day scholar)',
  6600, 14400,
  'https://scholarships.gov.in',
  ARRAY['ST'], NULL, NULL,
  250000, true, now()
),
(
  'Post-Matric Scholarship for OBC Students',
  'Ministry of Social Justice and Empowerment',
  'Financial assistance for OBC students pursuing post-matric education including professional medical courses.',
  '{"categories": ["OBC-NCL"], "family_income_limit": 100000}',
  'Up to ₹7,000 per year (non-hosteller) / ₹10,000 per year (hosteller)',
  7000, 10000,
  'https://scholarships.gov.in',
  ARRAY['OBC-NCL'], NULL, NULL,
  100000, true, now()
),
(
  'PM-YASASVI Post-Matric Scholarship (formerly Pre-Matric/Post-Matric for OBC/EBC/DNT)',
  'Ministry of Social Justice and Empowerment',
  'Centrally sponsored scholarship for OBC, EBC, and De-notified Tribes pursuing professional courses.',
  '{"categories": ["OBC-NCL", "EWS"], "family_income_limit": 250000}',
  'Full tuition (up to ₹2 lakh/year for medical) + ₹3,000/month maintenance',
  36000, 236000,
  'https://yet.gov.in',
  ARRAY['OBC-NCL', 'EWS'], NULL, NULL,
  250000, true, now()
),
(
  'Merit-cum-Means Scholarship for Minority Communities',
  'Ministry of Minority Affairs',
  'For students from notified minority communities (Muslim, Christian, Sikh, Buddhist, Jain, Parsi) pursuing professional courses.',
  '{"minority": true, "family_income_limit": 250000}',
  'Full course fees up to ₹20,000/year + ₹1,000/month maintenance',
  12000, 32000,
  'https://scholarships.gov.in',
  NULL, NULL, NULL,
  250000, true, now()
),
(
  'National Fellowship for Persons with Disabilities (PwD)',
  'Department of Empowerment of Persons with Disabilities',
  'Financial support for PwD students pursuing professional and technical education including MBBS/BDS.',
  '{"pwd": true, "disability_percentage": 40}',
  'Up to ₹30,000/year + reader/transport allowance',
  30000, 30000,
  'https://scholarships.gov.in',
  ARRAY['General-PwD','OBC-PwD','SC-PwD','ST-PwD','EWS-PwD'], NULL, NULL,
  NULL, true, now()
),
(
  'AICTE Pragati Scholarship for Girls',
  'AICTE (All India Council for Technical Education)',
  'For girl students admitted to AICTE-approved institutions in first year of professional degree courses.',
  '{"gender": "female", "family_income_limit": 800000}',
  '₹50,000 per year for up to 4 years + ₹2,000/year incidentals',
  50000, 50000,
  'https://www.aicte-india.org/schemes/students-development-schemes/PRAGATI',
  NULL, NULL, NULL,
  800000, true, now()
),
(
  'Maulana Azad National Fellowship for Minority Students',
  'Ministry of Minority Affairs / UGC',
  'Fellowship for students from notified minority communities pursuing higher education including M.D./M.S.',
  '{"minority": true, "level": "postgraduate"}',
  '₹25,000/month (JRF) and ₹28,000/month (SRF) + HRA + contingency',
  300000, 336000,
  'https://scholarships.gov.in',
  NULL, NULL, NULL,
  NULL, true, now()
),
(
  'KVPY/INSPIRE Scholarship (for medical research pathway)',
  'Department of Science and Technology',
  'For top NEET rankers pursuing MBBS with research inclination. Covers tuition and provides research mentorship.',
  '{"min_percentile": 90}',
  '₹80,000 per year scholarship + ₹20,000/year contingency grant',
  80000, 100000,
  'https://online-inspire.gov.in',
  NULL, NULL, ARRAY['MBBS'],
  NULL, true, now()
)
ON CONFLICT DO NOTHING;

-- ── Counselling Calendar — Per-authority, per-round schedule ──────────────────
CREATE TABLE IF NOT EXISTS counselling_calendar (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  authority       TEXT NOT NULL,                -- 'MCC-AIQ', 'AACCC-AYUSH', 'STATE:Madhya Pradesh', etc.
  neet_year       INTEGER NOT NULL,
  round_number    INTEGER NOT NULL,
  round_label     TEXT NOT NULL,                -- 'Round 1', 'Round 2', 'Mop Up', 'Stray Vacancy'
  reg_start       DATE,                         -- NULL = dates not yet published
  reg_end         DATE,
  choice_fill_start DATE,
  choice_fill_end   DATE,
  result_date     DATE,
  reporting_start DATE,
  reporting_end   DATE,
  status          TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN (
    'upcoming', 'open', 'closed', 'result_declared', 'reporting', 'completed'
  )),
  source_url      TEXT,
  source_id       UUID REFERENCES sources(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),

  UNIQUE(authority, neet_year, round_number)
);

CREATE INDEX IF NOT EXISTS idx_cc_authority ON counselling_calendar(authority);
CREATE INDEX IF NOT EXISTS idx_cc_year ON counselling_calendar(neet_year);
CREATE INDEX IF NOT EXISTS idx_cc_status ON counselling_calendar(status);

CREATE TRIGGER counselling_calendar_updated_at BEFORE UPDATE ON counselling_calendar
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE counselling_calendar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read counselling_calendar" ON counselling_calendar FOR SELECT USING (true);
CREATE POLICY "Service write counselling_calendar" ON counselling_calendar FOR ALL USING (true) WITH CHECK (true);

-- Seed MCC AIQ 2026 calendar (based on published schedule dated 01.08.2026)
INSERT INTO counselling_calendar (authority, neet_year, round_number, round_label, reg_start, reg_end, status, source_url) VALUES
  ('MCC-AIQ', 2026, 1, 'Round 1', '2026-08-05', '2026-08-12', 'open', 'https://mcc.nic.in/ug-medical-counselling/'),
  ('MCC-AIQ', 2026, 2, 'Round 2', NULL, NULL, 'upcoming', 'https://mcc.nic.in/ug-medical-counselling/'),
  ('MCC-AIQ', 2026, 3, 'Round 3', NULL, NULL, 'upcoming', 'https://mcc.nic.in/ug-medical-counselling/'),
  ('MCC-AIQ', 2026, 4, 'Mop Up', NULL, NULL, 'upcoming', 'https://mcc.nic.in/ug-medical-counselling/'),
  ('MCC-AIQ', 2026, 5, 'Stray Vacancy', NULL, NULL, 'upcoming', 'https://mcc.nic.in/ug-medical-counselling/'),
  ('AACCC-AYUSH', 2026, 1, 'Round 1', NULL, NULL, 'upcoming', 'https://aaccc.gov.in'),
  ('AACCC-AYUSH', 2026, 2, 'Round 2', NULL, NULL, 'upcoming', 'https://aaccc.gov.in'),
  ('AACCC-AYUSH', 2026, 3, 'Mop Up', NULL, NULL, 'upcoming', 'https://aaccc.gov.in')
ON CONFLICT DO NOTHING;

-- ── Add source_id FK to existing tables (optional enrichment) ────────────────
-- These are nullable columns that can be populated going forward
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cutoffs' AND column_name = 'source_id') THEN
    ALTER TABLE cutoffs ADD COLUMN source_id UUID REFERENCES sources(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'colleges' AND column_name = 'source_id') THEN
    ALTER TABLE colleges ADD COLUMN source_id UUID REFERENCES sources(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'seat_matrix' AND column_name = 'source_id') THEN
    ALTER TABLE seat_matrix ADD COLUMN source_id UUID REFERENCES sources(id);
  END IF;
END $$;
