import { createClient } from "@/lib/supabase/server";
import { ComplaintsTable } from "./complaints-table";
export default async function ComplaintsPage() {
  const supabase = await createClient();

  // Fetch complaints
  const { data: complaints, error } = await supabase
    .from("complaints")
    .select(`
      id,
      ticket_id,
      category,
      priority,
      status,
      created_at,
      residents:resident_id(
         profiles:profile_id(full_name, avatar_url)
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching complaints:", error);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Complaints & Tickets</h1>
          <p className="text-default-500">Manage maintenance requests and resident tickets.</p>
        </div>
      </div>
      <ComplaintsTable complaints={complaints || []} />
    </div>
  );
}
