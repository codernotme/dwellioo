import { createClient } from "@/lib/supabase/server";
import { ResidentsTable } from "./residents-table";
export default async function ResidentsPage() {
  const supabase = await createClient();

  // Fetch residents and outer join profiles
  // Based strictly on types/database.ts: residents have profile_id and status.
  const { data: residents, error } = await supabase
    .from("residents")
    .select(`
      id,
      status,
      move_in_date,
      profiles:profile_id(full_name, email, phone, avatar_url),
      units:unit_id(unit_number)
    `)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Residents Management</h1>
          <p className="text-default-500">View and manage residents within the property.</p>
        </div>
      </div>
      <ResidentsTable residents={residents || []} />
    </div>
  );
}
