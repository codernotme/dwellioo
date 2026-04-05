-- =============================================================================
-- Migration 0009: Row-Level Security, Performance Indexes, pg_cron Jobs
-- Dwellioo SaaS Platform
-- =============================================================================

-- ---------------------------------------------------------------------------
-- HELPER FUNCTIONS for RLS
-- ---------------------------------------------------------------------------

-- Returns the current user's profile
CREATE OR REPLACE FUNCTION auth.profile()
RETURNS profiles LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT * FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Returns the current user's role
CREATE OR REPLACE FUNCTION auth.my_role()
RETURNS user_role LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Returns the account_id for the current user
CREATE OR REPLACE FUNCTION auth.my_account()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT account_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Returns property IDs accessible to the current user
CREATE OR REPLACE FUNCTION auth.my_property_ids()
RETURNS UUID[] LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT ARRAY(
    SELECT DISTINCT property_id FROM staff_assignments
    WHERE profile_id = auth.uid() AND deleted_at IS NULL AND active = TRUE
    UNION
    SELECT DISTINCT property_id FROM residents
    WHERE profile_id = auth.uid() AND deleted_at IS NULL
  );
$$;

-- Returns true if the user is a super admin
CREATE OR REPLACE FUNCTION auth.is_super_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Super_Admin');
$$;

