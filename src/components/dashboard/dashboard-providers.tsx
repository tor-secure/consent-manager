"use client";

import { useAuth, useOrganizationList } from "@clerk/nextjs";
import { useEffect } from "react";

import { AppToaster } from "@/components/feedback/app-toaster";

function EnsureActiveOrganization() {
  const { orgId } = useAuth();
  const { isLoaded, setActive, userMemberships } = useOrganizationList({
    userMemberships: { infinite: true },
  });

  useEffect(() => {
    if (!isLoaded || orgId || !setActive) return;
    const firstOrg = userMemberships.data?.[0]?.organization;
    if (!firstOrg) return;
    void setActive({ organization: firstOrg.id });
  }, [isLoaded, orgId, setActive, userMemberships.data]);

  return null;
}

export function DashboardProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      <EnsureActiveOrganization />
      {children}
      <AppToaster />
    </>
  );
}
