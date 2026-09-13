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
        title="Dashboard"
        description={`Overview for ${organization.name}. Last 30 days.`}
        action={
          <Link
            href="/dashboard/analytics"
            className="text-sm font-medium text-[var(--primary)] hover:underline"
          >
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