-- Returns true if user is a property manager for a given property
CREATE OR REPLACE FUNCTION auth.is_manager_of(p_property_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS(
    SELECT 1 FROM staff_assignments
    WHERE profile_id = auth.uid()
      AND property_id = p_property_id
      AND role = 'Property_Manager'
      AND deleted_at IS NULL AND active = TRUE
  );
$$;

-- Returns true if user is any staff member for a given property
CREATE OR REPLACE FUNCTION auth.is_staff_of(p_property_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS(
    SELECT 1 FROM staff_assignments
    WHERE profile_id = auth.uid()
      AND property_id = p_property_id
      AND deleted_at IS NULL AND active = TRUE
  );
$$;

-- Returns true if user is a resident in a given property
CREATE OR REPLACE FUNCTION auth.is_resident_of(p_property_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS(
    SELECT 1 FROM residents
    WHERE profile_id = auth.uid()
      AND property_id = p_property_id
      AND deleted_at IS NULL AND status = 'Active'
  );
$$;

-- Returns the resident.id for the current user in a property
CREATE OR REPLACE FUNCTION auth.my_resident_id(p_property_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM residents
  WHERE profile_id = auth.uid() AND property_id = p_property_id
    AND deleted_at IS NULL LIMIT 1;
$$;

-- =============================================================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE accounts                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_invoices            ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_metrics               ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE wings                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE floors                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE units                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE residents                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members              ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences    ENABLE ROW LEVEL SECURITY;
ALTER TABLE whitelisted_visitors        ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_assignments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE notice_reads                ENABLE ROW LEVEL SECURITY;
ALTER TABLE notice_comments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE events                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvps                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_upvotes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_comments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_reports              ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements               ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_reads          ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_notes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_status_history    ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_providers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_slots              ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options                ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_questions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses            ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_dues            ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications               ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_snapshots         ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

-- ---------------------------------------------------------------------------
-- ACCOUNTS
-- ---------------------------------------------------------------------------
CREATE POLICY accounts_owner_read ON accounts FOR SELECT
  USING (owner_id = auth.uid() OR auth.is_super_admin());

CREATE POLICY accounts_owner_update ON accounts FOR UPDATE
  USING (owner_id = auth.uid() OR auth.is_super_admin());

CREATE POLICY accounts_insert ON accounts FOR INSERT
  WITH CHECK (owner_id = auth.uid() OR auth.is_super_admin());

-- ---------------------------------------------------------------------------
-- PROFILES
-- ---------------------------------------------------------------------------
-- Own profile: full access
CREATE POLICY profiles_self ON profiles FOR ALL
  USING (id = auth.uid());

-- Staff can read profiles within their account
CREATE POLICY profiles_account_read ON profiles FOR SELECT
  USING (account_id = auth.my_account() OR auth.is_super_admin());

-- ---------------------------------------------------------------------------
-- BILLING INVOICES
-- ---------------------------------------------------------------------------
CREATE POLICY billing_account ON billing_invoices FOR SELECT
  USING (account_id = auth.my_account() OR auth.is_super_admin());

-- ---------------------------------------------------------------------------
-- AUDIT LOGS (read-only for account managers, append-only)
-- ---------------------------------------------------------------------------
CREATE POLICY audit_read ON audit_logs FOR SELECT
  USING (account_id = auth.my_account() OR auth.is_super_admin());

-- No UPDATE or DELETE on audit_logs by any role (enforced by no policies + no grants)

-- ---------------------------------------------------------------------------
-- PROPERTIES
-- ---------------------------------------------------------------------------
CREATE POLICY properties_accessible ON properties FOR SELECT
  USING (
    auth.is_super_admin()
    OR account_id = auth.my_account()
    OR id = ANY(auth.my_property_ids())
  );

CREATE POLICY properties_manager_write ON properties FOR INSERT
  WITH CHECK (account_id = auth.my_account() OR auth.is_super_admin());

CREATE POLICY properties_manager_update ON properties FOR UPDATE
  USING (
    auth.is_super_admin()
    OR (account_id = auth.my_account() AND auth.my_role() = 'Property_Manager')
    OR auth.is_manager_of(id)
  );

-- ---------------------------------------------------------------------------
-- WINGS, FLOORS, UNITS
-- ---------------------------------------------------------------------------
CREATE POLICY wings_read ON wings FOR SELECT
  USING (property_id = ANY(auth.my_property_ids()) OR auth.is_super_admin());

CREATE POLICY wings_write ON wings FOR INSERT
  WITH CHECK (auth.is_manager_of(property_id) OR auth.is_super_admin());

CREATE POLICY wings_update ON wings FOR UPDATE
  USING (auth.is_manager_of(property_id) OR auth.is_super_admin());

CREATE POLICY floors_read ON floors FOR SELECT
  USING (property_id = ANY(auth.my_property_ids()) OR auth.is_super_admin());

CREATE POLICY floors_write ON floors FOR INSERT
  WITH CHECK (auth.is_manager_of(property_id) OR auth.is_super_admin());

CREATE POLICY floors_update ON floors FOR UPDATE
  USING (auth.is_manager_of(property_id) OR auth.is_super_admin());

CREATE POLICY units_read ON units FOR SELECT
  USING (property_id = ANY(auth.my_property_ids()) OR auth.is_super_admin());

CREATE POLICY units_write ON units FOR INSERT
  WITH CHECK (auth.is_manager_of(property_id) OR auth.is_super_admin());

CREATE POLICY units_update ON units FOR UPDATE
  USING (auth.is_manager_of(property_id) OR auth.is_super_admin());

-- ---------------------------------------------------------------------------
-- RESIDENTS
-- ---------------------------------------------------------------------------
-- Residents see their own data; staff see all in their properties
CREATE POLICY residents_read ON residents FOR SELECT
  USING (
    profile_id = auth.uid()
    OR property_id = ANY(auth.my_property_ids())
    OR auth.is_super_admin()
  );

CREATE POLICY residents_insert ON residents FOR INSERT
  WITH CHECK (auth.is_manager_of(property_id) OR auth.is_super_admin());

CREATE POLICY residents_update ON residents FOR UPDATE
  USING (
    -- Can update own profile info
    profile_id = auth.uid()
    OR auth.is_manager_of(property_id)
    OR auth.is_super_admin()
  );

-- ---------------------------------------------------------------------------
-- FAMILY MEMBERS, VEHICLES
-- ---------------------------------------------------------------------------
CREATE POLICY family_read ON family_members FOR SELECT
  USING (
    EXISTS(
      SELECT 1 FROM residents r
      WHERE r.id = resident_id AND (r.profile_id = auth.uid() OR auth.is_staff_of(r.property_id))
    )
    OR auth.is_super_admin()
  );

CREATE POLICY family_write ON family_members FOR INSERT
  WITH CHECK (
    EXISTS(SELECT 1 FROM residents r WHERE r.id = resident_id AND r.profile_id = auth.uid())
    OR auth.is_super_admin()
  );

CREATE POLICY vehicles_read ON vehicles FOR SELECT
  USING (property_id = ANY(auth.my_property_ids()) OR auth.is_super_admin());

CREATE POLICY vehicles_write ON vehicles FOR INSERT
  WITH CHECK (
    EXISTS(SELECT 1 FROM residents r WHERE r.id = resident_id AND r.profile_id = auth.uid())
    OR auth.is_manager_of(property_id) OR auth.is_super_admin()
  );

-- ---------------------------------------------------------------------------
-- INVITES
-- ---------------------------------------------------------------------------
CREATE POLICY invites_manager_read ON invites FOR SELECT
  USING (auth.is_manager_of(property_id) OR account_id = auth.my_account() OR auth.is_super_admin());

CREATE POLICY invites_manager_write ON invites FOR INSERT
  WITH CHECK (auth.is_manager_of(property_id) OR auth.is_super_admin());

-- Allow token-based invite lookup (public function via RPC, managed separately)

-- ---------------------------------------------------------------------------
-- STAFF ASSIGNMENTS
-- ---------------------------------------------------------------------------
CREATE POLICY staff_read ON staff_assignments FOR SELECT
  USING (
    profile_id = auth.uid()
    OR property_id = ANY(auth.my_property_ids())
    OR auth.is_super_admin()
  );

CREATE POLICY staff_write ON staff_assignments FOR INSERT
  WITH CHECK (auth.is_manager_of(property_id) OR auth.is_super_admin());

CREATE POLICY staff_update ON staff_assignments FOR UPDATE
  USING (auth.is_manager_of(property_id) OR auth.is_super_admin());

-- ---------------------------------------------------------------------------
-- NOTICES
-- ---------------------------------------------------------------------------
CREATE POLICY notices_read ON notices FOR SELECT
  USING (
    property_id = ANY(auth.my_property_ids())
    AND (status = 'Live' OR auth.is_staff_of(property_id) OR auth.is_super_admin())
    AND deleted_at IS NULL
  );

CREATE POLICY notices_write ON notices FOR INSERT
  WITH CHECK (auth.is_manager_of(property_id) OR auth.is_super_admin());

CREATE POLICY notices_update ON notices FOR UPDATE
  USING (auth.is_manager_of(property_id) OR auth.is_super_admin());

-- ---------------------------------------------------------------------------
-- NOTICE READS, COMMENTS
-- ---------------------------------------------------------------------------
CREATE POLICY notice_reads_insert ON notice_reads FOR INSERT
  WITH CHECK (
    auth.is_resident_of(
      (SELECT property_id FROM notices WHERE id = notice_id)
    )
  );

CREATE POLICY notice_reads_select ON notice_reads FOR SELECT
  USING (
    -- Resident sees their own reads; manager sees all reads for their property's notices
    resident_id = auth.my_resident_id((SELECT property_id FROM notices WHERE id = notice_id))
    OR auth.is_staff_of((SELECT property_id FROM notices WHERE id = notice_id))
    OR auth.is_super_admin()
  );

CREATE POLICY notice_comments_read ON notice_comments FOR SELECT
  USING (
    auth.is_staff_of((SELECT property_id FROM notices WHERE id = notice_id))
    OR auth.is_resident_of((SELECT property_id FROM notices WHERE id = notice_id))
    OR auth.is_super_admin()
  );

CREATE POLICY notice_comments_write ON notice_comments FOR INSERT
  WITH CHECK (author_id = auth.uid());

-- ---------------------------------------------------------------------------
-- EVENTS, RSVPs
-- ---------------------------------------------------------------------------
CREATE POLICY events_read ON events FOR SELECT
  USING (property_id = ANY(auth.my_property_ids()) AND deleted_at IS NULL OR auth.is_super_admin());

CREATE POLICY events_write ON events FOR INSERT
  WITH CHECK (auth.is_manager_of(property_id) OR auth.is_super_admin());

CREATE POLICY events_update ON events FOR UPDATE
  USING (auth.is_manager_of(property_id) OR auth.is_super_admin());

CREATE POLICY rsvps_read ON rsvps FOR SELECT
  USING (
    resident_id = auth.my_resident_id((SELECT property_id FROM events WHERE id = event_id))
    OR auth.is_staff_of((SELECT property_id FROM events WHERE id = event_id))
    OR auth.is_super_admin()
  );

CREATE POLICY rsvps_write ON rsvps FOR INSERT
  WITH CHECK (
    resident_id = auth.my_resident_id((SELECT property_id FROM events WHERE id = event_id))
  );

CREATE POLICY rsvps_update ON rsvps FOR UPDATE
  USING (
    resident_id = auth.my_resident_id((SELECT property_id FROM events WHERE id = event_id))
  );

-- ---------------------------------------------------------------------------
-- COMMUNITY THREADS
-- ---------------------------------------------------------------------------
CREATE POLICY threads_read ON threads FOR SELECT
  USING (property_id = ANY(auth.my_property_ids()) AND deleted_at IS NULL OR auth.is_super_admin());

CREATE POLICY threads_write ON threads FOR INSERT
  WITH CHECK (author_id = auth.uid() AND property_id = ANY(auth.my_property_ids()));

CREATE POLICY threads_update ON threads FOR UPDATE
  USING (author_id = auth.uid() OR auth.is_manager_of(property_id) OR auth.is_super_admin());

CREATE POLICY thread_comments_read ON thread_comments FOR SELECT
  USING (
    auth.is_staff_of((SELECT property_id FROM threads WHERE id = thread_id))
    OR auth.is_resident_of((SELECT property_id FROM threads WHERE id = thread_id))
    OR auth.is_super_admin()
  );

CREATE POLICY thread_comments_write ON thread_comments FOR INSERT
  WITH CHECK (author_id = auth.uid());

CREATE POLICY thread_upvotes_read ON thread_upvotes FOR SELECT
  USING (
    auth.is_staff_of((SELECT property_id FROM threads WHERE id = thread_id))
    OR auth.is_resident_of((SELECT property_id FROM threads WHERE id = thread_id))
    OR auth.is_super_admin()
  );

CREATE POLICY thread_upvotes_write ON thread_upvotes FOR INSERT
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY thread_upvotes_delete ON thread_upvotes FOR DELETE
  USING (profile_id = auth.uid());

-- ---------------------------------------------------------------------------
-- ANNOUNCEMENTS
-- ---------------------------------------------------------------------------
CREATE POLICY announcements_read ON announcements FOR SELECT
  USING (
    property_id = ANY(auth.my_property_ids())
    AND (published_at IS NOT NULL OR auth.is_staff_of(property_id) OR auth.is_super_admin())
    AND deleted_at IS NULL
  );

CREATE POLICY announcements_write ON announcements FOR INSERT
  WITH CHECK (auth.is_manager_of(property_id) OR auth.is_super_admin());

CREATE POLICY announcements_update ON announcements FOR UPDATE
  USING (auth.is_manager_of(property_id) OR auth.is_super_admin());

CREATE POLICY announcement_reads_insert ON announcement_reads FOR INSERT
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY announcement_reads_select ON announcement_reads FOR SELECT
  USING (
    profile_id = auth.uid()
    OR auth.is_manager_of((SELECT property_id FROM announcements WHERE id = announcement_id))
    OR auth.is_super_admin()
  );

-- ---------------------------------------------------------------------------
-- COMPLAINTS
-- ---------------------------------------------------------------------------
CREATE POLICY complaints_resident_read ON complaints FOR SELECT
  USING (
    -- Resident sees their own complaints
    resident_id = auth.my_resident_id(property_id)
    -- Staff sees all complaints in their property
    OR auth.is_staff_of(property_id)
    OR auth.is_super_admin()
  );

CREATE POLICY complaints_resident_insert ON complaints FOR INSERT
  WITH CHECK (
    resident_id = auth.my_resident_id(property_id)
    AND property_id = ANY(auth.my_property_ids())
  );

CREATE POLICY complaints_update ON complaints FOR UPDATE
  USING (
    -- Resident can add review on Resolved complaints
    (resident_id = auth.my_resident_id(property_id) AND status = 'Resolved')
    OR auth.is_staff_of(property_id)
    OR auth.is_super_admin()
  );

CREATE POLICY complaint_notes_staff ON complaint_notes FOR ALL
  USING (
    auth.is_staff_of((SELECT property_id FROM complaints WHERE id = complaint_id))
    OR auth.is_super_admin()
  );

CREATE POLICY complaint_history_read ON complaint_status_history FOR SELECT
  USING (
    auth.is_staff_of((SELECT property_id FROM complaints WHERE id = complaint_id))
    OR EXISTS(
      SELECT 1 FROM complaints c
      WHERE c.id = complaint_id
        AND c.resident_id = auth.my_resident_id(c.property_id)
    )
    OR auth.is_super_admin()
  );

-- ---------------------------------------------------------------------------
-- SERVICE PROVIDERS, BOOKINGS
-- ---------------------------------------------------------------------------
CREATE POLICY providers_read ON service_providers FOR SELECT
  USING (property_id = ANY(auth.my_property_ids()) AND deleted_at IS NULL OR auth.is_super_admin());

CREATE POLICY providers_write ON service_providers FOR INSERT
  WITH CHECK (auth.is_manager_of(property_id) OR auth.is_super_admin());

CREATE POLICY providers_update ON service_providers FOR UPDATE
  USING (auth.is_manager_of(property_id) OR profile_id = auth.uid() OR auth.is_super_admin());

CREATE POLICY bookings_read ON bookings FOR SELECT
  USING (
    resident_id = auth.my_resident_id(property_id)
    OR auth.is_staff_of(property_id)
    OR EXISTS(SELECT 1 FROM service_providers sp WHERE sp.id = provider_id AND sp.profile_id = auth.uid())
    OR auth.is_super_admin()
  );

CREATE POLICY bookings_resident_insert ON bookings FOR INSERT
  WITH CHECK (
    resident_id = auth.my_resident_id(property_id)
    AND property_id = ANY(auth.my_property_ids())
  );

CREATE POLICY bookings_update ON bookings FOR UPDATE
  USING (
    resident_id = auth.my_resident_id(property_id)
    OR auth.is_staff_of(property_id)
    OR EXISTS(SELECT 1 FROM service_providers sp WHERE sp.id = provider_id AND sp.profile_id = auth.uid())
    OR auth.is_super_admin()
  );

-- ---------------------------------------------------------------------------
-- POLLS & SURVEYS
-- ---------------------------------------------------------------------------
CREATE POLICY polls_read ON polls FOR SELECT
  USING (property_id = ANY(auth.my_property_ids()) AND deleted_at IS NULL OR auth.is_super_admin());

CREATE POLICY polls_write ON polls FOR INSERT
  WITH CHECK (auth.is_manager_of(property_id) OR auth.is_super_admin());

CREATE POLICY poll_options_read ON poll_options FOR SELECT
  USING (
    EXISTS(SELECT 1 FROM polls p WHERE p.id = poll_id AND p.property_id = ANY(auth.my_property_ids()))
    OR auth.is_super_admin()
  );

CREATE POLICY poll_votes_read ON poll_votes FOR SELECT
  USING (
    profile_id = auth.uid()
    OR auth.is_manager_of((SELECT property_id FROM polls WHERE id = poll_id))
    OR auth.is_super_admin()
  );

CREATE POLICY poll_votes_insert ON poll_votes FOR INSERT
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY surveys_read ON surveys FOR SELECT
  USING (property_id = ANY(auth.my_property_ids()) AND deleted_at IS NULL OR auth.is_super_admin());

CREATE POLICY surveys_write ON surveys FOR INSERT
  WITH CHECK (auth.is_manager_of(property_id) OR auth.is_super_admin());

CREATE POLICY survey_responses_insert ON survey_responses FOR INSERT
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY survey_responses_read ON survey_responses FOR SELECT
  USING (
    profile_id = auth.uid()
    OR auth.is_manager_of((SELECT property_id FROM surveys WHERE id = survey_id))
    OR auth.is_super_admin()
  );

-- ---------------------------------------------------------------------------
-- PAYMENTS & DUES
-- ---------------------------------------------------------------------------
CREATE POLICY dues_read ON maintenance_dues FOR SELECT
  USING (
    resident_id = auth.my_resident_id(property_id)
    OR auth.is_staff_of(property_id)
    OR auth.is_super_admin()
  );

CREATE POLICY dues_write ON maintenance_dues FOR INSERT
  WITH CHECK (auth.is_manager_of(property_id) OR auth.is_super_admin());

CREATE POLICY dues_update ON maintenance_dues FOR UPDATE
  USING (auth.is_manager_of(property_id) OR auth.is_super_admin());

CREATE POLICY payments_read ON payments FOR SELECT
  USING (
    resident_id = auth.my_resident_id(property_id)
    OR auth.is_staff_of(property_id)
    OR auth.is_super_admin()
  );

CREATE POLICY payments_insert ON payments FOR INSERT
  WITH CHECK (
    resident_id = auth.my_resident_id(property_id)
    OR auth.is_manager_of(property_id)
    OR auth.is_super_admin()
  );

-- ---------------------------------------------------------------------------
-- VISITORS
-- ---------------------------------------------------------------------------
CREATE POLICY visitors_read ON visitors FOR SELECT
  USING (
    -- Resident sees their own visitors
    resident_id = auth.my_resident_id(property_id)
    -- All property staff can see visitors
    OR auth.is_staff_of(property_id)
    OR auth.is_super_admin()
  );

CREATE POLICY visitors_resident_insert ON visitors FOR INSERT
  WITH CHECK (
    resident_id = auth.my_resident_id(property_id)
    OR auth.is_staff_of(property_id)
    OR auth.is_super_admin()
  );

CREATE POLICY visitors_update ON visitors FOR UPDATE
  USING (
    resident_id = auth.my_resident_id(property_id)
    OR auth.is_staff_of(property_id)
    OR auth.is_super_admin()
  );

CREATE POLICY deliveries_read ON deliveries FOR SELECT
  USING (
    resident_id = auth.my_resident_id(property_id)
    OR auth.is_staff_of(property_id)
    OR auth.is_super_admin()
  );

CREATE POLICY deliveries_write ON deliveries FOR INSERT
  WITH CHECK (
    resident_id = auth.my_resident_id(property_id)
    OR auth.is_staff_of(property_id)
    OR auth.is_super_admin()
  );

CREATE POLICY deliveries_update ON deliveries FOR UPDATE
  USING (auth.is_staff_of(property_id) OR auth.is_super_admin());

-- ---------------------------------------------------------------------------
-- NOTIFICATIONS
-- ---------------------------------------------------------------------------
CREATE POLICY notifications_read ON notifications FOR SELECT
  USING (recipient_id = auth.uid() OR auth.is_super_admin());

-- Only backend (service role) inserts notifications
-- Front-end never inserts directly; Edge Functions use service role key

-- ---------------------------------------------------------------------------
-- PUSH SUBSCRIPTIONS
-- ---------------------------------------------------------------------------
CREATE POLICY push_subs_own ON push_subscriptions FOR ALL
  USING (profile_id = auth.uid());

-- ---------------------------------------------------------------------------
-- ANALYTICS SNAPSHOTS
-- ---------------------------------------------------------------------------
CREATE POLICY analytics_read ON analytics_snapshots FOR SELECT
  USING (auth.is_staff_of(property_id) OR auth.is_super_admin());

-- =============================================================================
-- PERFORMANCE INDEXES
-- =============================================================================

-- Accounts
CREATE INDEX idx_accounts_owner ON accounts(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_accounts_slug ON accounts(slug);

-- Profiles
CREATE INDEX idx_profiles_account ON profiles(account_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_profiles_phone ON profiles(phone) WHERE deleted_at IS NULL;
CREATE INDEX idx_profiles_role ON profiles(role);

-- Properties
CREATE INDEX idx_properties_account ON properties(account_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_properties_slug ON properties(slug);

-- Units
CREATE INDEX idx_units_property_status ON units(property_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_units_wing ON units(wing_id);

-- Residents
CREATE INDEX idx_residents_property ON residents(property_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_residents_unit ON residents(unit_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_residents_profile ON residents(profile_id, property_id);

-- Vehicles — GIN trigram for plate search
CREATE INDEX idx_vehicles_plate_trgm ON vehicles USING gin(number_plate gin_trgm_ops);

-- Notices
CREATE INDEX idx_notices_property_status ON notices(property_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_notices_publish_at ON notices(publish_at) WHERE status = 'Draft';
CREATE INDEX idx_notices_pinned ON notices(property_id, pinned) WHERE pinned = TRUE;

-- Notice reads
CREATE INDEX idx_notice_reads_notice ON notice_reads(notice_id);

-- Events
CREATE INDEX idx_events_property_starts ON events(property_id, starts_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_events_status ON events(property_id, status);

-- RSVPs
CREATE INDEX idx_rsvps_event ON rsvps(event_id, status);

-- Threads
CREATE INDEX idx_threads_property_activity ON threads(property_id, last_activity_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_threads_category ON threads(property_id, category);

-- Thread comments
CREATE INDEX idx_thread_comments_thread ON thread_comments(thread_id) WHERE deleted_at IS NULL;

-- Announcements
CREATE INDEX idx_announcements_property ON announcements(property_id, published_at DESC) WHERE deleted_at IS NULL;

-- Complaints
CREATE INDEX idx_complaints_property_status ON complaints(property_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_complaints_ticket ON complaints(ticket_id);
CREATE INDEX idx_complaints_assigned ON complaints(assigned_to) WHERE status NOT IN ('Resolved', 'Closed');
CREATE INDEX idx_complaints_sla ON complaints(sla_deadline_at) WHERE status NOT IN ('Resolved', 'Closed');

-- Service Providers
CREATE INDEX idx_providers_property_cat ON service_providers(property_id, category) WHERE deleted_at IS NULL;
CREATE INDEX idx_providers_tags ON service_providers USING gin(tags);

-- Bookings
CREATE INDEX idx_bookings_provider_date ON bookings(provider_id, booked_date);
CREATE INDEX idx_bookings_resident ON bookings(resident_id, status);

-- Maintenance Dues
CREATE INDEX idx_dues_property_month ON maintenance_dues(property_id, year, month);
CREATE INDEX idx_dues_status ON maintenance_dues(property_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_dues_resident ON maintenance_dues(resident_id, status);

-- Payments
CREATE INDEX idx_payments_property_date ON payments(property_id, paid_at DESC);
CREATE INDEX idx_payments_resident ON payments(resident_id);

-- Visitors
CREATE INDEX idx_visitors_property_date ON visitors(property_id, pre_approved_from);
CREATE INDEX idx_visitors_status ON visitors(property_id, status);
CREATE INDEX idx_visitors_otp ON visitors(otp) WHERE otp IS NOT NULL;

-- Deliveries
CREATE INDEX idx_deliveries_property_status ON deliveries(property_id, status);
CREATE INDEX idx_deliveries_resident ON deliveries(resident_id, status);

-- Notifications
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, status, created_at DESC);
CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_at) WHERE status = 'Queued' AND scheduled_at IS NOT NULL;

-- Analytics
CREATE INDEX idx_analytics_property_date ON analytics_snapshots(property_id, snapshot_date DESC);
CREATE INDEX idx_usage_metrics_account ON usage_metrics(account_id, year, month);

-- =============================================================================
-- pg_cron SCHEDULED JOBS
-- (Supabase hosted has pg_cron enabled by default in the cron schema)
-- =============================================================================

-- Monthly dues generation — runs on the 1st of every month at 00:01 IST (UTC+5:30 = 18:31 prev day UTC)
-- The actual Edge Function is called; this is the cron trigger
SELECT cron.schedule(
  'generate-monthly-dues',
  '31 18 L * *',   -- Last day of month at 18:31 UTC = 00:01 IST 1st of next month
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_EDGE_GENERATE_DUES_URL'),
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY') || '"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Daily overdue dues check — runs daily at 00:05 IST (18:35 UTC prev day)
SELECT cron.schedule(
  'check-overdue-dues',
  '35 18 * * *',
  $$
  UPDATE maintenance_dues
  SET status = 'Overdue', updated_at = NOW()
  WHERE status = 'Pending'
    AND due_date < CURRENT_DATE
    AND deleted_at IS NULL;
  $$
);

-- Auto-archive expired notices — runs every hour
SELECT cron.schedule(
  'archive-expired-notices',
  '0 * * * *',
  $$
  UPDATE notices
  SET status = 'Archived', updated_at = NOW()
  WHERE status = 'Live'
    AND expires_at IS NOT NULL
    AND expires_at <= NOW()
    AND deleted_at IS NULL;
  $$
);

-- Auto-publish scheduled notices — runs every 5 minutes
SELECT cron.schedule(
  'publish-scheduled-notices',
  '*/5 * * * *',
  $$
  UPDATE notices
  SET status = 'Live', updated_at = NOW()
  WHERE status = 'Draft'
    AND publish_at IS NOT NULL
    AND publish_at <= NOW()
    AND deleted_at IS NULL;
  $$
);

-- Auto-expire visitor OTPs — runs every 15 minutes
SELECT cron.schedule(
  'expire-visitor-otps',
  '*/15 * * * *',
  $$
  UPDATE visitors
  SET status = 'Expired', updated_at = NOW()
  WHERE status = 'Approved'
    AND otp_expires_at IS NOT NULL
    AND otp_expires_at <= NOW();
  $$
);

-- Auto-update event statuses — runs every 30 minutes
SELECT cron.schedule(
  'sync-event-statuses',
  '*/30 * * * *',
  $$
  -- Mark as Ongoing
  UPDATE events SET status = 'Ongoing', updated_at = NOW()
  WHERE status = 'Upcoming' AND starts_at <= NOW() AND (ends_at IS NULL OR ends_at > NOW()) AND deleted_at IS NULL;
  -- Mark as Completed
  UPDATE events SET status = 'Completed', updated_at = NOW()
  WHERE status = 'Ongoing' AND ends_at IS NOT NULL AND ends_at <= NOW() AND deleted_at IS NULL;
  $$
);

-- Auto-check trial expiry — runs daily at 09:00 IST (03:30 UTC)
SELECT cron.schedule(
  'check-trial-expiry',
  '30 3 * * *',
  $$
  UPDATE accounts
  SET subscription_status = 'Expired', updated_at = NOW()
  WHERE plan = 'Trial'
    AND subscription_status = 'Trialing'
    AND trial_ends_at < NOW()
    AND deleted_at IS NULL;
  $$
);

-- =============================================================================
-- USEFUL VIEWS
-- =============================================================================

-- Active properties with account info
CREATE OR REPLACE VIEW v_properties_with_account AS
SELECT
  p.*,
  a.name AS account_name,
  a.plan AS account_plan,
  a.subscription_status
FROM properties p
JOIN accounts a ON a.id = p.account_id
WHERE p.deleted_at IS NULL;

-- Complaint dashboard view (for managers)
CREATE OR REPLACE VIEW v_complaint_dashboard AS
SELECT
  c.*,
  res.id AS resident_db_id,
  pro.full_name AS resident_name,
  pro.phone AS resident_phone,
  u.unit_number,
  w.name AS wing_name,
  assigned.full_name AS assigned_to_name
FROM complaints c
JOIN residents res ON res.id = c.resident_id
JOIN profiles pro ON pro.id = res.profile_id
LEFT JOIN units u ON u.id = res.unit_id
LEFT JOIN wings w ON w.id = u.wing_id
LEFT JOIN profiles assigned ON assigned.id = c.assigned_to
WHERE c.deleted_at IS NULL;

-- Payment summary view
CREATE OR REPLACE VIEW v_payment_summary AS
SELECT
  md.property_id,
  md.year,
  md.month,
  COUNT(*) AS total_dues,
  COUNT(*) FILTER (WHERE md.status = 'Paid') AS paid_count,
  COUNT(*) FILTER (WHERE md.status = 'Overdue') AS overdue_count,
  COUNT(*) FILTER (WHERE md.status = 'Pending') AS pending_count,
  SUM(md.amount_paise) AS total_amount_paise,
  SUM(md.amount_paise) FILTER (WHERE md.status = 'Paid') AS collected_paise,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE md.status = 'Paid') / NULLIF(COUNT(*), 0),
    2
  ) AS collection_rate_pct
FROM maintenance_dues md
WHERE md.deleted_at IS NULL
GROUP BY md.property_id, md.year, md.month;

-- Occupancy rate view
CREATE OR REPLACE VIEW v_occupancy_stats AS
SELECT
  u.property_id,
  w.name AS wing_name,
  COUNT(*) AS total_units,
  COUNT(*) FILTER (WHERE u.status = 'Occupied') AS occupied_units,
  COUNT(*) FILTER (WHERE u.status = 'Vacant') AS vacant_units,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE u.status = 'Occupied') / NULLIF(COUNT(*), 0),
    2
  ) AS occupancy_rate_pct
FROM units u
LEFT JOIN wings w ON w.id = u.wing_id
WHERE u.deleted_at IS NULL
GROUP BY u.property_id, w.id, w.name;
