/**
 * Supabase database type definitions.
 *
 * ✅ GENERATED FILE — do not edit manually.
 *
 * Regenerate after migrations with:
 *   npx supabase gen types typescript --project-id xsuxsujyatfcblqtiyih > types/database.ts
 *
 * This placeholder ensures TypeScript compilation succeeds before types are generated.
 * The real generated file will have a full `Database` interface matching every table,
 * view, function, and enum in your Supabase schema.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export type PropertyType = "Society" | "Hostel" | "PG" | "Co_living";
export type UnitType = "Flat" | "Room" | "Hostel_bed";
export type UnitStatus = "Vacant" | "Occupied" | "Under_Maintenance";
export type UserRole =
  | "Super_Admin"
  | "Property_Manager"
  | "Watchman"
  | "Housekeeping"
  | "Maintenance"
  | "Resident"
  | "Service_Provider";
export type SubscriptionPlan =
  | "Trial"
  | "Starter"
  | "Growth"
  | "Pro"
  | "Enterprise";
export type SubscriptionStatus =
  | "Active"
  | "Trialing"
  | "Past_Due"
  | "Cancelled"
  | "Expired";
export type ComplaintStatus =
  | "Open"
  | "Assigned"
  | "In_Progress"
  | "Resolved"
  | "Closed";
export type ComplaintPriority = "Low" | "Medium" | "High";
export type VisitorStatus =
  | "Pending"
  | "Approved"
  | "Entered"
  | "Exited"
  | "Rejected"
  | "Expired";
export type DeliveryStatus = "Expected" | "Arrived" | "Collected" | "Returned";
export type BookingStatus =
  | "Pending"
  | "Confirmed"
  | "Completed"
  | "Cancelled"
  | "No_Show";
export type RsvpStatus = "Going" | "Not_Going" | "Maybe";
export type NoticeStatus = "Draft" | "Live" | "Archived";
export type EventStatus = "Upcoming" | "Ongoing" | "Completed" | "Cancelled";
export type AnnouncementPriority = "Normal" | "Important" | "Emergency";
export type DueStatus = "Pending" | "Paid" | "Overdue" | "Partial" | "Waived";
export type PaymentMethod = "UPI" | "Card" | "Net_Banking" | "Cash";
export type ThreadStatus = "Active" | "Closed" | "Removed";
export type PollType = "Single_Choice" | "Multiple_Choice";
export type NotificationChannel = "In_App" | "Push" | "WhatsApp" | "Email" | "SMS";
export type NotificationStatus =
  | "Queued"
  | "Sent"
  | "Delivered"
  | "Failed"
  | "Skipped";
export type ProviderAvailability = "Available" | "Busy" | "On_Leave";
export type ServiceArea = "Within_Society" | "Nearby_Area" | "City_wide";
export type EventCategory =
  | "Meeting"
  | "Festival"
  | "Sports"
  | "Workshop"
  | "Maintenance_Shutdown";
export type NoticeCategory =
  | "Maintenance"
  | "Rules"
  | "General"
  | "Urgent"
  | "Festival";
export type ThreadCategory =
  | "Lost_Found"
  | "Buy_Sell"
  | "Help_Needed"
  | "General"
  | "Recommendations";
export type ResidentStatus = "Active" | "Pending" | "Archived";
export type ProviderCategory =
  | "Plumber"
  | "Electrician"
  | "Carpenter"
  | "Painter"
  | "AC_Repair"
  | "Pest_Control"
  | "Cleaning"
  | "Maid"
  | "Driver"
  | "Tutor"
  | "Doctor"
  | "Gym_Trainer"
  | "Other";
export type VehicleType = "Car" | "Bike" | "Scooter" | "Cycle" | "Other";

// ---------------------------------------------------------------------------
// Table row types (placeholder — replace with `supabase gen types`)
// ---------------------------------------------------------------------------
export interface Database {
  public: {
    Tables: {
      accounts: {
        Row: {
          id: string;
          owner_id: string | null;
          name: string;
          slug: string;
          plan: SubscriptionPlan;
          subscription_status: SubscriptionStatus;
          trial_ends_at: string | null;
          razorpay_subscription_id: string | null;
          razorpay_customer_id: string | null;
          max_properties: number;
          max_units: number;
          max_staff: number;
          max_wa_sends_per_month: number;
          white_label: boolean;
          custom_accent_color: string | null;
          custom_logo_url: string | null;
          feature_flags: Json;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["accounts"]["Row"]> & {
          name: string;
          slug: string;
        };
        Update: Partial<Database["public"]["Tables"]["accounts"]["Row"]>;
      };
      profiles: {
        Row: {
          id: string;
          account_id: string | null;
          role: UserRole;
          full_name: string | null;
          avatar_url: string | null;
          phone: string | null;
          email: string | null;
          locale: string;
          timezone: string;
          theme: string;
          push_tokens: string[];
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      };
      properties: {
        Row: {
          id: string;
          account_id: string;
          name: string;
          slug: string;
          type: PropertyType;
          address: string | null;
          city: string | null;
          state: string | null;
          pincode: string | null;
          cover_image_url: string | null;
          timezone: string;
          maintenance_amount_paise: number;
          late_fee_percent: number;
          sla_hours: number;
          booking_cancel_window_hours: number;
          auto_approve_residents: boolean;
          require_visitor_otp: boolean;
          visitor_otp_expiry_hours: number;
          default_notification_channels: NotificationChannel[];
          emergency_lockdown: boolean;
          lockdown_message: string | null;
          onboarding_step: number;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["properties"]["Row"]> & {
          account_id: string;
          name: string;
          slug: string;
        };
        Update: Partial<Database["public"]["Tables"]["properties"]["Row"]>;
      };
      units: {
        Row: {
          id: string;
          property_id: string;
          wing_id: string | null;
          floor_id: string | null;
          unit_number: string;
          type: UnitType;
          status: UnitStatus;
          monthly_rent_paise: number;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["units"]["Row"]> & {
          property_id: string;
          unit_number: string;
        };
        Update: Partial<Database["public"]["Tables"]["units"]["Row"]>;
      };
      residents: {
        Row: {
          id: string;
          profile_id: string;
          property_id: string;
          unit_id: string | null;
          status: ResidentStatus;
          move_in_date: string | null;
          move_out_date: string | null;
          emergency_contact_name: string | null;
          emergency_contact_phone: string | null;
          emergency_contact_relation: string | null;
          in_directory: boolean;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["residents"]["Row"]> & {
          profile_id: string;
          property_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["residents"]["Row"]>;
      };
      notices: {
        Row: {
          id: string;
          property_id: string;
          author_id: string | null;
          title: string;
          body: string;
          category: NoticeCategory;
          status: NoticeStatus;
          image_urls: string[];
          pdf_urls: string[];
          pinned: boolean;
          target_wing_id: string | null;
          target_floor_id: string | null;
          publish_at: string | null;
          expires_at: string | null;
          views_count: number;
          read_count: number;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["notices"]["Row"]> & {
          property_id: string;
          title: string;
          body: string;
        };
        Update: Partial<Database["public"]["Tables"]["notices"]["Row"]>;
      };
      complaints: {
        Row: {
          id: string;
          property_id: string;
          resident_id: string;
          ticket_id: string;
          category: string;
          description: string;
          photo_urls: string[];
          priority: ComplaintPriority;
          status: ComplaintStatus;
          assigned_to: string | null;
          sla_deadline_at: string | null;
          sla_breached: boolean;
          estimated_resolution_at: string | null;
          resolved_at: string | null;
          resident_rating: number | null;
          resident_review: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["complaints"]["Row"]> & {
          property_id: string;
          resident_id: string;
          category: string;
          description: string;
        };
        Update: Partial<Database["public"]["Tables"]["complaints"]["Row"]>;
      };
      visitors: {
        Row: {
          id: string;
          property_id: string;
          unit_id: string | null;
          resident_id: string;
          name: string;
          phone: string;
          purpose: string | null;
          vehicle_number: string | null;
          pre_approved_from: string | null;
          pre_approved_until: string | null;
          otp: string | null;
          otp_expires_at: string | null;
          status: VisitorStatus;
          watchman_id: string | null;
          selfie_url: string | null;
          entry_time: string | null;
          exit_time: string | null;
          is_whitelisted: boolean;
          is_walkin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["visitors"]["Row"]> & {
          property_id: string;
          resident_id: string;
          name: string;
          phone: string;
        };
        Update: Partial<Database["public"]["Tables"]["visitors"]["Row"]>;
      };
      maintenance_dues: {
        Row: {
          id: string;
          property_id: string;
          unit_id: string;
          resident_id: string;
          year: number;
          month: number;
          amount_paise: number;
          due_date: string;
          status: DueStatus;
          late_fee_paise: number;
          waived_by: string | null;
          waive_reason: string | null;
          reminder_sent_count: number;
          last_reminder_sent_at: string | null;
          admin_notes: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["maintenance_dues"]["Row"]> & {
          property_id: string;
          unit_id: string;
          resident_id: string;
          year: number;
          month: number;
          amount_paise: number;
          due_date: string;
        };
        Update: Partial<Database["public"]["Tables"]["maintenance_dues"]["Row"]>;
      };
      notifications: {
        Row: {
          id: string;
          account_id: string | null;
          property_id: string | null;
          recipient_id: string;
          channel: NotificationChannel;
          title: string;
          body: string;
          deep_link: Json;
          module: string | null;
          reference_id: string | null;
          status: NotificationStatus;
          scheduled_at: string | null;
          sent_at: string | null;
          delivered_at: string | null;
          retry_count: number;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["notifications"]["Row"]> & {
          recipient_id: string;
          channel: NotificationChannel;
          title: string;
          body: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Row"]>;
      };
    };
    Views: {
      v_complaint_dashboard: {
        Row: Record<string, unknown>;
      };
      v_payment_summary: {
        Row: Record<string, unknown>;
      };
      v_occupancy_stats: {
        Row: Record<string, unknown>;
      };
    };
    Functions: {
      generate_ticket_id: {
        Args: Record<string, never>;
        Returns: string;
      };
      generate_receipt_number: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
    Enums: {
      property_type: PropertyType;
      unit_type: UnitType;
      unit_status: UnitStatus;
      user_role: UserRole;
      subscription_plan: SubscriptionPlan;
      subscription_status: SubscriptionStatus;
      complaint_status: ComplaintStatus;
      complaint_priority: ComplaintPriority;
      visitor_status: VisitorStatus;
      delivery_status: DeliveryStatus;
      booking_status: BookingStatus;
      rsvp_status: RsvpStatus;
      notice_status: NoticeStatus;
      event_status: EventStatus;
      announcement_priority: AnnouncementPriority;
      due_status: DueStatus;
      payment_method: PaymentMethod;
      thread_status: ThreadStatus;
      poll_type: PollType;
      notification_channel: NotificationChannel;
      notification_status: NotificationStatus;
      provider_availability: ProviderAvailability;
      service_area: ServiceArea;
      event_category: EventCategory;
      notice_category: NoticeCategory;
      thread_category: ThreadCategory;
      resident_status: ResidentStatus;
      provider_category: ProviderCategory;
      vehicle_type: VehicleType;
    };
  };
}
