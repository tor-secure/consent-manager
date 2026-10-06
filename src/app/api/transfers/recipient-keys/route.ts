import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { transferRecipientKeys } from "@/db/schema/transfer-security";
import { vendors } from "@/db/schema/vendors";
import { authorizeProcessingOrganization } from "@/lib/processing/http";
import { validateRecipientPublicKey } from "@/lib/transfer-security-core";
import { auditLogs } from "@/db/schema/audit-logs";
import { isUuid } from "@/lib/trackers/management";

const schema = z.object({ vendorId: z.string().uuid(), keyId: z.string().trim().min(3).max(80).regex(/^[A-Za-z0-9._-]+$/), publicKeySpki: z.string().min(80).max(900) }).strict();

export async function GET(request: Request) {
  const authz = await authorizeProcessingOrganization();
  if ("error" in authz) return authz.error;
  const vendorId = new URL(request.url).searchParams.get("vendorId");
  if (vendorId && !isUuid(vendorId)) return NextResponse.json({ success: false, message: "Invalid vendorId" }, { status: 400 });
  const rows = await db.select({ key: transferRecipientKeys, vendorName: vendors.name }).from(transferRecipientKeys).innerJoin(vendors, eq(vendors.id, transferRecipientKeys.vendorId)).where(and(eq(transferRecipientKeys.organizationId, authz.organization.id), ...(vendorId ? [eq(transferRecipientKeys.vendorId, vendorId)] : []))).orderBy(desc(transferRecipientKeys.createdAt)).limit(200);
  return NextResponse.json({ success: true, keys: rows.map((row) => ({ ...row.key, publicKeySpki: undefined, vendorName: row.vendorName })) });
}

export async function POST(request: Request) {
  const authz = await authorizeProcessingOrganization({ operator: true });
  if ("error" in authz) return authz.error;
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ success: false, message: "Invalid recipient key" }, { status: 400 });
  try { validateRecipientPublicKey(input.data.publicKeySpki); } catch { return NextResponse.json({ success: false, message: "Recipient key must be a valid X25519 SubjectPublicKeyInfo public key" }, { status: 400 }); }
  const [vendor] = await db.select({ id: vendors.id }).from(vendors).where(and(eq(vendors.id, input.data.vendorId), eq(vendors.organizationId, authz.organization.id), eq(vendors.status, "active"))).limit(1);
  if (!vendor) return NextResponse.json({ success: false, message: "Active vendor not found in this organization" }, { status: 404 });
  const [key] = await db.insert(transferRecipientKeys).values({ organizationId: authz.organization.id, vendorId: vendor.id, keyId: input.data.keyId, publicKeySpki: input.data.publicKeySpki, algorithm: "X25519-HKDF-SHA256-AES256GCM" }).onConflictDoNothing().returning();
  if (!key) return NextResponse.json({ success: false, message: "Key ID already exists for this vendor" }, { status: 409 });
  await db.insert(auditLogs).values({ organizationId: authz.organization.id, userId: authz.localUser.id, action: "transfer.recipient_key_registered", resourceType: "transfer_recipient_key", resourceId: key.id, description: "Registered recipient public encryption key", metadata: { vendorId: vendor.id, keyId: key.keyId, algorithm: key.algorithm } });
  return NextResponse.json({ success: true, key: { ...key, publicKeySpki: undefined } }, { status: 201 });
}
