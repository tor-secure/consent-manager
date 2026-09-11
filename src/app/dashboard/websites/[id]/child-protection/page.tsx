import Link from "next/link";

import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import { requireTenantWebsite } from "@/lib/tenant-website";
import { childProtectionActive, childProtectionIsComplete, parseChildProtectionConfig } from "@/lib/children/config";
import { ChildProtectionForm } from "@/components/websites/child-protection-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { eq } from "drizzle-orm";

export default async function WebsiteChildProtectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const website = await requireTenantWebsite(id);
  let raw: unknown = {};
  try {
    const [row] = await db
      .select({ childProtection: websites.childProtection })
      .from(websites)
      .where(eq(websites.id, website.id))
      .limit(1);
    raw = row?.childProtection ?? {};
  } catch {
    raw = {};
  }
  const childProtection = parseChildProtectionConfig(raw);
  const active = childProtectionActive(childProtection) || childProtection.ageAssuranceRequired;
  const complete = childProtectionIsComplete(childProtection);

  return (
    <div className="page-wrap space-y-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
        <Link href="/dashboard/websites" className="transition hover:text-[var(--foreground)]">Websites</Link>
        <span className="text-[var(--border)]" aria-hidden="true">/</span>
        <Link href={`/dashboard/websites/${website.id}`} className="transition hover:text-[var(--foreground)]">{website.name}</Link>
        <span className="text-[var(--border)]" aria-hidden="true">/</span>
        <span className="text-[var(--foreground)]">Child protection</span>
      </nav>

      <PageHeader
        title="Children, age & guardian controls"
        description="Server-authoritative enforcement for this website. Unknown age is not treated as adult. This is a technical control system, not a legal certification."
      />

      <Card>
        <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Child-directed</p>
            <p className="mt-1 text-sm font-medium text-[var(--foreground)]">{childProtection.childDirected ? "Yes" : "No"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Age assurance</p>
            <p className="mt-1 text-sm font-medium text-[var(--foreground)]">{childProtection.ageAssuranceRequired ? "Required" : "Off"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Threshold</p>
            <p className="mt-1 text-sm font-medium text-[var(--foreground)]">{childProtection.minimumAge ?? "Not set"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Guardian workflow</p>
            <p className="mt-1 text-sm font-medium text-[var(--foreground)]">{childProtection.guardianConsentRequired ? "Required" : "Off"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Enforcement</p>
            <Badge variant={active ? "warning" : "neutral"} size="sm">{active ? "Fail-closed for restricted purposes" : "Inactive"}</Badge>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Publication impact</p>
            <Badge variant={complete ? "success" : active ? "danger" : "neutral"} size="sm">
              {complete ? "Configuration complete" : active ? "Publish blocked until complete" : "No child-protection gate"}
            </Badge>
          </div>
        </div>
        <div className="border-t border-[var(--border)] px-6 py-4 text-sm text-[var(--muted-foreground)]">
          Restricted purposes: {childProtection.restrictedPurposeKeys.join(", ") || "none"}.
          Self-declaration is never labeled verified. Email tokens prove contact, not legal authority.
        </div>
      </Card>

      <ChildProtectionForm websiteId={website.id} initial={childProtection} />
    </div>
  );
}
