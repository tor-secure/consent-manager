import Link from "next/link";
import { Suspense } from "react";

import { requireTenantWebsite } from "@/lib/tenant-website";
import { WebsiteDetailRelated } from "@/components/websites/website-detail-related";
import { WebsitePrivacyOverview } from "@/components/websites/website-privacy-overview";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right text-slate-800">{value}</dd>
    </div>
  );
}

function RelatedFallback() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading website activity">
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
      <Skeleton className="h-64 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

export default async function WebsiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const website = await requireTenantWebsite(id);

  const statusVariant: Record<string, "success" | "danger" | "neutral"> = {
    active: "success",
    inactive: "neutral",
    suspended: "danger",
  };

  return (
    <div className="page-wrap space-y-6 sm:space-y-8">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard/websites" className="transition hover:text-slate-900">
          Websites
        </Link>
        <span aria-hidden="true" className="text-slate-300">/</span>
        <span className="text-slate-900">{website.name}</span>
      </nav>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl stat-icon-blue">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"
              stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
            </svg>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                {website.name}
              </h1>
              <Badge variant={statusVariant[website.status] ?? "neutral"} size="sm" className="capitalize">
                {website.status}
              </Badge>
              {website.verified && (
                <Badge variant="success" size="sm">Verified</Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-500">{website.domain}</p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            href={`/dashboard/websites/${website.id}/enforcement`}
            className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Enforcement
          </Link>
          <Link
            href={`/dashboard/websites/${website.id}/regulations`}
            className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Regulations
          </Link>
          <Link
            href={`/dashboard/websites/${website.id}/settings`}
            className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Settings
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">Website details</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Configuration and identity information for this website.
            </p>
          </div>
          <div className="px-6">
            <dl className="divide-y divide-slate-100">
              <InfoRow label="Domain" value={
                <span className="font-mono text-xs text-slate-700">{website.domain}</span>
              } />
              <InfoRow label="Environment" value={
                <Badge variant="neutral" size="sm" className="capitalize">
                  {website.environment}
                </Badge>
              } />
              <InfoRow label="Default language" value={
                <Badge variant="neutral" size="sm">{website.defaultLanguage.toUpperCase()}</Badge>
              } />
              <InfoRow label="Default region" value={
                website.defaultRegion
                  ? <Badge variant="neutral" size="sm">{website.defaultRegion}</Badge>
                  : <span className="text-slate-400">—</span>
              } />
              <InfoRow label="Verification" value={
                website.verified
                  ? <Badge variant="success" size="sm">Verified</Badge>
                  : <Badge variant="neutral" size="sm">Not verified</Badge>
              } />
              <InfoRow label="Site key" value={
                <code className="rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">
                  {website.siteKey}
                </code>
              } />
              <InfoRow label="Added" value={
                <span className="text-slate-500">
                  {website.createdAt.toLocaleDateString("en-GB", {
                    day: "numeric", month: "short", year: "numeric",
                  })}
                </span>
              } />
            </dl>
          </div>
        </Card>

        <Card>
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">SDK Installation</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Embed the CMP banner on your website using the JavaScript SDK.
            </p>
          </div>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Site key
                </p>
                <code className="mt-0.5 block truncate font-mono text-sm text-slate-700">
                  {website.siteKey}
                </code>
              </div>
            </div>
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3">
              <p className="text-xs font-medium text-indigo-700">Quick install</p>
              <code className="mt-1 block text-xs text-indigo-600 leading-relaxed break-all">
                {`<script src="/api/sdk/script?siteKey=${website.siteKey}" async></script>`}
              </code>
            </div>
            <Link
              href={`/dashboard/websites/${website.id}/installation`}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
            >
              View installation guide
            </Link>
          </CardContent>
        </Card>
      </div>

      <Suspense fallback={<RelatedFallback />}>
        <WebsitePrivacyOverview websiteId={website.id} />
        <WebsiteDetailRelated websiteId={website.id} />
      </Suspense>

      <Card>
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">Integrations</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Connect third-party tools and tag managers.
          </p>
        </div>
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-sm font-medium text-slate-600">Manage integrations</p>
            <Link
              href="/dashboard/integrations"
              className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              View integrations →
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
