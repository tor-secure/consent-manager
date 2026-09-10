import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { vendors } from "@/db/schema/vendors";
import { vendorPurposes } from "@/db/schema/vendor-purposes";
import { purposes } from "@/db/schema/purposes";
import { trackers } from "@/db/schema/trackers";
import { websites } from "@/db/schema/websites";
import {
  crossBorderTransfers,
  processingActivities,
  vendorRelationships,
} from "@/db/schema/processing-inventory";
import { auditLogs } from "@/db/schema/audit-logs";
import { VendorEditor } from "@/components/vendors/vendor-editor";
import { ProcessingActivityForm, TransferForm } from "@/components/vendors/processing-forms";

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

  const [vendor] = await db
    .select()
    .from(vendors)
    .where(and(eq(vendors.id, id), eq(vendors.organizationId, localOrg.id)))
    .limit(1);
  if (!vendor) notFound();

  const [purposeLinks, activities, transfers, relationships, trackerRows, orgVendors, orgWebsites, orgPurposes, activityLogs] = await Promise.all([
    db.select({
      purposeName: purposes.name,
      purposeKey: purposes.key,
      processingRole: vendorPurposes.processingRole,
    }).from(vendorPurposes).innerJoin(purposes, eq(vendorPurposes.purposeId, purposes.id)).where(
      and(eq(vendorPurposes.vendorId, vendor.id), eq(purposes.organizationId, localOrg.id)),
    ),
    db.select().from(processingActivities).where(and(eq(processingActivities.organizationId, localOrg.id), eq(processingActivities.vendorId, vendor.id))),
    db.select().from(crossBorderTransfers).where(and(eq(crossBorderTransfers.organizationId, localOrg.id), eq(crossBorderTransfers.vendorId, vendor.id))),
    db.select().from(vendorRelationships).where(and(eq(vendorRelationships.organizationId, localOrg.id), eq(vendorRelationships.parentVendorId, vendor.id))),
    db.select({ id: trackers.id, name: trackers.name, status: trackers.status }).from(trackers).where(eq(trackers.vendorId, vendor.id)).limit(20),
    db.select({ id: vendors.id, name: vendors.name }).from(vendors).where(eq(vendors.organizationId, localOrg.id)).orderBy(vendors.name),
    db.select({ id: websites.id, name: websites.name }).from(websites).where(eq(websites.organizationId, localOrg.id)),
    db.select({ id: purposes.id, name: purposes.name }).from(purposes).where(eq(purposes.organizationId, localOrg.id)),
    db.select({
      id: auditLogs.id,
      action: auditLogs.action,
      description: auditLogs.description,
      createdAt: auditLogs.createdAt,
    }).from(auditLogs).where(and(eq(auditLogs.organizationId, localOrg.id), eq(auditLogs.resourceType, "vendor"), eq(auditLogs.resourceId, vendor.id))).orderBy(desc(auditLogs.createdAt)).limit(20),
  ]);

  return (
    <div className="page-wrap space-y-6">
      <nav className="text-sm text-slate-500">
        <Link href="/dashboard/vendors" className="hover:text-slate-800">Vendors</Link>
        <span> / {vendor.name}</span>
      </nav>
      <div>
        <h1 className="page-title">{vendor.name}</h1>
        <p className="page-description">
          Role, DPA, processing, and transfer inventory. Changing these fields after a policy is published does not rewrite that policy&apos;s frozen snapshot or historical consent evidence.
        </p>
      </div>
      <VendorEditor vendor={vendor} />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 card-shadow">
        <h2 className="text-base font-semibold text-slate-900">Linked purposes</h2>
        {purposeLinks.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No purposes linked yet.</p>
        ) : (
          <ul className="mt-3 space-y-1 text-sm">
            {purposeLinks.map((row) => (
              <li key={row.purposeKey}>{row.purposeName} <span className="text-slate-400">({row.purposeKey}{row.processingRole ? ` · ${row.processingRole}` : ""})</span></li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 card-shadow">
        <h2 className="text-base font-semibold text-slate-900">Processing activities</h2>
        {activities.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No processing activities recorded.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {activities.map((row) => (
              <li key={row.id} className="rounded-xl bg-slate-50 px-3 py-2">
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

      <section className="rounded-2xl border border-slate-200 bg-white p-6 card-shadow">
        <h2 className="text-base font-semibold text-slate-900">Transfers</h2>
        {transfers.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No transfer records.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {transfers.map((row) => (
              <li key={row.id} className="rounded-xl bg-slate-50 px-3 py-2">
                {row.sourceCountry ?? "?"} → {row.destinationCountry || row.destinationRegion || "?"} · {row.mechanism} · {row.status}
              </li>
            ))}
          </ul>
        )}
      </section>

      <TransferForm vendors={orgVendors} websites={orgWebsites} />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 card-shadow">
        <h2 className="text-base font-semibold text-slate-900">Processor relationships</h2>
        {relationships.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No processor/subprocessor links.</p>
        ) : (
          <ul className="mt-3 space-y-1 text-sm">
            {relationships.map((row) => (
              <li key={row.id}>{row.relationshipType} → {row.childVendorId} · {row.status}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 card-shadow">
        <h2 className="text-base font-semibold text-slate-900">Mapped trackers</h2>
        {trackerRows.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No trackers mapped to this vendor.</p>
        ) : (
          <ul className="mt-3 space-y-1 text-sm">
            {trackerRows.map((row) => (
              <li key={row.id}>{row.name} · {row.status}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 card-shadow">
        <h2 className="text-base font-semibold text-slate-900">Audit</h2>
        {activityLogs.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No vendor audit events yet.</p>
        ) : (
          <ol className="mt-3 space-y-2">
            {activityLogs.map((row) => (
              <li key={row.id} className="border-l-2 border-slate-200 pl-3">
                <p className="text-xs font-medium text-slate-800">{row.action.replaceAll("_", " ")}</p>
                {row.description && <p className="text-sm text-slate-600">{row.description}</p>}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
