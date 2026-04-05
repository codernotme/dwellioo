-- =============================================================================
-- Migration 0005: Staff, Notices, Events
-- Dwellioo SaaS Platform
-- =============================================================================

-- ---------------------------------------------------------------------------
-- STAFF ASSIGNMENTS
-- ---------------------------------------------------------------------------
CREATE TABLE staff_assignments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  property_id   UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  role          user_role NOT NULL,
  permissions   JSONB NOT NULL DEFAULT '{}',
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, property_id)
);

CREATE TRIGGER staff_assignments_updated_at
  BEFORE UPDATE ON staff_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Plan limit enforcement for staff
CREATE OR REPLACE FUNCTION check_staff_limit()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  current_count INT;
  account_max   INT;
  acct_id       UUID;
BEGIN
  SELECT account_id INTO acct_id FROM properties WHERE id = NEW.property_id;

  SELECT COUNT(*) INTO current_count
  FROM staff_assignments sa
  JOIN properties p ON p.id = sa.property_id
  WHERE p.account_id = acct_id AND sa.deleted_at IS NULL AND sa.active = TRUE;

  SELECT max_staff INTO account_max FROM accounts WHERE id = acct_id;

  IF current_count >= account_max THEN
    RAISE EXCEPTION 'Staff limit reached for your subscription plan (max: %)', account_max
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_staff_limit
  BEFORE INSERT ON staff_assignments
  FOR EACH ROW EXECUTE FUNCTION check_staff_limit();

-- ---------------------------------------------------------------------------
-- NOTICES
-- ---------------------------------------------------------------------------
CREATE TABLE notices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id       UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  author_id         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title             TEXT NOT NULL,
  body              TEXT NOT NULL,
  category          notice_category NOT NULL DEFAULT 'General',
  status            notice_status NOT NULL DEFAULT 'Draft',
  image_urls        TEXT[] NOT NULL DEFAULT '{}',
  pdf_urls          TEXT[] NOT NULL DEFAULT '{}',
  pinned            BOOLEAN NOT NULL DEFAULT FALSE,
  -- Visibility targeting (NULL = all)
  target_wing_id    UUID REFERENCES wings(id) ON DELETE SET NULL,
  target_floor_id   UUID REFERENCES floors(id) ON DELETE SET NULL,
  -- Scheduling
  publish_at        TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ,
  -- Denormalized counters
  views_count       INT NOT NULL DEFAULT 0,
  read_count        INT NOT NULL DEFAULT 0,
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER notices_updated_at
  BEFORE UPDATE ON notices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------------------------------
-- NOTICE READS
-- ---------------------------------------------------------------------------
CREATE TABLE notice_reads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notice_id     UUID NOT NULL REFERENCES notices(id) ON DELETE CASCADE,
  resident_id   UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  read_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (notice_id, resident_id)
);

-- Increment read_count on notice when a read is inserted
CREATE OR REPLACE FUNCTION increment_notice_read_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE notices SET read_count = read_count + 1, updated_at = NOW()
  WHERE id = NEW.notice_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notice_read_inserted
  AFTER INSERT ON notice_reads
  FOR EACH ROW EXECUTE FUNCTION increment_notice_read_count();

-- ---------------------------------------------------------------------------
-- NOTICE COMMENTS
-- ---------------------------------------------------------------------------
CREATE TABLE notice_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notice_id   UUID NOT NULL REFERENCES notices(id) ON DELETE CASCADE,
  author_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  body        TEXT NOT NULL,
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- EVENTS
-- ---------------------------------------------------------------------------
CREATE TABLE events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id       UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  author_id         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title             TEXT NOT NULL,
  description       TEXT,
  category          event_category NOT NULL DEFAULT 'Meeting',
  status            event_status NOT NULL DEFAULT 'Upcoming',
  venue             TEXT,
  cover_image_url   TEXT,
  starts_at         TIMESTAMPTZ NOT NULL,
  ends_at           TIMESTAMPTZ,
  capacity          INT,
  -- Denormalized RSVP counts
  going_count       INT NOT NULL DEFAULT 0,
  not_going_count   INT NOT NULL DEFAULT 0,
  maybe_count       INT NOT NULL DEFAULT 0,
  -- Recurring event support (RRULE string e.g. "FREQ=WEEKLY;BYDAY=MO")
  is_recurring      BOOLEAN NOT NULL DEFAULT FALSE,
  recurrence_rule   TEXT,
  -- Post-event gallery
  gallery_urls      TEXT[] NOT NULL DEFAULT '{}',
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------------------------------
-- RSVPs
-- ---------------------------------------------------------------------------
CREATE TABLE rsvps (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  resident_id   UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  status        rsvp_status NOT NULL DEFAULT 'Going',
  guest_count   INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, resident_id)
);

CREATE TRIGGER rsvps_updated_at
  BEFORE UPDATE ON rsvps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Denormalize RSVP counts on events
CREATE OR REPLACE FUNCTION sync_rsvp_counts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE events SET
    going_count = (
      SELECT COUNT(*) FROM rsvps WHERE event_id = COALESCE(NEW.event_id, OLD.event_id) AND status = 'Going'
    ),
    not_going_count = (
      SELECT COUNT(*) FROM rsvps WHERE event_id = COALESCE(NEW.event_id, OLD.event_id) AND status = 'Not_Going'
    ),
    maybe_count = (
      SELECT COUNT(*) FROM rsvps WHERE event_id = COALESCE(NEW.event_id, OLD.event_id) AND status = 'Maybe'
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.event_id, OLD.event_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER rsvp_count_sync
  AFTER INSERT OR UPDATE OR DELETE ON rsvps
  FOR EACH ROW EXECUTE FUNCTION sync_rsvp_counts();
