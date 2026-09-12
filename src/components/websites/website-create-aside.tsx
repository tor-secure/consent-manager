"use client";

import { HoverGlassCard } from "@/components/ui/hover-glass-card";

export function WebsiteCreateAside() {
  return (
    <div className="space-y-5">
      <HoverGlassCard className="min-h-[254px] w-full flex-col gap-3 p-6 text-center">
        <p className="text-base font-bold">What happens next</p>
        <p className="text-sm font-medium leading-relaxed text-[var(--foreground)]">
          After you save, you get a site key. Attach a policy, publish a version, then paste the snippet on your pages.
        </p>
      </HoverGlassCard>
      <HoverGlassCard className="min-h-[254px] w-full flex-col gap-4 p-6 text-center">
        <p className="text-base font-bold">Before you add a site</p>
        <ul className="space-y-3 text-sm font-medium leading-relaxed text-[var(--foreground)]">
          <li>Use the apex or subdomain only. The https:// prefix is shown on the field and is not stored.</li>
          <li>Region and language can be changed later in website settings.</li>
          <li>Visitors see the banner after a policy is published and the SDK is installed.</li>
        </ul>
      </HoverGlassCard>
    </div>
  );
}
