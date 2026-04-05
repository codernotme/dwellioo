import { createClient } from "@/lib/supabase/server";
import { BillingTable } from "./billing-table";
import { Button, Card } from "@heroui/react";
import { Wallet, History, CreditCard, ArrowRight } from "lucide-react";
import { redirect } from "next/navigation";

export default async function BillingPage() {
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

  // Fetch maintenance dues
  const { data: dues } = await supabase
    .from("maintenance_dues")
    .select(`
      *,
      units:unit_id(unit_number),
      residents:resident_id(
        profiles:profile_id(full_name)
      )
    `)
    .in("property_id", propertyIds)
    .order("due_date", { ascending: false }) as any;

  // Calculate stats
  const totalDuePaise = (dues as any[])?.filter(d => d.status === 'Pending').reduce((acc, d) => acc + (d.amount_paise || 0), 0) || 0;
  const totalPaidPaise = (dues as any[])?.filter(d => d.status === 'Paid').reduce((acc, d) => acc + (d.amount_paise || 0), 0) || 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Billing & Payments</h1>
          <p className="text-default-500">Track community maintenance, dues, and payment history.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" className="gap-2 font-bold h-10 px-4">
            <History size={18} />
            Payment History
          </Button>
          <Button variant="primary" className="gap-2 font-bold h-10 px-4 group">
            <CreditCard size={18} />
            Pay All Dues
            <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-2">
        <Card className="p-6 border border-default-200 shadow-sm bg-background flex flex-col gap-1">
          <span className="text-xs font-bold text-default-400 uppercase tracking-widest">Total Pending</span>
          <span className="text-3xl font-black text-danger">₹ {(totalDuePaise / 100).toLocaleString()}</span>
        </Card>
        <Card className="p-6 border border-default-200 shadow-sm bg-background flex flex-col gap-1">
          <span className="text-xs font-bold text-default-400 uppercase tracking-widest">Total Collected</span>
          <span className="text-3xl font-black text-success">₹ {(totalPaidPaise / 100).toLocaleString()}</span>
        </Card>
        <Card className="p-6 border border-default-200 shadow-sm bg-background flex flex-col gap-1">
          <span className="text-xs font-bold text-default-400 uppercase tracking-widest">Active Units</span>
          <span className="text-3xl font-black">24</span>
        </Card>
      </div>

      <BillingTable dues={dues || []} />
    </div>
  );
}
