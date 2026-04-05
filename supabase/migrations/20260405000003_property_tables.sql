-- =============================================================================
-- Migration 0003: Property Tables — Properties, Wings, Floors, Units
-- Dwellioo SaaS Platform
-- =============================================================================

-- ---------------------------------------------------------------------------
-- PROPERTIES
-- ---------------------------------------------------------------------------
CREATE TABLE properties (
  id                              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id                      UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name                            TEXT NOT NULL,
  slug                            TEXT NOT NULL UNIQUE,
  type                            property_type NOT NULL DEFAULT 'Society',
  address                         TEXT,
  city                            TEXT,
  state                           TEXT,
  pincode                         TEXT,
  cover_image_url                 TEXT,
  timezone                        TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  -- Financial settings
  maintenance_amount_paise        INT NOT NULL DEFAULT 0,
  late_fee_percent                NUMERIC(5,2) NOT NULL DEFAULT 0,
  -- Operational settings
  sla_hours                       INT NOT NULL DEFAULT 48,
  booking_cancel_window_hours     INT NOT NULL DEFAULT 24,
  auto_approve_residents          BOOLEAN NOT NULL DEFAULT FALSE,
  require_visitor_otp             BOOLEAN NOT NULL DEFAULT TRUE,
  visitor_otp_expiry_hours        INT NOT NULL DEFAULT 24,
  default_notification_channels   notification_channel[] NOT NULL DEFAULT ARRAY['In_App']::notification_channel[],
  -- Emergency
  emergency_lockdown              BOOLEAN NOT NULL DEFAULT FALSE,
  lockdown_message                TEXT,
  -- Onboarding wizard progress (0–5)
  onboarding_step                 INT NOT NULL DEFAULT 0,
  deleted_at                      TIMESTAMPTZ,
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------------------------------
-- WINGS
-- ---------------------------------------------------------------------------
CREATE TABLE wings (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id   UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- FLOORS
-- ---------------------------------------------------------------------------
CREATE TABLE floors (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wing_id       UUID NOT NULL REFERENCES wings(id) ON DELETE CASCADE,
  property_id   UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  floor_number  INT NOT NULL,
  name          TEXT,  -- Optional friendly name: "Ground Floor", "Terrace"
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (wing_id, floor_number)
);

-- ---------------------------------------------------------------------------
-- UNITS
-- ---------------------------------------------------------------------------
CREATE TABLE units (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id             UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  wing_id                 UUID REFERENCES wings(id) ON DELETE SET NULL,
  floor_id                UUID REFERENCES floors(id) ON DELETE SET NULL,
  unit_number             TEXT NOT NULL,
  type                    unit_type NOT NULL DEFAULT 'Flat',
  status                  unit_status NOT NULL DEFAULT 'Vacant',
  monthly_rent_paise      INT NOT NULL DEFAULT 0,
  deleted_at              TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (property_id, unit_number)
);

CREATE TRIGGER units_updated_at
  BEFORE UPDATE ON units
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------------------------------
-- Now add deferred FK from audit_logs and usage_metrics to properties
-- ---------------------------------------------------------------------------
ALTER TABLE audit_logs
  ADD CONSTRAINT audit_logs_property_fk
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL;

ALTER TABLE usage_metrics
  ADD CONSTRAINT usage_metrics_property_fk
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE;

-- ---------------------------------------------------------------------------
-- PLAN LIMIT ENFORCEMENT — Max Properties per Account
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_property_limit()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  current_count INT;
  account_max   INT;
BEGIN
  SELECT COUNT(*) INTO current_count
  FROM properties
  WHERE account_id = NEW.account_id AND deleted_at IS NULL;

  SELECT max_properties INTO account_max
  FROM accounts
  WHERE id = NEW.account_id;

  IF current_count >= account_max THEN
    RAISE EXCEPTION 'Property limit reached for your subscription plan (max: %)', account_max
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_property_limit
  BEFORE INSERT ON properties
  FOR EACH ROW EXECUTE FUNCTION check_property_limit();

-- ---------------------------------------------------------------------------
-- PLAN LIMIT ENFORCEMENT — Max Units per Account
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_unit_limit()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  current_count INT;
  account_max   INT;
  acct_id       UUID;
BEGIN
  SELECT account_id INTO acct_id FROM properties WHERE id = NEW.property_id;

  SELECT COUNT(*) INTO current_count
  FROM units u
  JOIN properties p ON p.id = u.property_id
  WHERE p.account_id = acct_id AND u.deleted_at IS NULL;

  SELECT max_units INTO account_max FROM accounts WHERE id = acct_id;

  IF current_count >= account_max THEN
    RAISE EXCEPTION 'Unit limit reached for your subscription plan (max: %)', account_max
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_unit_limit
  BEFORE INSERT ON units
  FOR EACH ROW EXECUTE FUNCTION check_unit_limit();
