-- ============================================================================
-- 017_fix_student_duplicates_and_sync.sql
-- Deduplicate student_counselling and fix profile-to-student sync trigger
-- ============================================================================

-- 1. Deduplicate student_counselling: Keep the primary row per user/email
DO $$
DECLARE
  rec RECORD;
  v_primary_id BIGINT;
BEGIN
  -- For each user_id with duplicates
  FOR rec IN (
    SELECT user_id
    FROM student_counselling
    WHERE user_id IS NOT NULL
    GROUP BY user_id
    HAVING count(*) > 1
  ) LOOP
    -- Determine primary ID (prefer assigned, paid, or most recent)
    SELECT id INTO v_primary_id
    FROM student_counselling
    WHERE user_id = rec.user_id
    ORDER BY (assigned_to IS NOT NULL) DESC, (payment_status = 'paid') DESC, updated_at DESC, id ASC
    LIMIT 1;

    -- Re-link child records
    UPDATE counselling_notes SET student_id = v_primary_id WHERE student_id IN (SELECT id FROM student_counselling WHERE user_id = rec.user_id AND id != v_primary_id);
    UPDATE counselling_followups SET student_id = v_primary_id WHERE student_id IN (SELECT id FROM student_counselling WHERE user_id = rec.user_id AND id != v_primary_id);
    UPDATE student_documents SET student_id = v_primary_id WHERE student_id IN (SELECT id FROM student_counselling WHERE user_id = rec.user_id AND id != v_primary_id);
    UPDATE student_messages SET student_id = v_primary_id WHERE student_id IN (SELECT id FROM student_counselling WHERE user_id = rec.user_id AND id != v_primary_id);
    UPDATE purchases SET student_id = v_primary_id WHERE student_id IN (SELECT id FROM student_counselling WHERE user_id = rec.user_id AND id != v_primary_id);

    -- Delete duplicates
    DELETE FROM student_counselling WHERE user_id = rec.user_id AND id != v_primary_id;
  END LOOP;

  -- For each email with duplicates
  FOR rec IN (
    SELECT lower(email) AS em
    FROM student_counselling
    WHERE email IS NOT NULL AND email != ''
    GROUP BY lower(email)
    HAVING count(*) > 1
  ) LOOP
    SELECT id INTO v_primary_id
    FROM student_counselling
    WHERE lower(email) = rec.em
    ORDER BY (assigned_to IS NOT NULL) DESC, (payment_status = 'paid') DESC, updated_at DESC, id ASC
    LIMIT 1;

    UPDATE counselling_notes SET student_id = v_primary_id WHERE student_id IN (SELECT id FROM student_counselling WHERE lower(email) = rec.em AND id != v_primary_id);
    UPDATE counselling_followups SET student_id = v_primary_id WHERE student_id IN (SELECT id FROM student_counselling WHERE lower(email) = rec.em AND id != v_primary_id);
    UPDATE student_documents SET student_id = v_primary_id WHERE student_id IN (SELECT id FROM student_counselling WHERE lower(email) = rec.em AND id != v_primary_id);
    UPDATE student_messages SET student_id = v_primary_id WHERE student_id IN (SELECT id FROM student_counselling WHERE lower(email) = rec.em AND id != v_primary_id);
    UPDATE purchases SET student_id = v_primary_id WHERE student_id IN (SELECT id FROM student_counselling WHERE lower(email) = rec.em AND id != v_primary_id);

    DELETE FROM student_counselling WHERE lower(email) = rec.em AND id != v_primary_id;
  END LOOP;
END $$;

-- 2. Create Unique Partial Indexes to prevent future duplicates at DB level
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_counselling_unique_user ON student_counselling(user_id) WHERE user_id IS NOT NULL;

-- 3. Replace Trigger Function with Safe IF-EXISTS check instead of blind INSERT
CREATE OR REPLACE FUNCTION sync_profile_to_student_counselling()
RETURNS TRIGGER AS $$
DECLARE
  v_student_id BIGINT;
BEGIN
  -- 1. Find if student already exists in student_counselling
  SELECT id INTO v_student_id
  FROM student_counselling
  WHERE user_id = NEW.id
     OR (email = NEW.email AND NEW.email IS NOT NULL AND NEW.email != '')
  ORDER BY id ASC
  LIMIT 1;

  IF v_student_id IS NOT NULL THEN
    -- Update existing row
    UPDATE student_counselling SET
      user_id = COALESCE(user_id, NEW.id),
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
    WHERE id = v_student_id;
  ELSE
    -- Insert new unique student record
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
    );
  END IF;

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
