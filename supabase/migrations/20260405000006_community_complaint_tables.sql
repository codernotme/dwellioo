-- =============================================================================
-- Migration 0006: Community Board, Announcements, Complaints
-- Dwellioo SaaS Platform
-- =============================================================================

-- ---------------------------------------------------------------------------
-- COMMUNITY THREADS
-- ---------------------------------------------------------------------------
CREATE TABLE threads (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id         UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  author_id           UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title               TEXT NOT NULL,
  body                TEXT NOT NULL,
  category            thread_category NOT NULL DEFAULT 'General',
  status              thread_status NOT NULL DEFAULT 'Active',
  image_urls          TEXT[] NOT NULL DEFAULT '{}',
  -- Denormalized counters
  upvotes_count       INT NOT NULL DEFAULT 0,
  comments_count      INT NOT NULL DEFAULT 0,
  pinned              BOOLEAN NOT NULL DEFAULT FALSE,
  is_solved           BOOLEAN NOT NULL DEFAULT FALSE,
  last_activity_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER threads_updated_at
  BEFORE UPDATE ON threads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------------------------------
-- THREAD UPVOTES
-- ---------------------------------------------------------------------------
CREATE TABLE thread_upvotes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id     UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  profile_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (thread_id, profile_id)
);

-- Denormalize upvote count
CREATE OR REPLACE FUNCTION sync_thread_upvotes()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE threads SET
    upvotes_count = (SELECT COUNT(*) FROM thread_upvotes WHERE thread_id = COALESCE(NEW.thread_id, OLD.thread_id)),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.thread_id, OLD.thread_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER thread_upvote_sync
  AFTER INSERT OR DELETE ON thread_upvotes
  FOR EACH ROW EXECUTE FUNCTION sync_thread_upvotes();

-- ---------------------------------------------------------------------------
-- THREAD COMMENTS
-- ---------------------------------------------------------------------------
CREATE TABLE thread_comments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id   UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES thread_comments(id) ON DELETE CASCADE,  -- 1 level nesting
  author_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  body        TEXT NOT NULL,
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Denormalize comment count + last_activity_at on threads
CREATE OR REPLACE FUNCTION sync_thread_comment_stats()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  tid UUID;
BEGIN
  tid := COALESCE(NEW.thread_id, OLD.thread_id);
  UPDATE threads SET
    comments_count = (
      SELECT COUNT(*) FROM thread_comments
      WHERE thread_id = tid AND deleted_at IS NULL
    ),
    last_activity_at = NOW(),
    updated_at = NOW()
  WHERE id = tid;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER thread_comment_stats_sync
  AFTER INSERT OR UPDATE OR DELETE ON thread_comments
  FOR EACH ROW EXECUTE FUNCTION sync_thread_comment_stats();

