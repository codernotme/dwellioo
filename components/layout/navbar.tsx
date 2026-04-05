"use client";

import { User, Bell, Menu } from "lucide-react";
import { Button } from "@heroui/react";

export function Navbar() {
  return (
    <header className="h-16 border-b border-default-200 bg-background/80 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" isIconOnly className="md:hidden border-none text-foreground border-transparent">
          <Menu size={20} />
        </Button>
        <h2 className="text-lg font-semibold md:hidden">Dwellioo</h2>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" isIconOnly className="border-none text-foreground border-transparent">
          <Bell size={20} />
        </Button>
        <div className="flex items-center gap-3 border-l border-default-200 pl-4">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-medium">Property Manager</span>
            <span className="text-xs text-default-500">Sunshine Apartments</span>
          </div>
          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold shadow-sm">
            PM
          </div>
        </div>
      </div>
    </header>
  );
}
