import Link from "next/link";

import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import { requireTenantWebsite } from "@/lib/tenant-website";
import { childProtectionActive, childProtectionIsComplete, parseChildProtectionConfig } from "@/lib/children/config";
import { ChildProtectionForm } from "@/components/websites/child-protection-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard/websites" className="transition hover:text-slate-900">Websites</Link>
        <span className="text-slate-300" aria-hidden="true">/</span>
        <Link href={`/dashboard/websites/${website.id}`} className="transition hover:text-slate-900">{website.name}</Link>
        <span className="text-slate-300" aria-hidden="true">/</span>
        <span className="text-slate-900">Child protection</span>
      </nav>

      <div>
        <h1 className="page-title">Children, age & guardian controls</h1>
        <p className="page-description">
          Server-authoritative enforcement for this website. Unknown age is not treated as adult.
          This is a technical control system, not a legal certification.
        </p>
      </div>

      <Card>
        <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Child-directed</p>
            <p className="mt-1 text-sm font-medium text-slate-900">{childProtection.childDirected ? "Yes" : "No"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Age assurance</p>
            <p className="mt-1 text-sm font-medium text-slate-900">{childProtection.ageAssuranceRequired ? "Required" : "Off"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Threshold</p>
            <p className="mt-1 text-sm font-medium text-slate-900">{childProtection.minimumAge ?? "Not set"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Guardian workflow</p>
            <p className="mt-1 text-sm font-medium text-slate-900">{childProtection.guardianConsentRequired ? "Required" : "Off"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Enforcement</p>
            <Badge variant={active ? "warning" : "neutral"} size="sm">{active ? "Fail-closed for restricted purposes" : "Inactive"}</Badge>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Publication impact</p>
            <Badge variant={complete ? "success" : active ? "danger" : "neutral"} size="sm">
              {complete ? "Configuration complete" : active ? "Publish blocked until complete" : "No child-protection gate"}
            </Badge>
          </div>
        </div>
        <div className="border-t border-slate-100 px-6 py-4 text-sm text-slate-600">
          Restricted purposes: {childProtection.restrictedPurposeKeys.join(", ") || "none"}.
          Self-declaration is never labeled verified. Email tokens prove contact, not legal authority.
        </div>
      </Card>

      <ChildProtectionForm websiteId={website.id} initial={childProtection} />
    </div>
  );
}
