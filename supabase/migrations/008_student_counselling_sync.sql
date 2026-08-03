-- ============================================================================
-- 008_student_counselling_sync.sql
-- Comprehensive CRM, Students Table, Staff Profiles, and Automatic Profile Sync
-- ============================================================================

-- ── 1. staff_profiles (Admins, Counsellors, Sub-admins) ─────────────────────
CREATE TABLE IF NOT EXISTS staff_profiles (
  id                    BIGSERIAL PRIMARY KEY,
  user_id               UUID UNIQUE,
  name                  TEXT NOT NULL,
  email                 TEXT NOT NULL UNIQUE,
  phone                 TEXT,
  role                  TEXT NOT NULL DEFAULT 'sub_admin', -- 'super_admin' | 'sub_admin' | 'counsellor'
  is_active             BOOLEAN DEFAULT true,
  max_students          INTEGER DEFAULT 50,
  total_sessions        INTEGER DEFAULT 0,
  successful_admissions INTEGER DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_user ON staff_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_email ON staff_profiles(email);
CREATE INDEX IF NOT EXISTS idx_staff_role ON staff_profiles(role);

-- ── 2. student_counselling (Unified Student CRM Record) ────────────────────
CREATE TABLE IF NOT EXISTS student_counselling (
  id                    BIGSERIAL PRIMARY KEY,
  user_id               UUID,
  full_name             TEXT NOT NULL,
  email                 TEXT NOT NULL DEFAULT '',
  phone                 TEXT NOT NULL DEFAULT '',
  neet_rank             INTEGER,
  score                 NUMERIC(6,2),
  state                 TEXT DEFAULT '',
  category              TEXT DEFAULT 'General',
  exam                  TEXT DEFAULT 'NEET UG',
  purchased_course      TEXT DEFAULT 'MBBS',
  purchased_counselling TEXT DEFAULT '',
  payment_status        TEXT DEFAULT 'pending', -- 'pending' | 'paid' | 'partial' | 'refunded'
  payment_amount        NUMERIC(10,2) DEFAULT 0,
  assigned_to           UUID REFERENCES staff_profiles(user_id) ON DELETE SET NULL,
  counselling_status    TEXT DEFAULT 'new', -- 'new' | 'assigned' | 'in_progress' | 'follow_up' | 'completed' | 'admitted' | 'closed'
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

-- Add missing columns if table already existed
ALTER TABLE student_counselling ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE student_counselling ADD COLUMN IF NOT EXISTS score NUMERIC(6,2);
ALTER TABLE student_counselling ADD COLUMN IF NOT EXISTS state TEXT DEFAULT '';
ALTER TABLE student_counselling ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General';
ALTER TABLE student_counselling ADD COLUMN IF NOT EXISTS exam TEXT DEFAULT 'NEET UG';
ALTER TABLE student_counselling ADD COLUMN IF NOT EXISTS purchased_course TEXT DEFAULT 'MBBS';
ALTER TABLE student_counselling ADD COLUMN IF NOT EXISTS counselling_status TEXT DEFAULT 'new';

CREATE INDEX IF NOT EXISTS idx_student_counselling_user ON student_counselling(user_id);
CREATE INDEX IF NOT EXISTS idx_student_counselling_email ON student_counselling(email);
CREATE INDEX IF NOT EXISTS idx_student_counselling_phone ON student_counselling(phone);
CREATE INDEX IF NOT EXISTS idx_student_counselling_status ON student_counselling(counselling_status);
CREATE INDEX IF NOT EXISTS idx_student_counselling_assigned ON student_counselling(assigned_to);

-- ── 3. students (Direct Alias Table for compatibility) ──────────────────────
CREATE TABLE IF NOT EXISTS students (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID,
  name                  TEXT,
  full_name             TEXT,
  email                 TEXT,
  phone                 TEXT,
  neet_score            NUMERIC(6,2),
  score                 NUMERIC(6,2),
  neet_rank             INTEGER,
  category              TEXT DEFAULT 'General',
  domicile_state        TEXT DEFAULT 'Madhya Pradesh',
  state                 TEXT,
  preferred_course      TEXT DEFAULT 'MBBS',
  profile_completed     BOOLEAN DEFAULT false,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_students_user ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);

-- ── 4. counselling_notes (Staff notes per student) ──────────────────────────
CREATE TABLE IF NOT EXISTS counselling_notes (
  id          BIGSERIAL PRIMARY KEY,
  student_id  BIGINT REFERENCES student_counselling(id) ON DELETE CASCADE,
  author_id   UUID,
  author_name TEXT DEFAULT '',
  note        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notes_student ON counselling_notes(student_id);

-- ── 5. counselling_followups (Reminders & Follow-ups) ───────────────────────
CREATE TABLE IF NOT EXISTS counselling_followups (
  id          BIGSERIAL PRIMARY KEY,
  student_id  BIGINT REFERENCES student_counselling(id) ON DELETE CASCADE,
  staff_id    UUID,
  staff_name  TEXT DEFAULT '',
  note        TEXT NOT NULL,
  due_at      TIMESTAMPTZ NOT NULL,
  status      TEXT DEFAULT 'pending', -- 'pending' | 'done' | 'cancelled'
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_followups_student ON counselling_followups(student_id);
CREATE INDEX IF NOT EXISTS idx_followups_due ON counselling_followups(due_at);
CREATE INDEX IF NOT EXISTS idx_followups_staff ON counselling_followups(staff_id);

-- ── 6. student_documents (CRM Documents) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS student_documents (
  id          BIGSERIAL PRIMARY KEY,
  student_id  BIGINT REFERENCES student_counselling(id) ON DELETE CASCADE,
  file_name   TEXT NOT NULL,
  file_url    TEXT NOT NULL,
  doc_type    TEXT DEFAULT 'other',
  status      TEXT DEFAULT 'Pending', -- 'Pending' | 'Verified' | 'Rejected'
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_docs_student ON student_documents(student_id);

-- ── 7. student_messages (Messages between staff and student) ────────────────
CREATE TABLE IF NOT EXISTS student_messages (
  id          BIGSERIAL PRIMARY KEY,
  student_id  BIGINT REFERENCES student_counselling(id) ON DELETE CASCADE,
  sender      TEXT NOT NULL DEFAULT 'student', -- 'student' | 'staff'
  sender_id   UUID,
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_msg_student ON student_messages(student_id);

-- ── 8. purchases (Student subscription & package purchases) ────────────────
CREATE TABLE IF NOT EXISTS purchases (
  id          BIGSERIAL PRIMARY KEY,
  student_id  BIGINT,
  user_id     UUID,
  item_type   TEXT DEFAULT 'package',
  item_name   TEXT NOT NULL,
  amount      NUMERIC(10,2) NOT NULL DEFAULT 0,
  status      TEXT DEFAULT 'completed',
  notes       TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_purchases_student ON purchases(student_id);
CREATE INDEX IF NOT EXISTS idx_purchases_user ON purchases(user_id);

-- ── 9. Automatic Sync Trigger from profiles -> student_counselling ──────────
CREATE OR REPLACE FUNCTION sync_profile_to_student_counselling()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Sync to student_counselling table
  INSERT INTO student_counselling (
    user_id,
    full_name,
    email,
    phone,
    neet_rank,
    score,
    state,
    category,
    exam,
    purchased_course,
    counselling_status,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.full_name, ''), NULLIF(NEW.name, ''), split_part(COALESCE(NEW.email, 'student'), '@', 1)),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.phone, ''),
    NEW.neet_rank,
    COALESCE(NEW.neet_score, NEW.score),
    COALESCE(NULLIF(NEW.domicile_state, ''), NULLIF(NEW.domicile, ''), NULLIF(NEW.state, ''), ''),
    COALESCE(NEW.category, 'General'),
    COALESCE(NEW.exam, 'NEET UG'),
    COALESCE(NEW.preferred_course, 'MBBS'),
    'new',
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Update student_counselling if row exists by user_id or email
  UPDATE student_counselling SET
    full_name = COALESCE(NULLIF(NEW.full_name, ''), NULLIF(NEW.name, ''), full_name),
    email = COALESCE(NULLIF(NEW.email, ''), email),
    phone = COALESCE(NULLIF(NEW.phone, ''), phone),
    neet_rank = COALESCE(NEW.neet_rank, neet_rank),
    score = COALESCE(NEW.neet_score, NEW.score, score),
    state = COALESCE(NULLIF(NEW.domicile_state, ''), NULLIF(NEW.domicile, ''), NULLIF(NEW.state, ''), state),
    category = COALESCE(NEW.category, category),
    exam = COALESCE(NEW.exam, exam),
    purchased_course = COALESCE(NEW.preferred_course, purchased_course),
    updated_at = now()
  WHERE user_id = NEW.id OR (email = NEW.email AND NEW.email IS NOT NULL AND NEW.email != '');

  -- 2. Sync to students table
  INSERT INTO students (
    id,
    user_id,
    name,
    full_name,
    email,
    phone,
    neet_score,
    score,
    neet_rank,
    category,
    domicile_state,
    state,
    preferred_course,
    profile_completed,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.id,
    COALESCE(NULLIF(NEW.full_name, ''), NULLIF(NEW.name, ''), ''),
    COALESCE(NULLIF(NEW.full_name, ''), NULLIF(NEW.name, ''), ''),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.phone, ''),
    COALESCE(NEW.neet_score, NEW.score),
    COALESCE(NEW.neet_score, NEW.score),
    NEW.neet_rank,
    COALESCE(NEW.category, 'General'),
    COALESCE(NULLIF(NEW.domicile_state, ''), NULLIF(NEW.domicile, ''), 'Madhya Pradesh'),
    COALESCE(NULLIF(NEW.state, ''), ''),
    COALESCE(NEW.preferred_course, 'MBBS'),
    COALESCE(NEW.profile_completed, false),
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    neet_score = EXCLUDED.neet_score,
    score = EXCLUDED.score,
    neet_rank = EXCLUDED.neet_rank,
    category = EXCLUDED.category,
    domicile_state = EXCLUDED.domicile_state,
    state = EXCLUDED.state,
    preferred_course = EXCLUDED.preferred_course,
    profile_completed = EXCLUDED.profile_completed,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_profile_to_student_counselling ON profiles;
CREATE TRIGGER trg_sync_profile_to_student_counselling
  AFTER INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_to_student_counselling();

-- ── 10. Enable Row Level Security & Policies ────────────────────────────────
ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_counselling ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE counselling_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE counselling_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all staff_profiles" ON staff_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all student_counselling" ON student_counselling FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all students" ON students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all counselling_notes" ON counselling_notes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all counselling_followups" ON counselling_followups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all student_documents" ON student_documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all student_messages" ON student_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all purchases" ON purchases FOR ALL USING (true) WITH CHECK (true);
