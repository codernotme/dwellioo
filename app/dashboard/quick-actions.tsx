"use client";

import { Button } from "@heroui/react";
import { Plus, UserPlus, BellPlus, CreditCard, CalendarPlus } from "lucide-react";
import { useNotificationModal } from "@/components/providers/notification-provider";

export function DashboardQuickActions() {
  const { showNotification } = useNotificationModal();

  const handleAction = (title: string) => {
    showNotification({
      title: `Action: ${title}`,
      message: `You clicked on "${title}". This feature is being finalized and will be fully operational in the next release.`,
      type: "info"
    });
  };

  const actions = [
    { label: "New Resident", icon: UserPlus, color: "text-primary", bg: "bg-primary/10" },
    { label: "Post Notice", icon: BellPlus, color: "text-accent", bg: "bg-accent/10" },
    { label: "Record Payment", icon: CreditCard, color: "text-success", bg: "bg-success/10" },
    { label: "Create Event", icon: CalendarPlus, color: "text-secondary", bg: "bg-secondary/10" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {actions.map((action) => (
        <Button 
          key={action.label} 
          className="p-4 h-auto flex flex-col items-center justify-center gap-3 cursor-pointer bg-background hover:bg-default-50 transition-colors border border-default-200 shadow-sm rounded-xl min-w-0"
          onPress={() => handleAction(action.label)}
          variant="ghost"
        >
          <div className={`p-3 rounded-full ${action.bg}`}>
            <action.icon className={`w-5 h-5 ${action.color}`} />
          </div>
          <span className="text-xs font-bold uppercase tracking-tight text-foreground">{action.label}</span>
        </Button>
      ))}
    </div>
  );
}
