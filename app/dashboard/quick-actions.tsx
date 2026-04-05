"use client";

import { Button } from "@heroui/react";
import { UserPlus, BellPlus, CreditCard, CalendarPlus, ArrowRight } from "lucide-react";
import { useNotificationModal } from "@/components/providers/notification-provider";
import { motion } from "framer-motion";

export function DashboardQuickActions() {
  const { showNotification } = useNotificationModal();

  const handleAction = (title: string) => {
    showNotification({
      title: `${title}`,
      message: `The ${title} interface is being optimized for the next deployment phase. Check back shortly for the full Property Management suite.`,
      type: "info",
      primaryActionLabel: "Got it",
      onPrimaryAction: () => {}
    });
  };

  const actions = [
    { label: "New Resident", icon: UserPlus, color: "text-primary", bg: "bg-primary/20", border: "border-primary/30" },
    { label: "Post Notice", icon: BellPlus, color: "text-accent", bg: "bg-accent/20", border: "border-accent/30" },
    { label: "Record Payment", icon: CreditCard, color: "text-success", bg: "bg-success/20", border: "border-success/30" },
    { label: "Create Event", icon: CalendarPlus, color: "text-secondary", bg: "bg-secondary/20", border: "border-secondary/30" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {actions.map((action, index) => (
        <motion.div
           key={action.label}
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: index * 0.1 }}
        >
          <Button 
            className={`w-full p-6 h-auto flex flex-col items-center justify-center gap-4 cursor-pointer bg-background/50 hover:bg-default-50 backdrop-blur-xl transition-all border ${action.border} shadow-lg rounded-[2rem] group relative overflow-hidden`}
            onPress={() => handleAction(action.label)}
            variant="ghost"
          >
            <div className={`p-4 rounded-2xl ${action.bg} group-hover:scale-110 transition-transform duration-300 relative z-10`}>
              <action.icon className={`w-6 h-6 ${action.color}`} />
            </div>
            <div className="flex flex-col items-center gap-1 relative z-10">
              <span className="text-xs font-black uppercase tracking-widest text-default-400 group-hover:text-foreground transition-colors">{action.label}</span>
              <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </div>
            
            {/* Animated Background Pulse */}
            <div className={`absolute inset-0 ${action.bg} opacity-0 group-hover:opacity-5 transition-opacity blur-2xl`} />
          </Button>
        </motion.div>
      ))}
    </div>
  );
}
