-- ============================================================================
-- 020_fix_sync_triggers_and_duplicates.sql
-- Fix duplicate key violations during profile sync triggers
-- ============================================================================

-- 1. Fix the trigger function to prevent unique constraint violations
CREATE OR REPLACE FUNCTION sync_profile_to_student_counselling()
RETURNS TRIGGER AS $$
DECLARE
  v_student_id BIGINT;
BEGIN
  -- 1. Safely find if student already exists in student_counselling
  -- Prefer matching by exact user_id first to avoid violating user_id unique constraints
  SELECT id INTO v_student_id
  FROM student_counselling
  WHERE user_id = NEW.id
  LIMIT 1;

  -- If not found by user_id, fallback to matching by email
  IF v_student_id IS NULL AND NEW.email IS NOT NULL AND NEW.email != '' THEN
    SELECT id INTO v_student_id
    FROM student_counselling
    WHERE lower(trim(email)) = lower(trim(NEW.email))
    ORDER BY id ASC
    LIMIT 1;
  END IF;

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

  -- 2. Safely sync to students table (handling email unique constraints if they exist)
  -- If a different student record exists with the same email, we shouldn't attempt to insert/update it with a conflict
  -- This relies on ON CONFLICT (id), but if there's an email conflict it would throw. 
  -- We'll safely wrap the students sync so it doesn't break the entire profile update.
  BEGIN
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
  EXCEPTION WHEN OTHERS THEN
    -- Ignore conflicts on students table to prevent profile update from crashing
    RAISE WARNING 'Failed to sync to students table: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
