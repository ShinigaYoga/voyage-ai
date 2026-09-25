import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ToastProvider } from "@/lib/hooks/useToast";
import { ErrorBoundary } from "@/components/layout/ErrorBoundary";
import { ThemeProvider } from "@/lib/hooks/useTheme";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ErrorBoundary>
          <AppShell>{children}</AppShell>
        </ErrorBoundary>
      </ToastProvider>
    </ThemeProvider>
  );
}
