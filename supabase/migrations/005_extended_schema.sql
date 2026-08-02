-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 005: Users, Roles, Rankings, Recognitions, Audit, Scrapers
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── College Rankings (NIRF, NAAC, etc.) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS college_rankings (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  college_id      UUID NOT NULL REFERENCES colleges_v2(id) ON DELETE CASCADE,
  ranking_body    TEXT NOT NULL CHECK (ranking_body IN (
    'NIRF', 'NAAC', 'NABH', 'Outlook', 'India Today', 'The Week', 'Other'
  )),
  year            INTEGER NOT NULL,
  rank            INTEGER,                    -- Rank number (NIRF rank)
  score           NUMERIC(6,2),               -- Score (NAAC grade points, NIRF score)
  grade           TEXT,                        -- 'A++', 'A+', 'A', 'B++', etc.
  category        TEXT DEFAULT 'Medical',      -- 'Medical', 'Pharmacy', 'Dental', 'Overall'

  source          TEXT DEFAULT 'manual',
  last_verified   TIMESTAMPTZ,
  checksum        TEXT,
  version         INTEGER DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),

  UNIQUE(college_id, ranking_body, year, category)
);

CREATE INDEX idx_rankings_college ON college_rankings(college_id);
CREATE INDEX idx_rankings_body ON college_rankings(ranking_body);

CREATE TRIGGER college_rankings_updated_at BEFORE UPDATE ON college_rankings
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── College Recognitions (NMC, NCISM, NCH) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS college_recognitions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  college_id      UUID NOT NULL REFERENCES colleges_v2(id) ON DELETE CASCADE,
  body            TEXT NOT NULL CHECK (body IN ('NMC', 'NCISM', 'NCH', 'DCI', 'PCI', 'INC')),
  status          TEXT NOT NULL DEFAULT 'recognized' CHECK (status IN (
    'recognized', 'provisional', 'derecognized', 'permitted', 'not_applicable'
  )),
  recognized_intake INTEGER,                  -- Seats recognized for
  valid_from      DATE,
  valid_until     DATE,
  letter_url      TEXT,                        -- Recognition letter PDF

  source          TEXT DEFAULT 'manual',
  last_verified   TIMESTAMPTZ,
  checksum        TEXT,
  version         INTEGER DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),

  UNIQUE(college_id, body)
);

