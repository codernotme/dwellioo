-- =============================================================================
-- Migration 0007: Services, Bookings, Polls, Surveys, Payments
-- Dwellioo SaaS Platform
-- =============================================================================

-- ---------------------------------------------------------------------------
-- SERVICE PROVIDERS
-- ---------------------------------------------------------------------------
CREATE TABLE service_providers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id           UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  -- If self-registered, linked to a profile; if manually added, NULL
  profile_id            UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name                  TEXT NOT NULL,
  category              provider_category NOT NULL DEFAULT 'Other',
  tags                  TEXT[] NOT NULL DEFAULT '{}',
  bio                   TEXT,
  photo_url             TEXT,
  phone                 TEXT NOT NULL,
  whatsapp              TEXT,
  working_hours         TEXT,  -- Free-form: "Mon-Sat 9am-6pm"
  service_area          service_area NOT NULL DEFAULT 'Within_Society',
  base_price_paise      INT,
  price_on_request      BOOLEAN NOT NULL DEFAULT FALSE,
  years_experience      INT,
  languages             TEXT[] NOT NULL DEFAULT '{}',
  verified              BOOLEAN NOT NULL DEFAULT FALSE,
  availability          provider_availability NOT NULL DEFAULT 'Available',
  -- Denormalized review stats
  rating_avg            NUMERIC(3,2) NOT NULL DEFAULT 0,
  rating_count          INT NOT NULL DEFAULT 0,
  bookings_count        INT NOT NULL DEFAULT 0,
  -- Self-registration flow
  self_registered       BOOLEAN NOT NULL DEFAULT FALSE,
  approved              BOOLEAN NOT NULL DEFAULT TRUE,
  approval_message      TEXT,
  deleted_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER service_providers_updated_at
  BEFORE UPDATE ON service_providers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------------------------------
-- PROVIDER AVAILABILITY SLOTS
-- ---------------------------------------------------------------------------
CREATE TABLE provider_slots (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id             UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  day_of_week             INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),  -- 0=Sun
  start_time              TIME NOT NULL,
  end_time                TIME NOT NULL,
  slot_duration_minutes   INT NOT NULL DEFAULT 60,
  max_concurrent          INT NOT NULL DEFAULT 1,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- BOOKINGS
