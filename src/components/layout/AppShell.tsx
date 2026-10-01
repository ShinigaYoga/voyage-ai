import React from "react";
import { MobileBottomNav } from "./MobileBottomNav";
import { DesktopSidebar } from "./DesktopSidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-cream-100  font-body text-ink-900 ">
      <DesktopSidebar />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <main className="flex-1 w-full max-w-none mx-auto md:max-w-5xl md:px-8 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-8 relative overflow-x-hidden">
          {children}
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
