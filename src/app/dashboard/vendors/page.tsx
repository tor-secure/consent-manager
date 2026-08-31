import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { vendors } from "@/db/schema/vendors";
import { VendorList, type VendorRow } from "@/components/vendors/vendor-list";

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

  const rows = await db
    .select({
      id: vendors.id,
      key: vendors.key,
      name: vendors.name,
      domain: vendors.domain,
      country: vendors.country,
      status: vendors.status,
      source: vendors.source,
      createdAt: vendors.createdAt,
    })
    .from(vendors)
    .where(eq(vendors.organizationId, localOrg.id))
    .orderBy(vendors.name);

  const vendorList: VendorRow[] = rows;

  const total    = vendorList.length;
  const active   = vendorList.filter((v) => v.status === "active").length;
  const custom   = vendorList.filter((v) => v.source === "custom").length;
  const iab      = vendorList.filter((v) => v.source === "iab").length;
  const google   = vendorList.filter((v) => v.source === "google").length;

  return (
    <div className="page-wrap space-y-6 sm:space-y-8">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Vendors</h1>
          <p className="mt-1 text-sm text-slate-500">
            Third-party vendors and the purposes they serve in your organisation.
          </p>
        </div>
        <Link
          href="/dashboard/vendors/new"
          className="btn btn-primary"
        >
          <IconPlus />
          Create vendor
        </Link>
      </div>

      {/* ── Summary pills ───────────────────────────────────────────────── */}
      {total > 0 && (
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Total",  value: total,  dot: "bg-slate-400"   },
            { label: "Active", value: active, dot: "bg-emerald-500" },
            ...(custom  > 0 ? [{ label: "Custom",  value: custom,  dot: "bg-slate-400"  }] : []),
            ...(iab     > 0 ? [{ label: "IAB",     value: iab,     dot: "bg-violet-500" }] : []),
            ...(google  > 0 ? [{ label: "Google",  value: google,  dot: "bg-sky-500"    }] : []),
          ].map((s) => (
            <div key={s.label}
              className="flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm soft-shadow">
              <span className={`h-2 w-2 rounded-full ${s.dot}`} />
              <span className="font-semibold text-slate-800">{s.value}</span>
              <span className="text-slate-500">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── List ────────────────────────────────────────────────────────── */}
      <VendorList vendors={vendorList} />
    </div>
  );
}
