-- =============================================================================
-- Seed Data — Dwellioo SaaS Platform
-- Creates: 1 super admin, 1 demo account, 1 property, wings/floors/units,
--          staff, residents, sample notices, events, complaint
-- =============================================================================

-- NOTE: auth.users rows must be created via Supabase Auth API (magic link / admin API).
-- This seed creates profile extension rows assuming the auth users already exist.
-- For local dev, run: supabase auth admin create-user --email admin@dwellioo.test

-- ---------------------------------------------------------------------------
-- IDs (fixed for reproducibility in dev)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  -- Accounts
  v_super_admin_id    UUID := '00000000-0000-0000-0000-000000000001';
  v_account_id        UUID := '10000000-0000-0000-0000-000000000001';
  v_owner_id          UUID := '20000000-0000-0000-0000-000000000001';

  -- Staff profiles
  v_manager_id        UUID := '20000000-0000-0000-0000-000000000002';
  v_watchman_id       UUID := '20000000-0000-0000-0000-000000000003';
  v_housekeeping_id   UUID := '20000000-0000-0000-0000-000000000004';

  -- Resident profiles
  v_resident1_id      UUID := '20000000-0000-0000-0000-000000000010';
  v_resident2_id      UUID := '20000000-0000-0000-0000-000000000011';
  v_resident3_id      UUID := '20000000-0000-0000-0000-000000000012';

  -- Property structure
  v_property_id       UUID := '30000000-0000-0000-0000-000000000001';
  v_wing_a_id         UUID := '40000000-0000-0000-0000-000000000001';
  v_wing_b_id         UUID := '40000000-0000-0000-0000-000000000002';
  v_floor1_a_id       UUID := '50000000-0000-0000-0000-000000000001';
  v_floor2_a_id       UUID := '50000000-0000-0000-0000-000000000002';
  v_floor1_b_id       UUID := '50000000-0000-0000-0000-000000000003';
  v_unit_101_id       UUID := '60000000-0000-0000-0000-000000000001';
  v_unit_102_id       UUID := '60000000-0000-0000-0000-000000000002';
  v_unit_201_id       UUID := '60000000-0000-0000-0000-000000000003';
  v_unit_b101_id      UUID := '60000000-0000-0000-0000-000000000004';
  v_unit_b102_id      UUID := '60000000-0000-0000-0000-000000000005';

  -- Resident rows
  v_res1_id           UUID := '70000000-0000-0000-0000-000000000001';
  v_res2_id           UUID := '70000000-0000-0000-0000-000000000002';
  v_res3_id           UUID := '70000000-0000-0000-0000-000000000003';

  -- Provider
  v_provider_id       UUID := '80000000-0000-0000-0000-000000000001';

BEGIN

-- ---------------------------------------------------------------------------
-- ACCOUNTS (demo)
-- ---------------------------------------------------------------------------
INSERT INTO accounts (id, owner_id, name, slug, plan, subscription_status)
VALUES (
  v_account_id,
  v_owner_id,
  'Sunshine Housing Society',
  'sunshine-housing',
  'Growth',
  'Active'
) ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- PROFILES (demo) — assumes auth.users rows pre-created
-- ---------------------------------------------------------------------------
INSERT INTO profiles (id, account_id, role, full_name, phone, email) VALUES
  (v_owner_id,        v_account_id, 'Property_Manager', 'Ramesh Verma',    '+919876543210', 'ramesh@example.com'),
  (v_manager_id,      v_account_id, 'Property_Manager', 'Sunita Nair',     '+919876543211', 'sunita@example.com'),
  (v_watchman_id,     v_account_id, 'Watchman',         'Raju Kumar',      '+919876543212', 'raju@example.com'),
  (v_housekeeping_id, v_account_id, 'Housekeeping',     'Meena Devi',      '+919876543213', 'meena@example.com'),
  (v_resident1_id,    v_account_id, 'Resident',         'Priya Sharma',    '+919876543220', 'priya@example.com'),
  (v_resident2_id,    v_account_id, 'Resident',         'Arjun Mehta',     '+919876543221', 'arjun@example.com'),
  (v_resident3_id,    v_account_id, 'Resident',         'Ananya Pillai',   '+919876543222', 'ananya@example.com')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- PROPERTY