-- ---------------------------------------------------------------------------
CREATE TABLE bookings (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id               UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  resident_id               UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  provider_id               UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  slot_id                   UUID REFERENCES provider_slots(id) ON DELETE SET NULL,
  service_description       TEXT,
  booked_date               DATE NOT NULL,
  booked_time               TIME NOT NULL,
  status                    booking_status NOT NULL DEFAULT 'Pending',
  -- Cancellation details
  cancelled_by              UUID REFERENCES profiles(id) ON DELETE SET NULL,
  cancellation_reason       TEXT,
  -- Reschedule chain
  reschedule_of             UUID REFERENCES bookings(id) ON DELETE SET NULL,
  -- Post-service review
  resident_review_rating    INT CHECK (resident_review_rating BETWEEN 1 AND 5),
  resident_review_text      TEXT,
  provider_reply            TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Sync provider bookings count and rating when booking/review changes
CREATE OR REPLACE FUNCTION sync_provider_stats()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE service_providers SET
    bookings_count = (
      SELECT COUNT(*) FROM bookings
      WHERE provider_id = COALESCE(NEW.provider_id, OLD.provider_id)
        AND status = 'Completed'
    ),
    rating_count = (
      SELECT COUNT(*) FROM bookings
      WHERE provider_id = COALESCE(NEW.provider_id, OLD.provider_id)
        AND resident_review_rating IS NOT NULL
    ),
    rating_avg = COALESCE((
      SELECT AVG(resident_review_rating)::NUMERIC(3,2) FROM bookings
      WHERE provider_id = COALESCE(NEW.provider_id, OLD.provider_id)
        AND resident_review_rating IS NOT NULL
    ), 0),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.provider_id, OLD.provider_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER booking_stats_sync
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW EXECUTE FUNCTION sync_provider_stats();

-- ---------------------------------------------------------------------------
-- POLLS
-- ---------------------------------------------------------------------------
CREATE TABLE polls (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id                 UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  author_id                   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title                       TEXT NOT NULL,
  description                 TEXT,
  type                        poll_type NOT NULL DEFAULT 'Single_Choice',
  anonymous                   BOOLEAN NOT NULL DEFAULT FALSE,
  results_visible_after_vote  BOOLEAN NOT NULL DEFAULT TRUE,
  closes_at                   TIMESTAMPTZ,
  total_votes                 INT NOT NULL DEFAULT 0,
  deleted_at                  TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER polls_updated_at
  BEFORE UPDATE ON polls
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------------------------------
-- POLL OPTIONS
-- ---------------------------------------------------------------------------
CREATE TABLE poll_options (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id         UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  label           TEXT NOT NULL,
  votes_count     INT NOT NULL DEFAULT 0,
  display_order   INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- POLL VOTES
-- ---------------------------------------------------------------------------
CREATE TABLE poll_votes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id     UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_id   UUID NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- For single_choice polls, one vote per poll; enforced at app layer for multiple choice
  UNIQUE (poll_id, option_id, profile_id)
);

-- Denormalize poll votes counts
CREATE OR REPLACE FUNCTION sync_poll_vote_counts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  pid UUID;
BEGIN
  pid := COALESCE(NEW.poll_id, OLD.poll_id);
  -- Update option vote count
  UPDATE poll_options SET
    votes_count = (SELECT COUNT(*) FROM poll_votes WHERE option_id = COALESCE(NEW.option_id, OLD.option_id))
  WHERE id = COALESCE(NEW.option_id, OLD.option_id);
  -- Update poll total votes
  UPDATE polls SET
    total_votes = (SELECT COUNT(DISTINCT profile_id) FROM poll_votes WHERE poll_id = pid),
    updated_at = NOW()
  WHERE id = pid;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER poll_vote_sync
  AFTER INSERT OR DELETE ON poll_votes
  FOR EACH ROW EXECUTE FUNCTION sync_poll_vote_counts();

-- ---------------------------------------------------------------------------
-- SURVEYS
-- ---------------------------------------------------------------------------
CREATE TABLE surveys (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id   UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  author_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  closes_at     TIMESTAMPTZ,
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER surveys_updated_at
  BEFORE UPDATE ON surveys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------------------------------
-- SURVEY QUESTIONS
-- ---------------------------------------------------------------------------
CREATE TABLE survey_questions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id       UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  question        TEXT NOT NULL,
  type            TEXT NOT NULL DEFAULT 'text',  -- text | multiple_choice | star_rating
  required        BOOLEAN NOT NULL DEFAULT TRUE,
  display_order   INT NOT NULL DEFAULT 0,
  options         JSONB,  -- [{label: string}] for multiple_choice
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- SURVEY RESPONSES
-- ---------------------------------------------------------------------------
CREATE TABLE survey_responses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id     UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  profile_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  answers       JSONB NOT NULL DEFAULT '{}',  -- {question_id: answer}
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (survey_id, profile_id)
);

-- ---------------------------------------------------------------------------
-- RECEIPT NUMBER SEQUENCE
-- ---------------------------------------------------------------------------
CREATE SEQUENCE receipt_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
  RETURN 'DWL-' || TO_CHAR(NOW(), 'YYYY-MM') || '-' || LPAD(nextval('receipt_number_seq')::TEXT, 5, '0');
END;
$$;

-- ---------------------------------------------------------------------------
-- MAINTENANCE DUES
-- ---------------------------------------------------------------------------
CREATE TABLE maintenance_dues (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id           UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit_id               UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  resident_id           UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  year                  INT NOT NULL,
  month                 INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  amount_paise          BIGINT NOT NULL,
  due_date              DATE NOT NULL,
  status                due_status NOT NULL DEFAULT 'Pending',
  late_fee_paise        BIGINT NOT NULL DEFAULT 0,
  waived_by             UUID REFERENCES profiles(id) ON DELETE SET NULL,
  waive_reason          TEXT,
  reminder_sent_count   INT NOT NULL DEFAULT 0,
  last_reminder_sent_at TIMESTAMPTZ,
  admin_notes           TEXT,
  deleted_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (unit_id, year, month)
);

CREATE TRIGGER maintenance_dues_updated_at
  BEFORE UPDATE ON maintenance_dues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-apply late fee when status becomes Overdue
CREATE OR REPLACE FUNCTION apply_late_fee()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  late_fee_pct NUMERIC(5,2);
BEGIN
  IF NEW.status = 'Overdue' AND OLD.status = 'Pending' AND NEW.late_fee_paise = 0 THEN
    SELECT late_fee_percent INTO late_fee_pct FROM properties WHERE id = NEW.property_id;
    NEW.late_fee_paise = ROUND((NEW.amount_paise * late_fee_pct) / 100);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER dues_apply_late_fee
  BEFORE UPDATE OF status ON maintenance_dues
  FOR EACH ROW EXECUTE FUNCTION apply_late_fee();

-- ---------------------------------------------------------------------------
-- PAYMENTS
-- ---------------------------------------------------------------------------
CREATE TABLE payments (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id              UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  property_id             UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  resident_id             UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  due_id                  UUID REFERENCES maintenance_dues(id) ON DELETE SET NULL,
  amount_paise            BIGINT NOT NULL,
  partial_amount_paise    BIGINT,
  method                  payment_method,
  razorpay_order_id       TEXT,
  razorpay_payment_id     TEXT UNIQUE,
  receipt_number          TEXT NOT NULL UNIQUE DEFAULT generate_receipt_number(),
  receipt_url             TEXT,
  paid_at                 TIMESTAMPTZ,
  admin_notes             TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Mark due as Paid when a full payment is confirmed
CREATE OR REPLACE FUNCTION sync_due_on_payment()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.due_id IS NOT NULL AND NEW.paid_at IS NOT NULL THEN
    UPDATE maintenance_dues SET
      status = CASE
        WHEN NEW.partial_amount_paise IS NOT NULL AND NEW.partial_amount_paise < amount_paise THEN 'Partial'
        ELSE 'Paid'
      END,
      updated_at = NOW()
    WHERE id = NEW.due_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER payment_due_sync
  AFTER INSERT OR UPDATE OF paid_at ON payments
  FOR EACH ROW EXECUTE FUNCTION sync_due_on_payment();
