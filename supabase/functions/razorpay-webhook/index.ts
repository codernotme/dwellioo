// =============================================================================
// Edge Function: razorpay-webhook
// Handles Razorpay subscription lifecycle events and updates account plan status
// =============================================================================
import { createClient } from "jsr:@supabase/supabase-js@2";
import { crypto } from "jsr:@std/crypto";
import { encodeHex } from "jsr:@std/encoding/hex";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-razorpay-signature",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");
    const webhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET")!;

    // Verify Razorpay webhook signature
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(webhookSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sigBytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
    const expectedSig = encodeHex(new Uint8Array(sigBytes));

    if (expectedSig !== signature) {
      console.error("Invalid Razorpay webhook signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const event = JSON.parse(rawBody);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const eventType: string = event.event;
    const payload = event.payload;

    console.log("Razorpay webhook event:", eventType);

    switch (eventType) {
      case "subscription.activated": {
        const sub = payload.subscription.entity;
        await supabase
          .from("accounts")
          .update({
            subscription_status: "Active",
            razorpay_subscription_id: sub.id,
            updated_at: new Date().toISOString(),
          })
          .eq("razorpay_subscription_id", sub.id);
        break;
      }

      case "subscription.charged": {
        const sub = payload.subscription.entity;
        const payment = payload.payment?.entity;
        // Record invoice
        const { data: account } = await supabase
          .from("accounts")
          .select("id")
          .eq("razorpay_subscription_id", sub.id)
          .single();

        if (account && payment) {
          await supabase.from("billing_invoices").insert({
            account_id: account.id,
            razorpay_invoice_id: payment.invoice_id || payment.id,
            amount_paise: payment.amount,
            status: "paid",
            paid_at: new Date(payment.created_at * 1000).toISOString(),
          });
        }
        break;
      }

      case "subscription.cancelled": {
        const sub = payload.subscription.entity;
        await supabase
          .from("accounts")
          .update({
            subscription_status: "Cancelled",
            updated_at: new Date().toISOString(),
          })
          .eq("razorpay_subscription_id", sub.id);
        break;
      }

      case "subscription.paused": {
        const sub = payload.subscription.entity;
        await supabase
          .from("accounts")
          .update({
            subscription_status: "Past_Due",
            updated_at: new Date().toISOString(),
          })
          .eq("razorpay_subscription_id", sub.id);
        break;
      }

      default:
        console.log("Unhandled Razorpay event:", eventType);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Razorpay webhook error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
