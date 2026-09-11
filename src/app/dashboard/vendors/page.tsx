import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { loadOrganizationVendorList } from "@/lib/processing/dashboard-queries";
import { VendorList, type VendorRow } from "@/components/vendors/vendor-list";
import { PageHeader, PageHeaderLink } from "@/components/ui/page-header";
import { StatusBanner } from "@/components/ui/status-banner";

function IconPlus() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M7.5 2v11M2 7.5h11" />
    </svg>
  );
}

export default async function VendorsPage() {
  const { orgId } = await auth();
  if (!orgId) return null;

  const [localOrg] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.clerkOrganizationId, orgId))
    .limit(1);
  if (!localOrg) return null;

  const { rows, schemaLimited } = await loadOrganizationVendorList(localOrg.id);
  const vendorList: VendorRow[] = rows;

  const total    = vendorList.length;
  const active   = vendorList.filter((v) => v.status === "active").length;
  const custom   = vendorList.filter((v) => v.source === "custom").length;
  const iab      = vendorList.filter((v) => v.source === "iab").length;
  const google   = vendorList.filter((v) => v.source === "google").length;

  return (
    <div className="page-wrap space-y-6 sm:space-y-8">

      <PageHeader
        title="Vendors"
        description="Third-party vendors and the purposes they serve in your organisation."
        action={
          <PageHeaderLink href="/dashboard/vendors/new">
            <IconPlus />
            Create vendor
          </PageHeaderLink>
        }
      />

      {schemaLimited && (
        <StatusBanner variant="warning">
          Vendor role and DPA columns are not in this database yet. The list still loads. Apply pending schema
          (npm run db:ensure-schema) before publishing policies that reference these vendors.
        </StatusBanner>
      )}

      {/* ── Summary pills ───────────────────────────────────────────────── */}
      {total > 0 && (
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Total",  value: total,  dot: "bg-[var(--muted-foreground)]"   },
            { label: "Active", value: active, dot: "bg-[var(--success)]" },
            ...(custom  > 0 ? [{ label: "Custom",  value: custom,  dot: "bg-[var(--muted-foreground)]"  }] : []),
            ...(iab     > 0 ? [{ label: "IAB",     value: iab,     dot: "bg-[var(--purple)]" }] : []),
            ...(google  > 0 ? [{ label: "Google",  value: google,  dot: "bg-[var(--info)]"    }] : []),
          ].map((s) => (
            <div key={s.label}
              className="flex items-center gap-2 rounded-2xl bg-[var(--card)] px-4 py-2 text-sm soft-shadow">
              <span className={`h-2 w-2 rounded-full ${s.dot}`} />
              <span className="font-semibold text-[var(--foreground)]">{s.value}</span>
              <span className="text-[var(--muted-foreground)]">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── List ────────────────────────────────────────────────────────── */}
      <VendorList vendors={vendorList} />
    </div>
  );
}
