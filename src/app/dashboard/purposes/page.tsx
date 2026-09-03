import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { purposes } from "@/db/schema/purposes";
import { PurposeList, type PurposeRow } from "@/components/purposes/purpose-list";

function IconPlus() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M7.5 2v11M2 7.5h11" />
    </svg>
  );
}

export default async function PurposesPage() {
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
      id: purposes.id,
      key: purposes.key,
      name: purposes.name,
      description: purposes.description,
      isRequired: purposes.isRequired,
      status: purposes.status,
      createdAt: purposes.createdAt,
    })
    .from(purposes)
    .where(eq(purposes.organizationId, localOrg.id))
    .orderBy(purposes.name);

  const purposeList: PurposeRow[] = rows;

  const total    = purposeList.length;
  const active   = purposeList.filter((p) => p.status === "active").length;
  const required = purposeList.filter((p) => p.isRequired).length;

  return (
    <div className="page-wrap space-y-6 sm:space-y-8">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="page-title">Purposes</h1>
          <p className="page-description">
            Consent purposes shared across all policies in your organisation.
          </p>
        </div>
        <Link
          href="/dashboard/purposes/new"
          className="btn btn-primary"
        >
          <IconPlus />
          Create purpose
        </Link>
      </div>

      {/* ── Summary pills ───────────────────────────────────────────────── */}
      {total > 0 && (
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Total",    value: total,    dot: "bg-slate-400"   },
            { label: "Active",   value: active,   dot: "bg-emerald-500" },
            { label: "Required", value: required, dot: "bg-indigo-500"  },
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
      <PurposeList purposes={purposeList} />
    </div>
  );
}
