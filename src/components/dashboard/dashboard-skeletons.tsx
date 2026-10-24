import { PageLoader } from "@/components/ui/page-loader";
import { Skeleton } from "@/components/ui/skeleton";

export function HomeStatsSkeleton() {
  return (
    <Skeleton className="h-24 rounded-2xl" aria-busy="true" aria-label="Loading stats" />
  );
}

export function HomeChartsSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading charts">
      <Skeleton className="h-16 rounded-2xl" />
      <div className="grid gap-4 lg:grid-cols-12">
        <Skeleton className="h-80 rounded-2xl lg:col-span-8" />
        <Skeleton className="h-80 rounded-2xl lg:col-span-4" />
      </div>
      <div className="grid gap-4 lg:grid-cols-12">
        <Skeleton className="h-72 rounded-2xl lg:col-span-7" />
        <div className="grid gap-4 lg:col-span-5">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export function HomeRecentSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading recent activity">
      <div className="grid gap-5 lg:grid-cols-12">
        <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6 lg:col-span-8">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-14 rounded-2xl" />
          <Skeleton className="h-14 rounded-2xl" />
          <Skeleton className="h-14 rounded-2xl" />
          <Skeleton className="h-14 rounded-2xl" />
        </div>
        <Skeleton className="h-80 rounded-2xl lg:col-span-4" />
      </div>
    </div>
  );
}

export function DashboardPageSkeleton() {
  return <PageLoader label="Loading page" />;
}

export function ConsentPageSkeleton() {
  return (
    <div className="page-wrap space-y-6" aria-busy="true" aria-label="Loading consent records">
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-64" />
      </div>
      <Skeleton className="h-[32rem] rounded-2xl" />
    </div>
  );
}

export function AnalyticsPageSkeleton() {
  return <PageLoader label="Loading analytics" />;
}

export function AnalyticsOverviewSkeleton() {
  return (
    <div className="space-y-10" aria-busy="true" aria-label="Loading overview">
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );
}

export function AnalyticsBreakdownSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading breakdowns">
      <Skeleton className="h-56 rounded-2xl" />
      <Skeleton className="h-56 rounded-2xl" />
      <Skeleton className="h-56 rounded-2xl" />
    </div>
  );
}

export function WebsiteDetailSkeleton() {
  return <PageLoader label="Loading website" />;
}