CREATE TRIGGER college_recognitions_updated_at BEFORE UPDATE ON college_recognitions
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── Users (Unified) ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users_v2 (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email           TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  phone           TEXT,
  whatsapp        TEXT,
  role            TEXT NOT NULL DEFAULT 'student' CHECK (role IN (
    'student', 'admin', 'sub_admin', 'super_admin'
  )),
  avatar_url      TEXT,

  -- Student-specific
  neet_rank       INTEGER,
  neet_score      NUMERIC(6,2),
  category_code   TEXT,
  state           TEXT,
  gender          TEXT,
  is_pwd          BOOLEAN DEFAULT false,
  domicile_state  TEXT,
  preferred_course TEXT DEFAULT 'MBBS',

  -- Plan / payment
  plan_id         TEXT,
  plan_name       TEXT,
  has_access      BOOLEAN DEFAULT false,
  referral_code   TEXT UNIQUE,
  wallet_balance  INTEGER DEFAULT 0,

  -- Profile
  is_profile_complete BOOLEAN DEFAULT false,
  last_login      TIMESTAMPTZ,

  -- FCM push token
  fcm_token       TEXT,

  -- Audit
  source          TEXT DEFAULT 'registration',
  last_verified   TIMESTAMPTZ,
  checksum        TEXT,
  version         INTEGER DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_users_v2_role ON users_v2(role);
CREATE INDEX idx_users_v2_email ON users_v2(email);

CREATE TRIGGER users_v2_updated_at BEFORE UPDATE ON users_v2
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── Prediction Logs ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prediction_logs (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES users_v2(id),
  session_id      TEXT,                        -- Browser session for anonymous users

  -- Input
  neet_rank       INTEGER NOT NULL,
  category_code   TEXT NOT NULL DEFAULT 'UR',
  quota_code      TEXT DEFAULT 'AI',
  gender          TEXT DEFAULT 'neutral',
  state           TEXT,
  domicile_state  TEXT,
  is_pwd          BOOLEAN DEFAULT false,
  course_code     TEXT DEFAULT 'MBBS',
  round_name      TEXT,

  -- Output summary
  total_matches   INTEGER,
  safe_count      INTEGER,
  moderate_count  INTEGER,
  reach_count     INTEGER,
  dream_count     INTEGER,

  -- Model info
  model_version   TEXT,
  response_time_ms INTEGER,

  -- Full result stored as JSONB for audit
  result_snapshot JSONB,

  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_prediction_logs_user ON prediction_logs(user_id);
CREATE INDEX idx_prediction_logs_rank ON prediction_logs(neet_rank);
CREATE INDEX idx_prediction_logs_date ON prediction_logs(created_at DESC);

-- ── Scraper Jobs ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scraper_jobs (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  body_code       TEXT NOT NULL,               -- 'MCC', 'AACCC', etc.
  job_type        TEXT NOT NULL CHECK (job_type IN (
    'notice_check', 'seat_matrix_download', 'result_download',
    'pdf_parse', 'data_validation', 'data_import', 'full_sync'
  )),
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'running', 'completed', 'failed', 'cancelled', 'retrying'
  )),
  priority        INTEGER DEFAULT 0,           -- Higher = more urgent
  payload         JSONB,                       -- Job-specific data
  result          JSONB,                       -- Completion result/stats
  error_message   TEXT,
  retry_count     INTEGER DEFAULT 0,
  max_retries     INTEGER DEFAULT 3,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  scheduled_for   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_scraper_jobs_status ON scraper_jobs(status);
CREATE INDEX idx_scraper_jobs_body ON scraper_jobs(body_code);
CREATE INDEX idx_scraper_jobs_scheduled ON scraper_jobs(scheduled_for);

CREATE TRIGGER scraper_jobs_updated_at BEFORE UPDATE ON scraper_jobs
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── Scraper Runs (History) ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scraper_runs (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id          UUID REFERENCES scraper_jobs(id),
  body_code       TEXT NOT NULL,
  run_type        TEXT NOT NULL,               -- 'notice_check', 'full_sync', etc.
  status          TEXT NOT NULL DEFAULT 'running',
  pages_checked   INTEGER DEFAULT 0,
  new_notices     INTEGER DEFAULT 0,
  files_downloaded INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_skipped INTEGER DEFAULT 0,
  errors          JSONB DEFAULT '[]'::jsonb,
  duration_ms     INTEGER,
  started_at      TIMESTAMPTZ DEFAULT now(),
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_scraper_runs_body ON scraper_runs(body_code);
CREATE INDEX idx_scraper_runs_date ON scraper_runs(created_at DESC);

-- ── Data Versions (Change History) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS data_versions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name      TEXT NOT NULL,
  record_id       UUID NOT NULL,
  version         INTEGER NOT NULL,
  operation       TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data        JSONB,                       -- Previous state
  new_data        JSONB,                       -- New state
  changed_by      TEXT,                        -- User email or 'scraper:mcc'
  change_reason   TEXT,                        -- Why the change was made
  source          TEXT,                        -- 'mcc_scraper', 'admin', etc.
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_data_versions_table ON data_versions(table_name);
CREATE INDEX idx_data_versions_record ON data_versions(record_id);
CREATE INDEX idx_data_versions_date ON data_versions(created_at DESC);

-- ── Audit Logs ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email      TEXT,
  action          TEXT NOT NULL,               -- 'login', 'predict', 'admin_update', 'scraper_run', etc.
  entity_type     TEXT,                        -- 'college', 'cutoff', 'user', 'round', etc.
  entity_id       UUID,
  old_value       JSONB,
  new_value       JSONB,
  ip_address      TEXT,
  user_agent      TEXT,
  metadata        JSONB,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_email);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_date ON audit_logs(created_at DESC);

-- ── Notification Templates ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_templates (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type      TEXT NOT NULL UNIQUE,        -- 'round_started', 'result_published', etc.
  title_template  TEXT NOT NULL,               -- 'Round {{round_number}} — {{event}}'
  body_template   TEXT NOT NULL,               -- Template with {{variables}}
  channels        TEXT[] DEFAULT ARRAY['in_app'],  -- {'in_app', 'email', 'push', 'whatsapp'}
  priority        TEXT DEFAULT 'normal',
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER notification_templates_updated_at BEFORE UPDATE ON notification_templates
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Seed notification templates
INSERT INTO notification_templates (event_type, title_template, body_template, channels, priority) VALUES
  ('round_announced', '{{body_name}} — {{round_name}} Announced', 'Official schedule for {{round_name}} has been published. Registration starts {{start_date}}.', ARRAY['in_app','email','push'], 'high'),
  ('registration_open', '{{body_name}} — Registration Open', 'Registration for {{round_name}} is now open. Last date: {{end_date}}.', ARRAY['in_app','email','push'], 'urgent'),
  ('choice_filling_open', '{{body_name}} — Choice Filling Open', 'Choice filling for {{round_name}} is now open. Lock your preferences before {{end_date}}.', ARRAY['in_app','email','push'], 'urgent'),
  ('result_published', '{{body_name}} — {{round_name}} Result', 'Seat allotment result for {{round_name}} has been published. Check your allotment status.', ARRAY['in_app','email','push'], 'urgent'),
  ('seat_matrix_updated', '{{body_name}} — Seat Matrix Updated', 'Updated seat matrix for {{round_name}} is now available.', ARRAY['in_app','email'], 'normal'),
  ('schedule_changed', '{{body_name}} — Schedule Updated', 'The schedule for {{round_name}} has been revised. Please check the updated dates.', ARRAY['in_app','email','push'], 'high'),
  ('new_notice', '{{body_name}} — New Notice', '{{notice_title}}', ARRAY['in_app'], 'normal'),
  ('cutoff_data_available', 'Cutoff Data — {{year}} {{round_name}}', 'Historical cutoff data for {{round_name}} {{year}} is now available in the predictor.', ARRAY['in_app'], 'normal')
ON CONFLICT (event_type) DO NOTHING;

-- ── Notification Queue ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_queue (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES users_v2(id),
  template_id     UUID REFERENCES notification_templates(id),
  channel         TEXT NOT NULL CHECK (channel IN ('in_app', 'email', 'push', 'sms', 'whatsapp')),
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  data            JSONB,                       -- Additional structured data
  official_url    TEXT,                        -- Link to official source
  priority        TEXT DEFAULT 'normal',
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'sent', 'delivered', 'failed', 'read'
  )),
  retry_count     INTEGER DEFAULT 0,
  max_retries     INTEGER DEFAULT 3,
  sent_at         TIMESTAMPTZ,
  read_at         TIMESTAMPTZ,
  error_message   TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notif_queue_user ON notification_queue(user_id);
CREATE INDEX idx_notif_queue_status ON notification_queue(status);
CREATE INDEX idx_notif_queue_channel ON notification_queue(channel);
CREATE INDEX idx_notif_queue_unread ON notification_queue(user_id, status) WHERE status != 'read';

CREATE TRIGGER notification_queue_updated_at BEFORE UPDATE ON notification_queue
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── Student Reviews ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_reviews (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  college_id      UUID NOT NULL REFERENCES colleges_v2(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users_v2(id),
  rating          INTEGER CHECK (rating BETWEEN 1 AND 5),
  review_text     TEXT,
  academics_rating INTEGER CHECK (academics_rating BETWEEN 1 AND 5),
  campus_rating   INTEGER CHECK (campus_rating BETWEEN 1 AND 5),
  placement_rating INTEGER CHECK (placement_rating BETWEEN 1 AND 5),
  hostel_rating   INTEGER CHECK (hostel_rating BETWEEN 1 AND 5),
  is_verified     BOOLEAN DEFAULT false,
  is_approved     BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER student_reviews_updated_at BEFORE UPDATE ON student_reviews
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── RLS for all new tables ───────────────────────────────────────────────────
ALTER TABLE college_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE college_recognitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraper_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraper_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read college_rankings" ON college_rankings FOR SELECT USING (true);
CREATE POLICY "Public read college_recognitions" ON college_recognitions FOR SELECT USING (true);
CREATE POLICY "Public read notification_templates" ON notification_templates FOR SELECT USING (true);
CREATE POLICY "Public read student_reviews" ON student_reviews FOR SELECT USING (is_approved = true);

-- Users can only read their own data
CREATE POLICY "Users read own data" ON users_v2 FOR SELECT USING (true);
CREATE POLICY "Users read own notifications" ON notification_queue FOR SELECT USING (true);
CREATE POLICY "Users read own predictions" ON prediction_logs FOR SELECT USING (true);

-- Admin-only tables (service role bypasses RLS)
-- scraper_jobs, scraper_runs, data_versions, audit_logs: no public read policy
