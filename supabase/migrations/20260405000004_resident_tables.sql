-- =============================================================================
-- Migration 0004: Resident Tables
-- Residents, Family Members, Vehicles, Invites, Notification Preferences
-- Dwellioo SaaS Platform
-- =============================================================================

-- ---------------------------------------------------------------------------
-- RESIDENTS
-- ---------------------------------------------------------------------------
CREATE TABLE residents (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id                  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  property_id                 UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit_id                     UUID REFERENCES units(id) ON DELETE SET NULL,
  status                      resident_status NOT NULL DEFAULT 'Pending',
  move_in_date                DATE,
  move_out_date               DATE,
  emergency_contact_name      TEXT,
  emergency_contact_phone     TEXT,
  emergency_contact_relation  TEXT,
  in_directory                BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at                  TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, property_id)
);

CREATE TRIGGER residents_updated_at
  BEFORE UPDATE ON residents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- When a resident is confirmed as Active, update unit status to Occupied
CREATE OR REPLACE FUNCTION sync_unit_status_on_resident_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- If a resident becomes Active, mark unit as Occupied
  IF NEW.status = 'Active' AND NEW.unit_id IS NOT NULL THEN
    UPDATE units SET status = 'Occupied', updated_at = NOW()
    WHERE id = NEW.unit_id;
  END IF;

  -- If a resident is Archived and no other active residents in that unit, mark Vacant
  IF NEW.status = 'Archived' AND NEW.unit_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM residents
      WHERE unit_id = NEW.unit_id AND status = 'Active' AND id != NEW.id AND deleted_at IS NULL
    ) THEN
      UPDATE units SET status = 'Vacant', updated_at = NOW()
      WHERE id = NEW.unit_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_unit_status
  AFTER INSERT OR UPDATE OF status ON residents
  FOR EACH ROW EXECUTE FUNCTION sync_unit_status_on_resident_change();

-- ---------------------------------------------------------------------------
-- FAMILY MEMBERS
-- ---------------------------------------------------------------------------
CREATE TABLE family_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id   UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  relation      TEXT,
  phone         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- VEHICLES
-- ---------------------------------------------------------------------------
CREATE TABLE vehicles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id     UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  property_id     UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  number_plate    TEXT NOT NULL,
  type            vehicle_type NOT NULL DEFAULT 'Car',
  color           TEXT,
  model           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (property_id, number_plate)
);

-- ---------------------------------------------------------------------------
-- INVITES
-- ---------------------------------------------------------------------------
CREATE TABLE invites (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  property_id   UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  inviter_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  email         TEXT,
  phone         TEXT,
  role          user_role NOT NULL DEFAULT 'Resident',
  unit_id       UUID REFERENCES units(id) ON DELETE SET NULL,
  token         TEXT NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- At least one contact method required
  CONSTRAINT invite_contact_required CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- ---------------------------------------------------------------------------
-- NOTIFICATION PREFERENCES (per user, per property, per module)
-- ---------------------------------------------------------------------------
CREATE TABLE notification_preferences (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  property_id   UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  module        TEXT NOT NULL,  -- 'notices' | 'events' | 'complaints' | 'payments' | 'visitors' | ...
  channels      notification_channel[] NOT NULL DEFAULT ARRAY['In_App']::notification_channel[],
  enabled       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, property_id, module)
);

CREATE TRIGGER notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------------------------------
-- FREQUENT VISITORS WHITELIST (resident-managed)
-- ---------------------------------------------------------------------------
CREATE TABLE whitelisted_visitors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id   UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  property_id   UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  phone         TEXT NOT NULL,
  relation      TEXT,            -- maid, driver, family
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (resident_id, phone)
);
