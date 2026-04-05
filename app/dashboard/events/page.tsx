import { createClient } from "@/lib/supabase/server";
import { EventCards } from "./event-cards";
import { Button } from "@heroui/react";
import { CalendarPlus } from "lucide-react";
import { redirect } from "next/navigation";

export default async function EventsPage() {
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

  // Fetch events
  const { data: events } = await supabase
    .from("events")
    .select(`
      *,
      host:host_id(
        full_name,
        avatar_url
      )
    `)
    .in("property_id", propertyIds)
    .order("start_at", { ascending: true }) as any;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Community Events</h1>
          <p className="text-default-500">Upcoming festivals, sports, and resident meetings.</p>
        </div>
        <Button variant="primary" className="gap-2 h-10 px-4 font-bold">
          <CalendarPlus size={18} />
          Organize Event
        </Button>
      </div>

      <EventCards events={events || []} />
    </div>
  );
}
