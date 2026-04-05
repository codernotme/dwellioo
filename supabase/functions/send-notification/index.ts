// =============================================================================
// Edge Function: send-notification
// Fan-out notification across channels (In-App, Push, WhatsApp, Email, SMS)
// Called by backend triggers or other Edge Functions
// =============================================================================
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationPayload {
  recipient_ids: string[];   // profile IDs
  property_id?: string;
  account_id?: string;
  title: string;
  body: string;
  module?: string;
  reference_id?: string;
  deep_link?: Record<string, unknown>;
  channels?: string[];       // Override channels; defaults to user preferences
  scheduled_at?: string;     // ISO timestamp for future delivery
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const payload: NotificationPayload = await req.json();
    const {
      recipient_ids,
      property_id,
      account_id,
      title,
      body,
      module,
      reference_id,
      deep_link = {},
      channels,
      scheduled_at,
    } = payload;

    const notifications: Record<string, unknown>[] = [];

    for (const recipient_id of recipient_ids) {
      // Get user notification preferences
      let activeChannels = channels ?? ["In_App"];

      if (!channels && property_id && module) {
        const { data: prefs } = await supabase
          .from("notification_preferences")
          .select("channels, enabled")
          .eq("profile_id", recipient_id)
          .eq("property_id", property_id)
          .eq("module", module)
          .single();

        if (prefs) {
          activeChannels = prefs.enabled ? prefs.channels : [];
        }
      }

      for (const channel of activeChannels) {
        notifications.push({
          recipient_id,
          account_id: account_id ?? null,
          property_id: property_id ?? null,
          channel,
          title,
          body,
          module: module ?? null,
          reference_id: reference_id ?? null,
          deep_link,
          status: scheduled_at ? "Queued" : "Queued",
          scheduled_at: scheduled_at ?? null,
        });
      }
    }

    // Batch insert notification records
    const { error: insertError } = await supabase
      .from("notifications")
      .insert(notifications);

    if (insertError) throw insertError;

    // For immediate (non-scheduled) In-App notifications — no extra action needed;
    // the frontend polls/subscribes via Supabase Realtime.

    // For Push notifications — dispatch Web Push via push_subscriptions
    if (!scheduled_at) {
      const pushRecipients = notifications
        .filter((n) => n.channel === "Push")
        .map((n) => n.recipient_id as string);

      if (pushRecipients.length > 0) {
        const { data: subs } = await supabase
          .from("push_subscriptions")
          .select("endpoint, p256dh, auth, profile_id")
          .in("profile_id", pushRecipients);

        for (const sub of subs ?? []) {
          // Web Push via Deno native fetch (VAPID not included here — implement as needed)
          console.log(`[Push] Would send to endpoint: ${sub.endpoint.substring(0, 30)}...`);
          // TODO: Implement VAPID-signed Web Push here using web-push library
        }
      }

      // For WhatsApp — call Meta Cloud API
      const waRecipients = notifications.filter((n) => n.channel === "WhatsApp");
      for (const notif of waRecipients) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("phone")
          .eq("id", notif.recipient_id)
          .single();

        if (profile?.phone) {
          await sendWhatsAppMessage(profile.phone, title, body);
        }
      }
    }

    return new Response(
      JSON.stringify({ queued: notifications.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Notification error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function sendWhatsAppMessage(phone: string, title: string, body: string) {
  const waToken = Deno.env.get("META_WHATSAPP_TOKEN");
  const waPhoneId = Deno.env.get("META_WHATSAPP_PHONE_ID");

  if (!waToken || !waPhoneId) {
    console.warn("WhatsApp credentials not configured");
    return;
  }

  const to = phone.startsWith("+") ? phone.replace("+", "") : `91${phone}`;

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${waPhoneId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${waToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "text",
          text: { body: `*${title}*\n\n${body}` },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("WhatsApp send failed:", err);
    }
  } catch (e) {
    console.error("WhatsApp fetch error:", e);
  }
}
