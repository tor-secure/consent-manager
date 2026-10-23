import { Suspense } from "react";
import Link from "next/link";
import { and, asc, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { parseAnalyticsPeriod } from "@/lib/analytics/consent-metrics";
import { parseDashboardFilters } from "@/lib/dashboard/home-filters";
import { PageHeader } from "@/components/ui/page-header";
import { DashboardFilters } from "@/components/dashboard/dashboard-controls";
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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    days?: string;
    from?: string;
    to?: string;
    websiteId?: string;
    countrySort?: string;
    websiteSort?: string;
    purposeSort?: string;
  }>;
}) {
  const params = await searchParams;
  const { organization } = await requireDashboardContext();
  const filters = parseDashboardFilters(params);
  const period = parseAnalyticsPeriod(filters);
  const sites = await db
    .select({ id: websites.id, name: websites.name, domain: websites.domain })
    .from(websites)
    .where(and(eq(websites.organizationId, organization.id), isNull(websites.deletedAt)))
    .orderBy(asc(websites.name));

  return (
    <div className="page-wrap space-y-5">
      <PageHeader
        title="Dashboard"
        description={`Overview for ${organization.name}. ${period.label}.`}
        action={
          <Link href="/dashboard/analytics" className="btn btn-outline">
            View analytics
          </Link>
        }
      />

      <Suspense fallback={null}>
        <DashboardFilters websites={sites} />
      </Suspense>

      <Suspense fallback={<HomeStatsSkeleton />}>
        <HomeStatsSection filters={filters} />
      </Suspense>

      <Suspense fallback={<HomeChartsSkeleton />}>
        <HomeLiveAndChartsSection
          filters={filters}
          countrySort={params.countrySort}
          websiteSort={params.websiteSort}
          purposeSort={params.purposeSort}
        />
      </Suspense>

      <Suspense fallback={<HomeRecentSkeleton />}>
        <HomeRecentSection filters={filters} />
      </Suspense>
    </div>
  );
}
