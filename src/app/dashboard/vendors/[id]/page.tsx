import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { loadVendorEditorPage } from "@/lib/processing/dashboard-queries";
import { VendorEditor } from "@/components/vendors/vendor-editor";
import { ProcessingActivityForm, TransferForm } from "@/components/vendors/processing-forms";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBanner } from "@/components/ui/status-banner";

export default async function VendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { orgId } = await auth();
  if (!orgId) return null;
  const [localOrg] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.clerkOrganizationId, orgId))
    .limit(1);
  if (!localOrg) return null;

  const loaded = await loadVendorEditorPage(localOrg.id, id);
  if (!loaded) notFound();
  const {
    vendor,
    schemaLimited,
    purposeLinks,
    activities,
    transfers,
    relationships,
    trackerRows,
    orgVendors,
    orgWebsites,
    orgPurposes,
    activityLogs,
  } = loaded;

  return (
    <div className="page-wrap space-y-6">
      <nav className="text-sm text-[var(--muted-foreground)]">
        <Link href="/dashboard/vendors" className="hover:text-[var(--foreground)]">Vendors</Link>
        <span> / {vendor.name}</span>
      </nav>
      <PageHeader
        title={vendor.name}
        description="Role, DPA, processing, and transfer inventory. Changing these fields after a policy is published does not rewrite that policy's frozen snapshot or historical consent evidence."
      />
      {schemaLimited && (
        <StatusBanner variant="warning">
          Some vendor inventory columns are missing from this database. You can still open the vendor.
          Apply pending schema before saving role, DPA, or California fields.
        </StatusBanner>
      )}
      <VendorEditor vendor={vendor} />

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 card-shadow">
        <h2 className="text-base font-semibold text-[var(--foreground)]">Linked purposes</h2>
        {purposeLinks.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">No purposes linked yet.</p>
        ) : (
          <ul className="mt-3 space-y-1 text-sm">
            {purposeLinks.map((row) => (
              <li key={row.purposeKey}>{row.purposeName} <span className="text-[var(--muted-foreground)]">({row.purposeKey}{row.processingRole ? ` · ${row.processingRole}` : ""})</span></li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 card-shadow">
        <h2 className="text-base font-semibold text-[var(--foreground)]">Processing activities</h2>
        {activities.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">No processing activities recorded.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {activities.map((row) => (
              <li key={row.id} className="rounded-xl bg-[var(--muted)] px-3 py-2">
                {row.processingRole} · {(row.dataCategories ?? []).join(", ") || "no categories"} · {row.status}
                {row.transferRequired ? " · transfer required" : ""}
              </li>
            ))}
          </ul>
        )}
      </section>

      <ProcessingActivityForm
        vendors={orgVendors}
        websites={orgWebsites}
        purposes={orgPurposes}
      />

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 card-shadow">
        <h2 className="text-base font-semibold text-[var(--foreground)]">Transfers</h2>
        {transfers.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">No transfer records.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {transfers.map((row) => (
              <li key={row.id} className="rounded-xl bg-[var(--muted)] px-3 py-2">
                {row.sourceCountry ?? "?"} → {row.destinationCountry || row.destinationRegion || "?"} · {row.mechanism} · {row.status}
              </li>
            ))}
          </ul>
        )}
      </section>

      <TransferForm vendors={orgVendors} websites={orgWebsites} />

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 card-shadow">
        <h2 className="text-base font-semibold text-[var(--foreground)]">Processor relationships</h2>
        {relationships.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">No processor/subprocessor links.</p>
        ) : (
          <ul className="mt-3 space-y-1 text-sm">
            {relationships.map((row) => (
              <li key={row.id}>{row.relationshipType} → {row.childVendorId} · {row.status}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 card-shadow">
        <h2 className="text-base font-semibold text-[var(--foreground)]">Mapped trackers</h2>
        {trackerRows.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">No trackers mapped to this vendor.</p>
        ) : (
          <ul className="mt-3 space-y-1 text-sm">
            {trackerRows.map((row) => (
              <li key={row.id}>{row.name} · {row.status}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 card-shadow">
        <h2 className="text-base font-semibold text-[var(--foreground)]">Audit</h2>
        {activityLogs.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">No vendor audit events yet.</p>
        ) : (
          <ol className="mt-3 space-y-2">
            {activityLogs.map((row) => (
              <li key={row.id} className="border-l-2 border-[var(--border)] pl-3">
                <p className="text-xs font-medium text-[var(--foreground)]">{row.action.replaceAll("_", " ")}</p>
                {row.description && <p className="text-sm text-[var(--muted-foreground)]">{row.description}</p>}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
