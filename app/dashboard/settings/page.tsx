import { createClient } from "@/lib/supabase/server";
import { SettingsTabs } from "./settings-tabs";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const supabase = await createClient();

  // Get current user and profile
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("profiles")
    .select("account_id")
    .eq("id", user.id)
    .single();

  const profile = data as any;

  if (!profile?.account_id) redirect("/onboarding");

  // Fetch account details
  const { data: account } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", profile.account_id)
    .single();

  // Fetch properties
  const { data: properties } = await supabase
    .from("properties")
    .select("*")
    .eq("account_id", profile.account_id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-default-500">Manage your organization and properties.</p>
      </div>

      <SettingsTabs account={account as any} properties={(properties as any[]) || []} />
    </div>
  );
}
