import { createClient } from "@/lib/supabase/server";
import { Card, Button } from "@heroui/react";
import { Building2, Users, AlertCircle, CalendarCheck, Bell, History, Wallet, CreditCard } from "lucide-react";
import { DashboardQuickActions } from "./quick-actions";
import { redirect } from "next/navigation";

export default async function DashboardHomePage() {
  const supabase = await createClient();

  // Get current user and account
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error: profileError } = await (supabase as any)
    .from("profiles")
    .select("account_id")
    .eq("id", user.id)
    .single();

  const profile = data as any; // Cast for now for quick fix

  if (!profile?.account_id) redirect("/onboarding");

  // Fetch properties count
  const { count: propertiesCount } = await (supabase as any)
    .from("properties")
    .select("*", { count: "exact", head: true })
    .eq("account_id", profile.account_id);

  // Fetch some aggregate data
  const { count: residentsCount } = await (supabase as any)
    .from("residents")
    .select("*", { count: "exact", head: true })
    .eq("status", "Active");

  const { count: complaintsCount } = await (supabase as any)
    .from("complaints")
    .select("*", { count: "exact", head: true })
    .eq("status", "Open");

  const { count: visitorsCount } = await (supabase as any)
    .from("visitors")
    .select("*", { count: "exact", head: true })
    .eq("status", "Pending");

  const { count: noticesCount } = await (supabase as any)
    .from("notices")
    .select("*", { count: "exact", head: true });

  const metrics = [
    {
      label: "Active Residents",
      value: (residentsCount as number) || 0,
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Open Complaints",
      value: (complaintsCount as number) || 0,
      icon: AlertCircle,
      color: "text-danger",
      bg: "bg-danger/10",
    },
    {
      label: "Pending Visitors",
      value: (visitorsCount as number) || 0,
      icon: CalendarCheck,
      color: "text-accent",
      bg: "bg-accent/10",
    },
    {
      label: "Properties",
      value: (propertiesCount as number) || 1,
      icon: Building2,
      color: "text-success",
      bg: "bg-success/10",
    },
  ];

  return (
    <div className="flex flex-col gap-8 pb-12">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tightest">Overview</h1>
          <p className="text-default-500 font-medium tracking-tight">Real-time pulses of your managed properties.</p>
        </div>
        <Card className="px-4 py-2 bg-accent/5 border border-accent/20 flex flex-row items-center gap-3">
           <Bell className="text-accent" size={18} />
           <span className="text-sm font-bold text-accent-700">{noticesCount || 0} Open Notices</span>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className="p-6 border border-default-200 shadow-lg bg-background group hover:border-primary/50 transition-all cursor-default">
            <div className="flex items-center gap-5">
              <div className={`p-4 rounded-2xl ${metric.bg} group-hover:scale-110 transition-transform`}>
                <metric.icon className={`w-7 h-7 ${metric.color}`} />
              </div>
              <div>
                <p className="text-xs font-black text-default-400 uppercase tracking-widest">{metric.label}</p>
                <p className="text-3xl font-black tracking-tighter">{metric.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-4">
         <h2 className="text-lg font-bold mb-4 tracking-tight flex items-center gap-2 uppercase text-default-400">
           Quick Actions
         </h2>
         <DashboardQuickActions />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-4">
        <Card className="lg:col-span-2 p-8 border border-default-200 bg-background shadow-md flex flex-col gap-6">
           <div className="flex items-center justify-between">
              <h3 className="font-black text-xl tracking-tight">Recent Activity</h3>
              <History className="text-default-300" size={20} />
           </div>
           
           <div className="flex flex-col gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl hover:bg-default-50 transition-colors border border-default-100">
                   <div className="w-10 h-10 rounded-full bg-default-100 flex items-center justify-center">
                      <Users size={18} className="text-default-400" />
                   </div>
                   <div className="flex-1">
                      <p className="text-sm font-bold tracking-tight">Resident joined Property A</p>
                      <p className="text-xs text-default-400 font-medium">Aryan S. just registered as a new resident.</p>
                   </div>
                   <span className="text-[10px] font-bold text-default-300 uppercase">2h ago</span>
                </div>
              ))}
           </div>
        </Card>

        <Card className="p-8 border border-default-200 bg-background shadow-md flex flex-col gap-6">
           <div className="flex items-center justify-between">
              <h3 className="font-black text-xl tracking-tight">Current Billing</h3>
              <Wallet className="text-success" size={20} />
           </div>
           
           <div className="flex flex-col gap-6 items-center justify-center h-full text-center">
              <div className="p-6 rounded-full bg-success/10 mb-4 animate-pulse">
                <CreditCard size={48} className="text-success" />
              </div>
              <div>
                <p className="text-3xl font-black tracking-tighter">₹ 1,24,500</p>
                <p className="text-sm font-bold text-default-400 uppercase tracking-widest">Pending Collection</p>
              </div>
              <Button variant="primary" className="w-full font-black h-12 uppercase tracking-widest text-xs">
                View Reports
              </Button>
           </div>
        </Card>
      </div>
    </div>
  );
}
