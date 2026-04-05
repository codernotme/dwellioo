import { createClient } from "@/lib/supabase/server";
import { NoticeList } from "./notice-list";
import { Button } from "@heroui/react";
import { History, CreditCard, UserCheck, ShieldCheck, Plus } from "lucide-react";
import { redirect } from "next/navigation";

export default async function NoticesPage() {
  const supabase = await createClient();

  // Get current user and account
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("profiles")
    .select("account_id")
    .eq("id", user.id)
    .single();

  const profile = data as any;

  if (!profile?.account_id) redirect("/onboarding");

  // Fetch properties
  const { data: properties } = await supabase
    .from("properties")
    .select("id")
    .eq("account_id", profile.account_id);

  const propertyIds = ((properties as any[]) || []).map(p => p.id);

  // Fetch notices
  const { data: notices } = await (supabase
    .from("notices")
    .select(`
      *,
      author:author_id(
        full_name,
        avatar_url
      )
    `)
    .in("property_id", propertyIds)
    .order("created_at", { ascending: false }) as any);

  return (
    <div className="flex flex-col gap-6 text-foreground">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notice Board</h1>
          <p className="text-default-500 font-medium">Official announcements and community updates.</p>
        </div>
        <Button variant="primary" className="gap-2 h-10 px-4 font-bold rounded-lg shadow-sm">
          <Plus size={18} />
          Create Notice
        </Button>
      </div>

      <NoticeList notices={notices || []} />
    </div>
  );
}
