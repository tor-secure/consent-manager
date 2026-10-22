import { Suspense } from "react";
import Link from "next/link";

import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { PageHeader } from "@/components/ui/page-header";
import {
  HomeLiveAndChartsSection,
  HomeRecentSection,
  HomeStatsSection,
} from "@/components/dashboard/home-sections";
import {
  HomeChartsSkeleton,
  HomeRecentSkeleton,
  HomeStatsSkeleton,
} from "@/components/dashboard/dashboard-skeletons";

export default async function DashboardPage() {
  const { organization } = await requireDashboardContext();

  return (
    <div className="page-wrap space-y-6 sm:space-y-8">
      <PageHeader
        title={
          <span className="inline-flex flex-wrap items-center gap-3">
            Dashboard
            <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-xs font-semibold leading-none tracking-normal text-[var(--muted-foreground)]">
              Last 30 days
            </span>
          </span>
        }
        description={`Overview for ${organization.name}.`}
        action={
          <Link href="/dashboard/analytics" className="btn btn-outline">
            View analytics
          </Link>
        }
      />

      <Suspense fallback={<HomeStatsSkeleton />}>
        <HomeStatsSection />
      </Suspense>

      <Suspense fallback={<HomeChartsSkeleton />}>
        <HomeLiveAndChartsSection />
      </Suspense>

      <Suspense fallback={<HomeRecentSkeleton />}>
        <HomeRecentSection />
      </Suspense>
    </div>
  );
}
