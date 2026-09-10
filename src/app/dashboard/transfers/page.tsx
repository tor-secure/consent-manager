import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { loadTransfersPage } from "@/lib/processing/dashboard-queries";
import { ProcessingActivityForm, TransferForm } from "@/components/vendors/processing-forms";

export default async function TransfersPage() {
  const { orgId } = await auth();
  if (!orgId) return null;
  const [localOrg] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.clerkOrganizationId, orgId))
    .limit(1);
  if (!localOrg) return null;

  const { transferRows, activityRows, orgVendors, orgWebsites, orgPurposes, schemaLimited } =
    await loadTransfersPage(localOrg.id);

  return (
    <div className="page-wrap space-y-6">
      <div>
        <h1 className="page-title">Transfers and processing</h1>
        <p className="page-description">
          Record processing activities and cross-border transfers. Publication uses this inventory; published policy snapshots stay frozen after go-live.
        </p>
      </div>
      {schemaLimited && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Transfer and processing tables are not in this database yet. Apply pending schema
          (npm run db:ensure-schema) before recording transfers.
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 card-shadow">
        <h2 className="text-base font-semibold text-slate-900">Transfer records</h2>
        {transferRows.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No transfers recorded yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="py-2">Vendor</th>
                  <th className="py-2">Route</th>
                  <th className="py-2">Mechanism</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transferRows.map((row) => (
                  <tr key={row.id}>
                    <td className="py-2">
                      <Link className="text-indigo-600 hover:underline" href={`/dashboard/vendors/${row.vendorId}`}>Open vendor</Link>
                    </td>
                    <td className="py-2">{row.sourceCountry ?? "?"} → {row.destinationCountry || row.destinationRegion || "?"}</td>
                    <td className="py-2">{row.mechanism}</td>
                    <td className="py-2">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <TransferForm vendors={orgVendors} websites={orgWebsites} />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 card-shadow">
        <h2 className="text-base font-semibold text-slate-900">Processing activities</h2>
        {activityRows.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No processing activities recorded yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {activityRows.map((row) => (
              <li key={row.id} className="rounded-xl bg-slate-50 px-3 py-2">
                <Link className="text-indigo-600 hover:underline" href={`/dashboard/vendors/${row.vendorId}`}>Vendor</Link>
                {" · "}{row.processingRole} · {(row.dataCategories ?? []).join(", ") || "no categories"} · {row.status}
              </li>
            ))}
          </ul>
        )}
      </section>

      <ProcessingActivityForm vendors={orgVendors} websites={orgWebsites} purposes={orgPurposes} />
    </div>
  );
}
