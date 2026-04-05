-- =============================================================================
-- Migration 0008: Visitor Management, Deliveries, Notifications
-- Dwellioo SaaS Platform
-- =============================================================================

-- ---------------------------------------------------------------------------
-- VISITORS
-- ---------------------------------------------------------------------------
CREATE TABLE visitors (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id           UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit_id               UUID REFERENCES units(id) ON DELETE SET NULL,
  resident_id           UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  phone                 TEXT NOT NULL,
  purpose               TEXT,
  vehicle_number        TEXT,
  -- Pre-approval window
  pre_approved_from     TIMESTAMPTZ,
  pre_approved_until    TIMESTAMPTZ,
  -- OTP gate pass
  otp                   TEXT,
  otp_expires_at        TIMESTAMPTZ,
  status                visitor_status NOT NULL DEFAULT 'Pending',
  -- Watchman interaction
  watchman_id           UUID REFERENCES profiles(id) ON DELETE SET NULL,
  selfie_url            TEXT,
  entry_time            TIMESTAMPTZ,
  exit_time             TIMESTAMPTZ,
  -- Classification
  is_whitelisted        BOOLEAN NOT NULL DEFAULT FALSE,
  is_walkin             BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER visitors_updated_at
  BEFORE UPDATE ON visitors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-generate OTP when a visitor is Approved and property requires OTP
CREATE OR REPLACE FUNCTION generate_visitor_otp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  requires_otp    BOOLEAN;
  otp_expiry_hrs  INT;
BEGIN
  IF NEW.status = 'Approved' AND (OLD.status IS DISTINCT FROM 'Approved') THEN
    SELECT require_visitor_otp, visitor_otp_expiry_hours
    INTO requires_otp, otp_expiry_hrs
    FROM properties WHERE id = NEW.property_id;

    IF requires_otp THEN
      NEW.otp = LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
      NEW.otp_expires_at = NOW() + (otp_expiry_hrs || ' hours')::INTERVAL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER visitor_otp_gen
  BEFORE UPDATE OF status ON visitors
  FOR EACH ROW EXECUTE FUNCTION generate_visitor_otp();

-- ---------------------------------------------------------------------------
-- DELIVERIES
-- ---------------------------------------------------------------------------
CREATE TABLE deliveries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit_id         UUID REFERENCES units(id) ON DELETE SET NULL,
  resident_id     UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  courier_name    TEXT,
  tracking_id     TEXT,
  expected_at     TIMESTAMPTZ,
  photo_url       TEXT,
  status          delivery_status NOT NULL DEFAULT 'Expected',
  arrived_at      TIMESTAMPTZ,
  collected_at    TIMESTAMPTZ,
  watchman_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER deliveries_updated_at
  BEFORE UPDATE ON deliveries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-set arrived_at / collected_at timestamps
CREATE OR REPLACE FUNCTION sync_delivery_timestamps()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'Arrived' AND OLD.status = 'Expected' AND NEW.arrived_at IS NULL THEN
    NEW.arrived_at = NOW();
  END IF;
  IF NEW.status = 'Collected' AND OLD.status != 'Collected' AND NEW.collected_at IS NULL THEN
    NEW.collected_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER delivery_timestamps
  BEFORE UPDATE OF status ON deliveries
  FOR EACH ROW EXECUTE FUNCTION sync_delivery_timestamps();

-- ---------------------------------------------------------------------------
-- NOTIFICATIONS
-- Multi-channel notification queue with retry logic
-- ---------------------------------------------------------------------------
CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      UUID REFERENCES accounts(id) ON DELETE CASCADE,
  property_id     UUID REFERENCES properties(id) ON DELETE CASCADE,
  recipient_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  channel         notification_channel NOT NULL,
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  -- Deep link payload for mobile/PWA navigation
  deep_link       JSONB NOT NULL DEFAULT '{}',
  -- Module reference for filtering
  module          TEXT,   -- 'notices' | 'events' | 'complaints' | 'payments' | ...
  reference_id    UUID,   -- ID of the referenced entity
  status          notification_status NOT NULL DEFAULT 'Queued',
  scheduled_at    TIMESTAMPTZ,
  sent_at         TIMESTAMPTZ,
  delivered_at    TIMESTAMPTZ,
  retry_count     INT NOT NULL DEFAULT 0,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------------------------------
-- PUSH SUBSCRIPTIONS (Web Push API)
-- ---------------------------------------------------------------------------
CREATE TABLE push_subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint        TEXT NOT NULL,
  p256dh          TEXT NOT NULL,
  auth            TEXT NOT NULL,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, endpoint)
);

-- ---------------------------------------------------------------------------
-- ANALYTICS DAILY SNAPSHOTS (pre-aggregated, no slow real-time queries)
-- ---------------------------------------------------------------------------
CREATE TABLE analytics_snapshots (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id               UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  snapshot_date             DATE NOT NULL,
  -- People
  active_residents          INT NOT NULL DEFAULT 0,
  new_move_ins              INT NOT NULL DEFAULT 0,
  move_outs                 INT NOT NULL DEFAULT 0,
  -- Notices
  notices_published         INT NOT NULL DEFAULT 0,
  notice_read_rate          NUMERIC(5,2) NOT NULL DEFAULT 0,
  -- Events
  events_created            INT NOT NULL DEFAULT 0,
  event_attendance_avg      NUMERIC(5,2) NOT NULL DEFAULT 0,
  -- Complaints
  complaints_open           INT NOT NULL DEFAULT 0,
  complaints_resolved       INT NOT NULL DEFAULT 0,
  complaint_avg_resolution_hours NUMERIC(8,2) NOT NULL DEFAULT 0,
  sla_breaches              INT NOT NULL DEFAULT 0,
  -- Payments
  dues_generated_paise      BIGINT NOT NULL DEFAULT 0,
  dues_collected_paise      BIGINT NOT NULL DEFAULT 0,
  collection_rate           NUMERIC(5,2) NOT NULL DEFAULT 0,
  -- Bookings
  bookings_created          INT NOT NULL DEFAULT 0,
  -- Polls
  poll_participation_rate   NUMERIC(5,2) NOT NULL DEFAULT 0,
  -- Visitors
  visitors_logged           INT NOT NULL DEFAULT 0,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (property_id, snapshot_date)
);
