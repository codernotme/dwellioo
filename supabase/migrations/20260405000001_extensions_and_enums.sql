-- =============================================================================
-- Migration 0001: Extensions & ENUMs
-- Dwellioo SaaS Platform
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";
-- pg_cron and pg_net are pre-enabled on Supabase hosted
-- CREATE EXTENSION IF NOT EXISTS "pg_cron";
-- CREATE EXTENSION IF NOT EXISTS "pg_net";

-- ---------------------------------------------------------------------------
-- ENUMs
-- ---------------------------------------------------------------------------

CREATE TYPE property_type AS ENUM ('Society', 'Hostel', 'PG', 'Co_living');

CREATE TYPE unit_type AS ENUM ('Flat', 'Room', 'Hostel_bed');

CREATE TYPE unit_status AS ENUM ('Vacant', 'Occupied', 'Under_Maintenance');

CREATE TYPE user_role AS ENUM (
  'Super_Admin',
  'Property_Manager',
  'Watchman',
  'Housekeeping',
  'Maintenance',
  'Resident',
  'Service_Provider'
);

CREATE TYPE subscription_plan AS ENUM (
  'Trial',
  'Starter',
  'Growth',
  'Pro',
  'Enterprise'
);

CREATE TYPE subscription_status AS ENUM (
  'Active',
  'Trialing',
  'Past_Due',
  'Cancelled',
  'Expired'
);

CREATE TYPE complaint_status AS ENUM (
  'Open',
  'Assigned',
  'In_Progress',
  'Resolved',
  'Closed'
);

CREATE TYPE complaint_priority AS ENUM ('Low', 'Medium', 'High');

CREATE TYPE visitor_status AS ENUM (
  'Pending',
  'Approved',
  'Entered',
  'Exited',
  'Rejected',
  'Expired'
);

CREATE TYPE delivery_status AS ENUM (
  'Expected',
  'Arrived',
  'Collected',
  'Returned'
);

CREATE TYPE booking_status AS ENUM (
  'Pending',
  'Confirmed',
  'Completed',
  'Cancelled',
  'No_Show'
);

CREATE TYPE rsvp_status AS ENUM ('Going', 'Not_Going', 'Maybe');

CREATE TYPE notice_status AS ENUM ('Draft', 'Live', 'Archived');

CREATE TYPE event_status AS ENUM (
  'Upcoming',
  'Ongoing',
  'Completed',
  'Cancelled'
);

CREATE TYPE announcement_priority AS ENUM ('Normal', 'Important', 'Emergency');

CREATE TYPE due_status AS ENUM (
  'Pending',
  'Paid',
  'Overdue',
  'Partial',
  'Waived'
);

CREATE TYPE payment_method AS ENUM ('UPI', 'Card', 'Net_Banking', 'Cash');

CREATE TYPE thread_status AS ENUM ('Active', 'Closed', 'Removed');

CREATE TYPE poll_type AS ENUM ('Single_Choice', 'Multiple_Choice');

CREATE TYPE notification_channel AS ENUM (
  'In_App',
  'Push',
  'WhatsApp',
  'Email',
  'SMS'
);

CREATE TYPE notification_status AS ENUM (
  'Queued',
  'Sent',
  'Delivered',
  'Failed',
  'Skipped'
);

CREATE TYPE provider_availability AS ENUM ('Available', 'Busy', 'On_Leave');

CREATE TYPE service_area AS ENUM (
  'Within_Society',
  'Nearby_Area',
  'City_wide'
);

CREATE TYPE event_category AS ENUM (
  'Meeting',
  'Festival',
  'Sports',
  'Workshop',
  'Maintenance_Shutdown'
);

CREATE TYPE notice_category AS ENUM (
  'Maintenance',
  'Rules',
  'General',
  'Urgent',
  'Festival'
);

CREATE TYPE thread_category AS ENUM (
  'Lost_Found',
  'Buy_Sell',
  'Help_Needed',
  'General',
  'Recommendations'
);

CREATE TYPE resident_status AS ENUM ('Active', 'Pending', 'Archived');

CREATE TYPE provider_category AS ENUM (
  'Plumber',
  'Electrician',
  'Carpenter',
  'Painter',
  'AC_Repair',
  'Pest_Control',
  'Cleaning',
  'Maid',
  'Driver',
  'Tutor',
  'Doctor',
  'Gym_Trainer',
  'Other'
);

CREATE TYPE vehicle_type AS ENUM ('Car', 'Bike', 'Scooter', 'Cycle', 'Other');