-- ---------------------------------------------------------------------------
-- THREAD REPORTS (moderation)
-- ---------------------------------------------------------------------------
CREATE TABLE thread_reports (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id     UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  reporter_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reason        TEXT NOT NULL,
  resolved      BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolution    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER thread_reports_updated_at
  BEFORE UPDATE ON thread_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------------------------------
-- ANNOUNCEMENTS
-- ---------------------------------------------------------------------------
CREATE TABLE announcements (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id         UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  author_id           UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title               TEXT NOT NULL,
  body                TEXT NOT NULL,
  priority            announcement_priority NOT NULL DEFAULT 'Normal',
  channels            notification_channel[] NOT NULL DEFAULT ARRAY['In_App']::notification_channel[],
  -- Targeting (NULL = all)
  target_wing_id      UUID REFERENCES wings(id) ON DELETE SET NULL,
  target_role         user_role,
  -- Scheduling
  scheduled_at        TIMESTAMPTZ,
  published_at        TIMESTAMPTZ,
  -- Denormalized delivery stats
  read_count          INT NOT NULL DEFAULT 0,
  total_recipients    INT NOT NULL DEFAULT 0,
  deleted_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------------------------------
-- ANNOUNCEMENT READS
-- ---------------------------------------------------------------------------
CREATE TABLE announcement_reads (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  announcement_id   UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  profile_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (announcement_id, profile_id)
);

-- Increment read count on announcement
CREATE OR REPLACE FUNCTION increment_announcement_read()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE announcements SET read_count = read_count + 1, updated_at = NOW()
  WHERE id = NEW.announcement_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER announcement_read_inserted
  AFTER INSERT ON announcement_reads
  FOR EACH ROW EXECUTE FUNCTION increment_announcement_read();

-- ---------------------------------------------------------------------------
-- AUTO-GENERATE TICKET IDs FOR COMPLAINTS
-- ---------------------------------------------------------------------------
CREATE SEQUENCE complaint_ticket_seq START 1;

CREATE OR REPLACE FUNCTION generate_ticket_id()
RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
  RETURN 'DWL-' || LPAD(nextval('complaint_ticket_seq')::TEXT, 5, '0');
END;
$$;

-- ---------------------------------------------------------------------------
-- COMPLAINTS
-- ---------------------------------------------------------------------------
CREATE TABLE complaints (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id               UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  resident_id               UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  ticket_id                 TEXT NOT NULL UNIQUE DEFAULT generate_ticket_id(),
  category                  TEXT NOT NULL,  -- Plumbing / Electrical / Common Area / ...
  description               TEXT NOT NULL,
  photo_urls                TEXT[] NOT NULL DEFAULT '{}',
  priority                  complaint_priority NOT NULL DEFAULT 'Low',
  status                    complaint_status NOT NULL DEFAULT 'Open',
  assigned_to               UUID REFERENCES profiles(id) ON DELETE SET NULL,
  sla_deadline_at           TIMESTAMPTZ,
  sla_breached              BOOLEAN NOT NULL DEFAULT FALSE,
  estimated_resolution_at   TIMESTAMPTZ,
  resolved_at               TIMESTAMPTZ,
  resident_rating           INT CHECK (resident_rating BETWEEN 1 AND 5),
  resident_review           TEXT,
  deleted_at                TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER complaints_updated_at
  BEFORE UPDATE ON complaints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-compute SLA deadline from property sla_hours on insert
CREATE OR REPLACE FUNCTION compute_sla_deadline()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  prop_sla INT;
BEGIN
  SELECT sla_hours INTO prop_sla FROM properties WHERE id = NEW.property_id;
  NEW.sla_deadline_at = NOW() + (prop_sla || ' hours')::INTERVAL;
  RETURN NEW;
END;
$$;

CREATE TRIGGER complaints_sla_deadline
  BEFORE INSERT ON complaints
  FOR EACH ROW EXECUTE FUNCTION compute_sla_deadline();

-- Auto-set resolved_at timestamp when status becomes Resolved
CREATE OR REPLACE FUNCTION set_resolved_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'Resolved' AND OLD.status != 'Resolved' THEN
    NEW.resolved_at = NOW();
    -- Check if SLA was breached
    IF NOW() > NEW.sla_deadline_at THEN
      NEW.sla_breached = TRUE;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER complaints_resolved_at
  BEFORE UPDATE OF status ON complaints
  FOR EACH ROW EXECUTE FUNCTION set_resolved_at();

-- ---------------------------------------------------------------------------
-- COMPLAINT NOTES (internal staff-only notes)
-- ---------------------------------------------------------------------------
CREATE TABLE complaint_notes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_id    UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  author_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  body            TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- COMPLAINT STATUS HISTORY
-- ---------------------------------------------------------------------------
CREATE TABLE complaint_status_history (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_id    UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  old_status      complaint_status,
  new_status      complaint_status NOT NULL,
  changed_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-log status changes on complaints
CREATE OR REPLACE FUNCTION log_complaint_status_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO complaint_status_history (complaint_id, old_status, new_status)
    VALUES (NEW.id, OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER complaints_status_log
  AFTER UPDATE OF status ON complaints
  FOR EACH ROW EXECUTE FUNCTION log_complaint_status_change();
