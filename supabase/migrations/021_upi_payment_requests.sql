-- ============================================================================
-- 021_upi_payment_requests.sql
-- UPI Manual Payment Requests Table for QR Code Payment Flow
-- ============================================================================

CREATE TABLE IF NOT EXISTS upi_payment_requests (
  id                BIGSERIAL PRIMARY KEY,
  user_id           UUID NOT NULL,
  plan_slug         TEXT NOT NULL,
  plan_name         TEXT NOT NULL,
  amount            NUMERIC(10,2) NOT NULL DEFAULT 0,
  utr_number        TEXT NOT NULL,
  screenshot_url    TEXT,
  status            TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  admin_note        TEXT,
  approved_by       UUID,
  approved_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE upi_payment_requests ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE upi_payment_requests ADD COLUMN IF NOT EXISTS plan_slug TEXT;
ALTER TABLE upi_payment_requests ADD COLUMN IF NOT EXISTS plan_name TEXT;
ALTER TABLE upi_payment_requests ADD COLUMN IF NOT EXISTS amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE upi_payment_requests ADD COLUMN IF NOT EXISTS utr_number TEXT;
ALTER TABLE upi_payment_requests ADD COLUMN IF NOT EXISTS screenshot_url TEXT;
ALTER TABLE upi_payment_requests ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE upi_payment_requests ADD COLUMN IF NOT EXISTS admin_note TEXT;
ALTER TABLE upi_payment_requests ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE upi_payment_requests ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE upi_payment_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE upi_payment_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_upi_requests_user ON upi_payment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_upi_requests_status ON upi_payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_upi_requests_utr ON upi_payment_requests(utr_number);

-- RLS
ALTER TABLE upi_payment_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all upi_payment_requests" ON upi_payment_requests;
CREATE POLICY "Allow all upi_payment_requests" ON upi_payment_requests FOR ALL USING (true) WITH CHECK (true);

-- Push subscription tokens table (for Web Push / Service Worker)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL UNIQUE,
  endpoint    TEXT NOT NULL,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS endpoint TEXT;
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS p256dh TEXT;
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS auth TEXT;
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all push_subscriptions" ON push_subscriptions;
CREATE POLICY "Allow all push_subscriptions" ON push_subscriptions FOR ALL USING (true) WITH CHECK (true);
