"use client";

import { AppToaster } from "@/components/feedback/app-toaster";

export function DashboardProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AppToaster />
    </>
  );
}
