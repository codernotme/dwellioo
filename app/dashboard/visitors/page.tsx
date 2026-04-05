import { createClient } from "@/lib/supabase/server";
import { VisitorTable } from "./visitor-table";
import { Button } from "@heroui/react";
import { UserCheck, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";

export default async function VisitorsPage() {
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_id")
    .eq("id", user.id)
    .single() as any;

  if (!profile?.account_id) redirect("/onboarding");

  // Fetch properties
  const { data: properties } = await supabase
    .from("properties")
    .select("id")
    .eq("account_id", profile.account_id) as any;

  const propertyIds = (properties as any[])?.map(p => p.id) || [];

  // Fetch visitors for these properties
  const { data: visitors } = await supabase
    .from("visitors")
    .select(`
      *,
      residents:resident_id(
        profiles:profile_id(full_name)
      ),
      units:unit_id(unit_number)
    `)
    .in("property_id", propertyIds)
    .order("created_at", { ascending: false }) as any;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Visitor Management</h1>
          <p className="text-default-500">Track entries, pre-approve guests, and manage security logs.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" className="gap-2 font-bold h-10 px-4">
            <ShieldCheck size={18} />
            Security Mode
          </Button>
          <Button variant="primary" className="gap-2 font-bold h-10 px-4">
            <UserCheck size={18} />
            Pre-approve Guest
          </Button>
        </div>
      </div>

      <VisitorTable visitors={visitors || []} />
    </div>
  );
}
