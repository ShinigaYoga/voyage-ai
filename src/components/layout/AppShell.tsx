import React from "react";
import { MobileBottomNav } from "./MobileBottomNav";
import { DesktopSidebar } from "./DesktopSidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream-100 dark:bg-[#141412] font-body text-ink-900 dark:text-[#F5F5F3]">
      <DesktopSidebar />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <main className="flex-1 w-full max-w-md mx-auto md:max-w-5xl md:px-8 pb-24 md:pb-8 relative">
          {children}
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
