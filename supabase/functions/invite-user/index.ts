// =============================================================================
// Edge Function: invite-user
// Send invite link via WhatsApp and/or Email to onboard staff or residents
// =============================================================================
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitePayload {
  invite_id: string;
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

    const { invite_id }: InvitePayload = await req.json();

    // Load invite with property + inviter details
    const { data: invite, error } = await supabase
      .from("invites")
      .select(`
        *,
        properties(name, slug),
        inviter:profiles!invites_inviter_id_fkey(full_name)
      `)
      .eq("id", invite_id)
      .single();

    if (error || !invite) {
      return new Response(JSON.stringify({ error: "Invite not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const appUrl = Deno.env.get("NEXT_PUBLIC_APP_URL") ?? "https://dwellioo.app";
    const inviteUrl = `${appUrl}/invite/${invite.token}`;
    const propertyName = (invite.properties as any)?.name ?? "your property";
    const inviterName = (invite.inviter as any)?.full_name ?? "The Manager";
    const roleLabel = invite.role.replace("_", " ");

    const message = `You've been invited to join *${propertyName}* on Dwellioo as ${roleLabel}.\n\n` +
      `Invited by: ${inviterName}\n` +
      `Click the link below to accept:\n${inviteUrl}\n\n` +
      `_This invite expires in 7 days._`;

    const results: Record<string, string> = {};

    // Send WhatsApp if phone provided
    if (invite.phone) {
      const waResult = await sendWhatsApp(invite.phone, message);
      results.whatsapp = waResult;
    }

    // Send Email if email provided (using Supabase Auth invite or Resend)
    if (invite.email) {
      const emailResult = await sendEmail(
        invite.email,
        `You're invited to ${propertyName} on Dwellioo`,
        message,
        inviteUrl
      );
      results.email = emailResult;
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("invite-user error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function sendWhatsApp(phone: string, message: string): Promise<string> {
  const waToken = Deno.env.get("META_WHATSAPP_TOKEN");
  const waPhoneId = Deno.env.get("META_WHATSAPP_PHONE_ID");

  if (!waToken || !waPhoneId) return "not_configured";

  const to = phone.startsWith("+") ? phone.replace("+", "") : `91${phone}`;
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
        to,
        type: "text",
        text: { body: message },
      }),
    }
  );
  return res.ok ? "sent" : `failed:${res.status}`;
}

async function sendEmail(
  to: string,
  subject: string,
  plainText: string,
  ctaUrl: string
): Promise<string> {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) return "not_configured";

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#1a1a2e">You've been invited to Dwellioo</h2>
      <p style="white-space:pre-line">${plainText.replace(/\*/g, "").replace(/\n/g, "<br>")}</p>
      <a href="${ctaUrl}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#6366f1;color:white;border-radius:8px;text-decoration:none;font-weight:600">
        Accept Invitation
      </a>
      <p style="margin-top:24px;font-size:12px;color:#999">If you weren't expecting this invite, you can safely ignore this email.</p>
    </div>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Dwellioo <noreply@dwellioo.app>",
      to,
      subject,
      html,
    }),
  });
  return res.ok ? "sent" : `failed:${res.status}`;
}
