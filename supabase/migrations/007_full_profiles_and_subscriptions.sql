-- ============================================================================
-- 007_full_profiles_and_subscriptions.sql
-- Full Profiles, Subscriptions, Payments, Preferences, and Prediction History
-- Safe & Idempotent: Uses ALTER TABLE ADD COLUMN IF NOT EXISTS everywhere.
-- ============================================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. EXPAND PROFILES TABLE
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

-- Personal Information
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email                  TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name              TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS name                   TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone                  TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url             TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS date_of_birth          DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender                 TEXT DEFAULT 'Other';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS state                  TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS district               TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS category               TEXT DEFAULT 'General';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sub_category           TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS domicile               TEXT DEFAULT 'Madhya Pradesh';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS domicile_state         TEXT;

-- Academic Information
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS exam                   TEXT DEFAULT 'NEET UG';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS neet_roll_number       TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS neet_rank              INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rank                   TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS neet_score             NUMERIC(6,2);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS score                  NUMERIC(6,2);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS marks                  TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS neet_percentile        NUMERIC(6,3);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS percentile             NUMERIC(6,3);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pcb_percentage         NUMERIC(5,2);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS twelfth_percentage     NUMERIC(5,2);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS passing_year           INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS attempt_number         INTEGER DEFAULT 1;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS predicted_rank_min     INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS predicted_rank_max     INTEGER;

-- Reservation Information
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pwd_status             BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ews_status             BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS defence_quota          BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS freedom_fighter_quota  BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS minority_status        TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS other_reservations     TEXT;

-- Counselling Preferences
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_states       JSONB DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_course       TEXT DEFAULT 'MBBS';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS college_preference     TEXT DEFAULT 'Both'; -- Government, Private, Both
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tuition_budget         TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hostel_required        BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS language_preference    TEXT DEFAULT 'English';

-- Subscription & Payment State
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_premium             BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status    TEXT DEFAULT 'free'; -- free, active, expired, cancelled
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_plan      TEXT DEFAULT 'Free Plan';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payment_status          TEXT DEFAULT 'Unpaid';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS package_id             TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS premium_start_date     TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS premium_end_date       TIMESTAMPTZ;

-- Referral & Onboarding
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role                   TEXT DEFAULT 'student';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code          TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by            TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_completed      BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_done        BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at             TIMESTAMPTZ DEFAULT now();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at             TIMESTAMPTZ DEFAULT now();

