"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, AlertTriangle, Settings, Bell, UserCheck, CalendarDays, Wallet } from "lucide-react";
import { Button } from "@heroui/react";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Residents", href: "/dashboard/residents", icon: Users },
  { name: "Complaints", href: "/dashboard/complaints", icon: AlertTriangle },
  { name: "Notices", href: "/dashboard/notices", icon: Bell },
  { name: "Visitors", href: "/dashboard/visitors", icon: UserCheck },
  { name: "Events", href: "/dashboard/events", icon: CalendarDays },
  { name: "Billing", href: "/dashboard/billing", icon: Wallet },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="h-screen w-64 border-r border-default-200 bg-background flex flex-col hidden md:flex sticky top-0">
      <div className="h-16 flex items-center px-6 border-b border-default-200">
        <span className="text-xl font-bold">Dwellioo</span>
      </div>
      <nav className="flex-1 px-4 py-6 flex flex-col gap-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className="w-full">
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className="justify-start gap-3 w-full"
              >
                <item.icon size={20} />
                {item.name}
              </Button>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
