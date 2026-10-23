import Link from "next/link";
import { WorkspaceTabs } from "@/components/ui/workspace-tabs";
import { WorkflowDisclosure } from "@/components/ui/workflow-disclosure";

import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { loadTransfersPage } from "@/lib/processing/dashboard-queries";
import { ProcessingActivityForm, TransferForm } from "@/components/vendors/processing-forms";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBanner } from "@/components/ui/status-banner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export default async function TransfersPage() {
  const { organization: localOrg } = await requireDashboardContext();

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

      <WorkspaceTabs label="Transfer workspace" tabs={[
{ title: "Transfers", content: <><Card>
        <CardHeader>
          <CardTitle>Transfer records</CardTitle>
        </CardHeader>
        <CardContent>
        {transferRows.length === 0 ? (
          <EmptyState
            title="No transfers recorded yet"
            description="Add a vendor, then record a cross-border transfer before you publish."
            actionLabel="Open vendors"
            actionHref="/dashboard/vendors"
          />
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
      </Card><WorkflowDisclosure title="Record a transfer" description="Link a vendor, destination, and transfer mechanism."><TransferForm vendors={orgVendors} websites={orgWebsites} /></WorkflowDisclosure></> },
{ title: "Processing activities", content: <><Card>
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
      </Card><WorkflowDisclosure title="Add processing activity" description="Document a vendor's role, purposes, and data categories."><ProcessingActivityForm vendors={orgVendors} websites={orgWebsites} purposes={orgPurposes} /></WorkflowDisclosure></> },
]} />
    </div>
  );
}