-- Ensure email indexes for quick lookup
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_refcode ON profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_premium ON profiles(is_premium);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. SUBSCRIPTIONS TABLE
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID,
  plan_slug TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'INR',
  status TEXT DEFAULT 'active', -- active, expired, cancelled, pending
  gateway TEXT DEFAULT 'razorpay',
  payment_id TEXT,
  order_id TEXT,
  start_date TIMESTAMPTZ DEFAULT now(),
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS plan_slug TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS plan_name TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS gateway TEXT DEFAULT 'razorpay';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS payment_id TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS order_id TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ DEFAULT now();
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. PAYMENTS TABLE
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS payments (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID,
  order_id TEXT,
  payment_id TEXT,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'INR',
  status TEXT DEFAULT 'created', -- created, captured, failed, refunded
  gateway TEXT DEFAULT 'razorpay',
  plan_slug TEXT,
  receipt TEXT,
  signature TEXT,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE payments ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS order_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'created';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway TEXT DEFAULT 'razorpay';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS plan_slug TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS signature TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}'::jsonb;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_id ON payments(payment_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. PREDICTION HISTORY TABLE
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS prediction_history (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID,
  exam TEXT DEFAULT 'NEET UG',
  neet_rank INTEGER,
  neet_score NUMERIC(6,2),
  category TEXT DEFAULT 'General',
  domicile_state TEXT,
  quota TEXT DEFAULT 'All India',
  round_preferred TEXT DEFAULT 'Round 1',
  predictions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE prediction_history ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE prediction_history ADD COLUMN IF NOT EXISTS exam TEXT DEFAULT 'NEET UG';
ALTER TABLE prediction_history ADD COLUMN IF NOT EXISTS neet_rank INTEGER;
ALTER TABLE prediction_history ADD COLUMN IF NOT EXISTS neet_score NUMERIC(6,2);
ALTER TABLE prediction_history ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General';
ALTER TABLE prediction_history ADD COLUMN IF NOT EXISTS domicile_state TEXT;
ALTER TABLE prediction_history ADD COLUMN IF NOT EXISTS quota TEXT DEFAULT 'All India';
ALTER TABLE prediction_history ADD COLUMN IF NOT EXISTS round_preferred TEXT DEFAULT 'Round 1';
ALTER TABLE prediction_history ADD COLUMN IF NOT EXISTS predictions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE prediction_history ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_prediction_history_user ON prediction_history(user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. BOOKMARKS TABLE
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS bookmarks (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID,
  college_id BIGINT,
  college_name TEXT,
  course TEXT DEFAULT 'MBBS',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE bookmarks ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE bookmarks ADD COLUMN IF NOT EXISTS college_id BIGINT;
ALTER TABLE bookmarks ADD COLUMN IF NOT EXISTS college_name TEXT;
ALTER TABLE bookmarks ADD COLUMN IF NOT EXISTS course TEXT DEFAULT 'MBBS';
ALTER TABLE bookmarks ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE bookmarks ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. USER PREFERENCES TABLE
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_preferences (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID UNIQUE,
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. WALLETS & REFERRALS SAFETY CHECK
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS wallets (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID UNIQUE,
  balance NUMERIC(10,2) DEFAULT 0,
  lifetime_earned NUMERIC(10,2) DEFAULT 0,
  lifetime_withdrawn NUMERIC(10,2) DEFAULT 0,
  referral_code TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE wallets ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS balance NUMERIC(10,2) DEFAULT 0;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS lifetime_earned NUMERIC(10,2) DEFAULT 0;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS lifetime_withdrawn NUMERIC(10,2) DEFAULT 0;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID,
  type TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  balance_after NUMERIC(10,2) NOT NULL DEFAULT 0,
  description TEXT,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS balance_after NUMERIC(10,2) DEFAULT 0;
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}'::jsonb;
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

CREATE TABLE IF NOT EXISTS referrals (
  id BIGSERIAL PRIMARY KEY,
  referrer_id UUID,
  referee_id UUID,
  referee_email TEXT,
  referee_name TEXT,
  referral_code TEXT,
  status TEXT DEFAULT 'pending', -- pending, completed, rejected
  referrer_reward NUMERIC(10,2) DEFAULT 500,
  referee_discount NUMERIC(10,2) DEFAULT 500,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referrer_id UUID;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referee_id UUID;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referee_email TEXT;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referee_name TEXT;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referrer_reward NUMERIC(10,2) DEFAULT 500;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referee_discount NUMERIC(10,2) DEFAULT 500;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. ROW LEVEL SECURITY & POLICIES
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Clean existing policies
DROP POLICY IF EXISTS "Users can read/write own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can read own payments" ON payments;
DROP POLICY IF EXISTS "Users can manage own predictions" ON prediction_history;
DROP POLICY IF EXISTS "Users can manage own bookmarks" ON bookmarks;
DROP POLICY IF EXISTS "Users can manage own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can read own wallet" ON wallets;
DROP POLICY IF EXISTS "Users can read own transactions" ON wallet_transactions;
DROP POLICY IF EXISTS "Users can read own referrals" ON referrals;

-- Public / Service role policies
DROP POLICY IF EXISTS "Allow all for authenticated users on profile" ON profiles;
CREATE POLICY "Allow all for authenticated users on profile" ON profiles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for subscriptions" ON subscriptions;
CREATE POLICY "Allow all for subscriptions" ON subscriptions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for payments" ON payments;
CREATE POLICY "Allow all for payments" ON payments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for prediction_history" ON prediction_history;
CREATE POLICY "Allow all for prediction_history" ON prediction_history FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for bookmarks" ON bookmarks;
CREATE POLICY "Allow all for bookmarks" ON bookmarks FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for user_preferences" ON user_preferences;
CREATE POLICY "Allow all for user_preferences" ON user_preferences FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for wallets" ON wallets;
CREATE POLICY "Allow all for wallets" ON wallets FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for wallet_transactions" ON wallet_transactions;
CREATE POLICY "Allow all for wallet_transactions" ON wallet_transactions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for referrals" ON referrals;
CREATE POLICY "Allow all for referrals" ON referrals FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- DONE!
-- ═══════════════════════════════════════════════════════════════════════════
