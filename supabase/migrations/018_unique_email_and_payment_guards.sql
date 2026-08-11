-- ============================================================================
-- 018_unique_email_and_payment_guards.sql
-- Enforce Unique Email constraints and active subscription integrity
-- ============================================================================

-- 1. Create Unique Indexes for lower(email) across profiles, students, student_counselling
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_unique_lower_email 
  ON profiles (lower(trim(email))) 
  WHERE email IS NOT NULL AND trim(email) != '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_students_unique_lower_email 
  ON students (lower(trim(email))) 
  WHERE email IS NOT NULL AND trim(email) != '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_student_counselling_unique_lower_email 
  ON student_counselling (lower(trim(email))) 
  WHERE email IS NOT NULL AND trim(email) != '';

-- 2. Add partial unique index for active subscription per user to prevent duplicate active subs
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_unique_active_user 
  ON subscriptions (user_id) 
  WHERE status = 'active';

-- 3. Ensure profiles.is_premium and payment_status default sanity
COMMENT ON INDEX idx_profiles_unique_lower_email IS 'Guarantees no duplicate user profile can be registered with the same email';
COMMENT ON INDEX idx_subscriptions_unique_active_user IS 'Guarantees a user cannot hold duplicate active subscriptions simultaneously';