-- ---------------------------------------------------------------------------
INSERT INTO properties (
  id, account_id, name, slug, type, address, city, state, pincode,
  maintenance_amount_paise, late_fee_percent, sla_hours, onboarding_step
) VALUES (
  v_property_id, v_account_id,
  'Sunshine Residency', 'sunshine-residency', 'Society',
  '123, MG Road, Koramangala', 'Bengaluru', 'Karnataka', '560034',
  150000,  -- ₹1,500
  5.0,     -- 5% late fee
  48,      -- 48hr SLA
  5        -- Onboarding complete
) ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- WINGS
-- ---------------------------------------------------------------------------
INSERT INTO wings (id, property_id, name) VALUES
  (v_wing_a_id, v_property_id, 'Wing A'),
  (v_wing_b_id, v_property_id, 'Wing B')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- FLOORS
-- ---------------------------------------------------------------------------
INSERT INTO floors (id, wing_id, property_id, floor_number, name) VALUES
  (v_floor1_a_id, v_wing_a_id, v_property_id, 1, 'First Floor'),
  (v_floor2_a_id, v_wing_a_id, v_property_id, 2, 'Second Floor'),
  (v_floor1_b_id, v_wing_b_id, v_property_id, 1, 'First Floor')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- UNITS
-- ---------------------------------------------------------------------------
INSERT INTO units (id, property_id, wing_id, floor_id, unit_number, type, status) VALUES
  (v_unit_101_id,  v_property_id, v_wing_a_id, v_floor1_a_id, 'A-101', 'Flat', 'Occupied'),
  (v_unit_102_id,  v_property_id, v_wing_a_id, v_floor1_a_id, 'A-102', 'Flat', 'Occupied'),
  (v_unit_201_id,  v_property_id, v_wing_a_id, v_floor2_a_id, 'A-201', 'Flat', 'Vacant'),
  (v_unit_b101_id, v_property_id, v_wing_b_id, v_floor1_b_id, 'B-101', 'Flat', 'Occupied'),
  (v_unit_b102_id, v_property_id, v_wing_b_id, v_floor1_b_id, 'B-102', 'Flat', 'Vacant')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- STAFF ASSIGNMENTS
-- ---------------------------------------------------------------------------
INSERT INTO staff_assignments (profile_id, property_id, role, permissions) VALUES
  (v_owner_id,        v_property_id, 'Property_Manager', '{"all": true}'),
  (v_manager_id,      v_property_id, 'Property_Manager', '{"all": true}'),
  (v_watchman_id,     v_property_id, 'Watchman',         '{"gate": true, "visitors": true}'),
  (v_housekeeping_id, v_property_id, 'Housekeeping',     '{"complaints": true}')
