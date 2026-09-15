import { NextResponse } from "next/server";
import { z } from "zod";

import { authorizeOwnedPolicy } from "@/lib/compliance/http";
import { requireOperatorRole } from "@/lib/org-roles";
import { schedulePolicyVersion } from "@/lib/policy/lifecycle";

const bodySchema = z.object({
  versionId: z.string().uuid(),
  scheduledPublishAt: z.string().datetime(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: policyId } = await params;
  const authz = await authorizeOwnedPolicy(policyId);
  if (authz.error) return authz.error;
  const operatorError = requireOperatorRole(authz.membership.roleName);
  if (operatorError) return operatorError;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "versionId and scheduledPublishAt are required" }, { status: 400 });
  }
  const when = new Date(parsed.data.scheduledPublishAt);
  if (when.getTime() <= Date.now()) {
    return NextResponse.json({ success: false, message: "Schedule time must be in the future" }, { status: 400 });
  }
  const updated = await schedulePolicyVersion({
    versionId: parsed.data.versionId,
    scheduledPublishAt: when,
  });
  if (!updated) {
    return NextResponse.json({ success: false, message: "Only unpublished versions can be scheduled" }, { status: 409 });
  }
  return NextResponse.json({
    success: true,
    version: { id: updated.id, status: updated.status, scheduledPublishAt: updated.scheduledPublishAt },
  });
}
