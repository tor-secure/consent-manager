import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { loadTransfersPage } from "@/lib/processing/dashboard-queries";
import { ProcessingActivityForm, TransferForm } from "@/components/vendors/processing-forms";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBanner } from "@/components/ui/status-banner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
      <PageHeader
        title="Transfers and processing"
        description="Record processing activities and cross-border transfers. Publication uses this inventory; published policy snapshots stay frozen after go-live."
      />
      {schemaLimited && (
        <StatusBanner variant="warning">
          Transfer and processing tables are not in this database yet. Apply pending schema
          (npm run db:ensure-schema) before recording transfers.
        </StatusBanner>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Transfer records</CardTitle>
        </CardHeader>
        <CardContent>
        {transferRows.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">No transfers recorded yet.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table min-w-full">
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Route</th>
                  <th>Mechanism</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {transferRows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link className="text-[var(--primary)] hover:underline" href={`/dashboard/vendors/${row.vendorId}`}>Open vendor</Link>
                    </td>
                    <td>{row.sourceCountry ?? "?"} → {row.destinationCountry || row.destinationRegion || "?"}</td>
                    <td>{row.mechanism}</td>
                    <td>{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </CardContent>
      </Card>

      <TransferForm vendors={orgVendors} websites={orgWebsites} />

      <Card>
        <CardHeader>
          <CardTitle>Processing activities</CardTitle>
        </CardHeader>
        <CardContent>
        {activityRows.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">No processing activities recorded yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {activityRows.map((row) => (
              <li key={row.id} className="rounded-xl bg-[var(--muted)] px-3 py-2">
                <Link className="text-[var(--primary)] hover:underline" href={`/dashboard/vendors/${row.vendorId}`}>Vendor</Link>
                {" · "}{row.processingRole} · {(row.dataCategories ?? []).join(", ") || "no categories"} · {row.status}
              </li>
            ))}
          </ul>
        )}
        </CardContent>
      </Card>

      <ProcessingActivityForm vendors={orgVendors} websites={orgWebsites} purposes={orgPurposes} />
    </div>
  );
}
