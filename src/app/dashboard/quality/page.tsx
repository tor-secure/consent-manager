import Link from "next/link";
import { and, eq, isNull } from "drizzle-orm";

import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { computeWebsiteQualityScore } from "@/lib/monitoring/privacy-intelligence";
import { qualityCategoryLabel } from "@/lib/monitoring/consent-quality";

function categoryVariant(category: string): "success" | "primary" | "warning" | "danger" {
  if (category === "excellent") return "success";
  if (category === "good") return "primary";
  if (category === "needs_attention") return "warning";
  return "danger";
}

export default async function ConsentQualityPage() {
  const context = await requireDashboardContext();
  const organizationId = context.organization.id;

  const orgWebsites = await db
    .select({ id: websites.id })
    .from(websites)
    .where(and(eq(websites.organizationId, organizationId), isNull(websites.deletedAt)))
    .orderBy(websites.name);

  const scores = (
    await Promise.all(orgWebsites.map((site) => computeWebsiteQualityScore(site.id)))
  ).filter((row): row is NonNullable<typeof row> => Boolean(row));

  return (
    <div className="page-wrap space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Discovery & Monitoring"
        title="Consent quality"
        description="Operational product score from CMP configuration, scan inventory, and open findings. It is not a legal compliance percentage."
      />

      {scores.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-sm text-[var(--muted-foreground)]">
            No websites in this organization yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {scores.map((row) => (
            <Card key={row.websiteId}>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/dashboard/websites/${row.websiteId}`}
                      className="text-base font-semibold text-[var(--primary)] hover:underline"
                    >
                      {row.websiteName}
                    </Link>
                    <p className="text-sm text-[var(--muted-foreground)]">{row.websiteDomain}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-semibold">{row.score.overall}<span className="text-base font-normal text-[var(--muted-foreground)]">/100</span></p>
                    <Badge variant={categoryVariant(row.score.category)} className="mt-1">
                      {qualityCategoryLabel(row.score.category)}
                    </Badge>
                  </div>
                </div>
                <dl className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {row.score.dimensions.map((dimension) => (
                    <div key={dimension.key} className="rounded-xl bg-[var(--muted)] px-3 py-2">
                      <dt className="text-xs text-[var(--muted-foreground)]">{dimension.label}</dt>
                      <dd className="text-sm font-medium">
                        {dimension.score} <span className="text-[var(--muted-foreground)]">(weight {dimension.weight})</span>
                      </dd>
                    </div>
                  ))}
                </dl>
                {row.score.lostPoints.length > 0 ? (
                  <div className="mt-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                      Why points were lost
                    </p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--foreground)]">
                      {row.score.lostPoints.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-[var(--muted-foreground)]">No deductions on the current signals.</p>
                )}
                <p className="mt-4 text-xs text-[var(--muted-foreground)]">{row.score.disclaimer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
