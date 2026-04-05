// =============================================================================
// Edge Function: process-otp-gate
// Watchman scans visitor OTP at gate — validates and records entry
// =============================================================================

import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OTPGatePayload {
  otp: string;
  property_id: string;
  watchman_id: string;
  selfie_url?: string;
  action: "entry" | "exit";
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

    const { otp, property_id, watchman_id, selfie_url, action }: OTPGatePayload = await req.json();

    if (!otp || !property_id || !watchman_id || !action) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find visitor by OTP
    const { data: visitor, error } = await supabase
      .from("visitors")
      .select("*")
      .eq("otp", otp)
      .eq("property_id", property_id)
      .single();

    if (error || !visitor) {
      return new Response(
        JSON.stringify({ success: false, reason: "Invalid OTP" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check OTP has not expired
    if (visitor.otp_expires_at && new Date(visitor.otp_expires_at) < new Date()) {
      await supabase
        .from("visitors")
        .update({ status: "Expired", updated_at: new Date().toISOString() })
        .eq("id", visitor.id);

      return new Response(
        JSON.stringify({ success: false, reason: "OTP expired" }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check correct status
    if (action === "entry" && visitor.status !== "Approved") {
      return new Response(
        JSON.stringify({ success: false, reason: `Visitor status is ${visitor.status}` }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "exit" && visitor.status !== "Entered") {
      return new Response(
        JSON.stringify({ success: false, reason: "Visitor has not entered yet" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check emergency lockdown
    const { data: property } = await supabase
      .from("properties")
      .select("emergency_lockdown, lockdown_message")
      .eq("id", property_id)
      .single();

    if (property?.emergency_lockdown && action === "entry") {
      return new Response(
        JSON.stringify({
          success: false,
          reason: "lockdown",
          message: property.lockdown_message ?? "Entry is restricted due to emergency lockdown.",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update visitor record
    const updatePayload: Record<string, unknown> = {
      watchman_id,
      updated_at: new Date().toISOString(),
    };

    if (action === "entry") {
      updatePayload.status = "Entered";
      updatePayload.entry_time = new Date().toISOString();
      if (selfie_url) updatePayload.selfie_url = selfie_url;
    } else {
      updatePayload.status = "Exited";
      updatePayload.exit_time = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from("visitors")
      .update(updatePayload)
      .eq("id", visitor.id);

    if (updateError) throw updateError;

    // Notify resident
    await supabase.functions.invoke("send-notification", {
      body: {
        recipient_ids: [(await supabase.from("residents").select("profile_id").eq("id", visitor.resident_id).single()).data?.profile_id],
        property_id,
        title: action === "entry" ? "Visitor Arrived" : "Visitor Left",
        body: `${visitor.name} has ${action === "entry" ? "entered" : "exited"} your premises.`,
        module: "visitors",
        reference_id: visitor.id,
        deep_link: { screen: "visitors", id: visitor.id },
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        visitor: {
          id: visitor.id,
          name: visitor.name,
          phone: visitor.phone,
          purpose: visitor.purpose,
          action,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("process-otp-gate error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