ON CONFLICT (profile_id, property_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- RESIDENTS
-- ---------------------------------------------------------------------------
INSERT INTO residents (id, profile_id, property_id, unit_id, status, move_in_date) VALUES
  (v_res1_id, v_resident1_id, v_property_id, v_unit_101_id,  'Active', '2024-01-15'),
  (v_res2_id, v_resident2_id, v_property_id, v_unit_102_id,  'Active', '2024-03-01'),
  (v_res3_id, v_resident3_id, v_property_id, v_unit_b101_id, 'Active', '2024-06-10')
ON CONFLICT (profile_id, property_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- SAMPLE NOTICE
-- ---------------------------------------------------------------------------
INSERT INTO notices (property_id, author_id, title, body, category, status, pinned, publish_at)
VALUES (
  v_property_id, v_owner_id,
  'Water Supply Maintenance — 15 Apr',
  'Dear Residents,\n\nPlease note that water supply will be interrupted from 10:00 AM to 2:00 PM on April 15, 2026 due to scheduled maintenance work on the main pipeline.\n\nKindly store adequate water in advance.\n\nThank you for your cooperation.',
  'Maintenance', 'Live', TRUE, NOW()
) ON CONFLICT DO NOTHING;

INSERT INTO notices (property_id, author_id, title, body, category, status)
VALUES (
  v_property_id, v_owner_id,
  'Society Rules Reminder',
  'Dear Residents,\n\n1. Quiet hours: 10 PM – 6 AM\n2. Pets must be on leash in common areas\n3. No parking in fire exit lanes\n4. Garbage disposal only in designated bins\n\nPlease adhere to these rules for a harmonious living experience.',
  'Rules', 'Live'
) ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- SAMPLE EVENT
-- ---------------------------------------------------------------------------
INSERT INTO events (property_id, author_id, title, description, category, status, venue, starts_at, ends_at)
VALUES (
  v_property_id, v_owner_id,
  'Annual General Meeting 2026',
  'All residents are invited to the Annual General Meeting. Agenda: Society budget review, maintenance fund update, new committee elections.',
  'Meeting', 'Upcoming',
  'Community Hall, Ground Floor',
  (NOW() + INTERVAL '7 days')::DATE || ' 10:00:00'::TIME,
  (NOW() + INTERVAL '7 days')::DATE || ' 12:00:00'::TIME
) ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- SAMPLE COMPLAINT
-- ---------------------------------------------------------------------------
INSERT INTO complaints (property_id, resident_id, category, description, priority)
VALUES (
  v_property_id, v_res1_id,
  'Plumbing',
  'Leaking tap in kitchen. Water dripping continuously from the faucet. Has been ongoing for 3 days.',
  'Medium'
) ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- SAMPLE SERVICE PROVIDER
-- ---------------------------------------------------------------------------
INSERT INTO service_providers (
  id, property_id, name, category, tags, bio, phone, whatsapp,
  working_hours, service_area, base_price_paise, years_experience, languages, verified
) VALUES (
  v_provider_id, v_property_id,
  'Suresh Plumbing Works', 'Plumber',
  ARRAY['leakage', 'pipe repair', 'tap installation'],
  'Expert plumber with 10+ years experience. Available for emergency calls.',
  '+919876543230', '+919876543230',
  'Mon-Sat 8am-8pm',
  'Within_Society',
  50000,  -- ₹500 base price
  10,
  ARRAY['Hindi', 'Kannada'],
  TRUE
) ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- SAMPLE ANNOUNCEMENT
-- ---------------------------------------------------------------------------
INSERT INTO announcements (
  property_id, author_id, title, body, priority, channels, published_at, total_recipients
) VALUES (
  v_property_id, v_owner_id,
  'Welcome to Dwellioo! 🎉',
  'We have launched the Sunshine Residency community portal on Dwellioo. You can now pay maintenance dues, raise complaints, pre-approve visitors, and stay updated on society notices — all from your phone!',
  'Normal',
  ARRAY['In_App', 'WhatsApp']::notification_channel[],
  NOW(),
  3  -- 3 active residents
) ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- SAMPLE MAINTENANCE DUES (for April 2026)
-- ---------------------------------------------------------------------------
INSERT INTO maintenance_dues (
  property_id, unit_id, resident_id,
  year, month, amount_paise, due_date, status
) VALUES
  (v_property_id, v_unit_101_id,  v_res1_id, 2026, 4, 150000, '2026-04-10', 'Pending'),
  (v_property_id, v_unit_102_id,  v_res2_id, 2026, 4, 150000, '2026-04-10', 'Pending'),
  (v_property_id, v_unit_b101_id, v_res3_id, 2026, 4, 150000, '2026-04-10', 'Pending')
ON CONFLICT (unit_id, year, month) DO NOTHING;

-- ---------------------------------------------------------------------------
-- SAMPLE POLL
-- ---------------------------------------------------------------------------
WITH poll_insert AS (
  INSERT INTO polls (property_id, author_id, title, description, type, closes_at)
  VALUES (
    v_property_id, v_owner_id,
    'Preferred time for Annual General Meeting',
    'Please vote for the time slot that works best for you.',
    'Single_Choice',
    NOW() + INTERVAL '5 days'
  )
  RETURNING id
)
INSERT INTO poll_options (poll_id, label, display_order)
SELECT id, option, ord FROM poll_insert,
  (VALUES ('10:00 AM – 12:00 PM', 1), ('2:00 PM – 4:00 PM', 2), ('6:00 PM – 8:00 PM', 3)) AS opts(option, ord)
ON CONFLICT DO NOTHING;

END $$;
