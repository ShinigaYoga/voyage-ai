import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ToastProvider } from "@/lib/hooks/useToast";
import { ErrorBoundary } from "@/components/layout/ErrorBoundary";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ErrorBoundary>
        <AppShell>{children}</AppShell>
      </ErrorBoundary>
    </ToastProvider>
  );
}
