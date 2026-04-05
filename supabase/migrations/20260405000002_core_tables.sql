-- =============================================================================
-- Migration 0002: Core Tables — Accounts, Profiles, Billing, Audit, Usage
-- Dwellioo SaaS Platform
-- =============================================================================

-- ---------------------------------------------------------------------------
-- PLAN LIMITS CONFIGURATION
-- One row per plan — referenced by triggers to enforce limits
-- ---------------------------------------------------------------------------
CREATE TABLE plan_limits (
  plan             subscription_plan PRIMARY KEY,
  max_properties   INT NOT NULL DEFAULT 1,
  max_units        INT NOT NULL DEFAULT 20,
  max_staff        INT NOT NULL DEFAULT 3,
  max_wa_sends     INT NOT NULL DEFAULT 100,  -- per month
  white_label      BOOLEAN NOT NULL DEFAULT FALSE,
  trial_days       INT NOT NULL DEFAULT 14
);

INSERT INTO plan_limits (plan, max_properties, max_units, max_staff, max_wa_sends, white_label, trial_days) VALUES
  ('Trial',      1,    30,    3,    100,  FALSE, 14),
  ('Starter',    1,    50,    5,    500,  FALSE, 0),
  ('Growth',     3,    200,   15,   2000, FALSE, 0),
  ('Pro',        10,   500,   50,   10000,TRUE,  0),
  ('Enterprise', 999,  99999, 999,  99999,TRUE,  0);

-- ---------------------------------------------------------------------------
-- ACCOUNTS
-- ---------------------------------------------------------------------------
CREATE TABLE accounts (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id                    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name                        TEXT NOT NULL,
  slug                        TEXT NOT NULL UNIQUE,
  plan                        subscription_plan NOT NULL DEFAULT 'Trial',
  subscription_status         subscription_status NOT NULL DEFAULT 'Trialing',
  trial_ends_at               TIMESTAMPTZ,
  razorpay_subscription_id    TEXT,
  razorpay_customer_id        TEXT,
  -- Denormalized from plan_limits for fast reads
  max_properties              INT NOT NULL DEFAULT 1,
  max_units                   INT NOT NULL DEFAULT 30,
  max_staff                   INT NOT NULL DEFAULT 3,
  max_wa_sends_per_month      INT NOT NULL DEFAULT 100,
  white_label                 BOOLEAN NOT NULL DEFAULT FALSE,
  custom_accent_color         TEXT,
  custom_logo_url             TEXT,
  feature_flags               JSONB NOT NULL DEFAULT '{}',
  deleted_at                  TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- PROFILES  (extends auth.users)
-- ---------------------------------------------------------------------------
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id    UUID REFERENCES accounts(id) ON DELETE SET NULL,  -- NULL for super admin
  role          user_role NOT NULL DEFAULT 'Resident',
  full_name     TEXT,
  avatar_url    TEXT,
  phone         TEXT UNIQUE,
  email         TEXT,
  locale        TEXT NOT NULL DEFAULT 'en',
  timezone      TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  theme         TEXT NOT NULL DEFAULT 'system',
  push_tokens   TEXT[] NOT NULL DEFAULT '{}',
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on new auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, phone, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- BILLING INVOICES
-- ---------------------------------------------------------------------------
CREATE TABLE billing_invoices (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id            UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  razorpay_invoice_id   TEXT UNIQUE,
  amount_paise          BIGINT NOT NULL DEFAULT 0,
  status                TEXT NOT NULL DEFAULT 'pending',  -- pending / paid / failed
  pdf_url               TEXT,
  paid_at               TIMESTAMPTZ,
  period_start          TIMESTAMPTZ,
  period_end            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- AUDIT LOGS  (append-only, never updated or deleted)
-- ---------------------------------------------------------------------------
CREATE TABLE audit_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id    UUID REFERENCES accounts(id) ON DELETE SET NULL,
  property_id   UUID,  -- FK added later via ALTER to avoid forward reference
  actor_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action        TEXT NOT NULL,    -- e.g. 'complaint.assigned', 'notice.created'
  table_name    TEXT,
  record_id     UUID,
  old_data      JSONB,
  new_data      JSONB,
  ip_address    INET,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- USAGE METRICS  (pre-aggregated per property per month)
-- ---------------------------------------------------------------------------
CREATE TABLE usage_metrics (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id                  UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  property_id                 UUID,  -- FK added later
  year                        INT NOT NULL,
  month                       INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  wa_sends                    INT NOT NULL DEFAULT 0,
  active_residents            INT NOT NULL DEFAULT 0,
  complaints_raised           INT NOT NULL DEFAULT 0,
  complaints_resolved         INT NOT NULL DEFAULT 0,
  payments_collected_paise    BIGINT NOT NULL DEFAULT 0,
  events_created              INT NOT NULL DEFAULT 0,
  notices_published           INT NOT NULL DEFAULT 0,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, property_id, year, month)
);

-- ---------------------------------------------------------------------------
-- GENERIC HELPER: update_updated_at trigger function
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply to accounts
CREATE TRIGGER accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Apply to profiles
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Apply to usage_metrics
CREATE TRIGGER usage_metrics_updated_at
  BEFORE UPDATE ON usage_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-sync plan limits into accounts when plan changes
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sync_plan_limits()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  lim plan_limits%ROWTYPE;
BEGIN
  SELECT * INTO lim FROM plan_limits WHERE plan = NEW.plan;
  NEW.max_properties         = lim.max_properties;
  NEW.max_units              = lim.max_units;
  NEW.max_staff              = lim.max_staff;
  NEW.max_wa_sends_per_month = lim.max_wa_sends;
  NEW.white_label            = lim.white_label;
  IF NEW.plan = 'Trial' AND NEW.trial_ends_at IS NULL THEN
    NEW.trial_ends_at = NOW() + (lim.trial_days || ' days')::INTERVAL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER accounts_sync_plan
  BEFORE INSERT OR UPDATE OF plan ON accounts
  FOR EACH ROW EXECUTE FUNCTION sync_plan_limits();
