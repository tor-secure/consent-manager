import { NextResponse, type NextRequest } from "next/server";

import { getElearningAdminSession } from "@/lib/learning/admin-auth";
import { createPromoCode, listPromoCodes, setPromoCodeActive } from "@/lib/learning/admin-service";
import { learningRateLimit, requireJsonBodyHeaders } from "@/lib/learning/request-guard";

async function requireAdmin() {
  const session = await getElearningAdminSession();
  if (!session) return { session: null, error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  return { session, error: null };
}

export async function GET(request: NextRequest) {
  const limited = learningRateLimit(request, "elearning-admin-promos-get", 60);
  if (limited) return limited;
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const kind = request.nextUrl.searchParams.get("kind");
  if (kind !== "voucher" && kind !== "coupon") {
    return NextResponse.json({ error: "invalid", message: "kind must be voucher or coupon." }, { status: 400 });
  }
  const rows = await listPromoCodes(kind);
  return NextResponse.json({ items: rows });
}

export async function POST(request: NextRequest) {
  const limited = learningRateLimit(request, "elearning-admin-promos-post", 30);
  if (limited) return limited;
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const headers = requireJsonBodyHeaders(request);
  if (headers) return headers;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid", message: "Invalid JSON body." }, { status: 400 });
  }

  const kind = body.kind === "voucher" || body.kind === "coupon" ? body.kind : null;
  if (!kind) {
    return NextResponse.json({ error: "invalid", message: "kind must be voucher or coupon." }, { status: 400 });
  }

  const expiresAt =
    typeof body.expiresAt === "string" && body.expiresAt.trim()
      ? new Date(body.expiresAt)
      : null;
  if (expiresAt && Number.isNaN(expiresAt.getTime())) {
    return NextResponse.json({ error: "invalid", message: "Invalid expiresAt." }, { status: 400 });
  }

  const row = await createPromoCode({
    kind,
    label: typeof body.label === "string" ? body.label : "",
    discountPercent: typeof body.discountPercent === "number" ? body.discountPercent : undefined,
    maxRedemptions: typeof body.maxRedemptions === "number" ? body.maxRedemptions : null,
    expiresAt,
    note: typeof body.note === "string" ? body.note : null,
    createdBy: auth.session!.sub,
  });

  return NextResponse.json({ item: row }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const limited = learningRateLimit(request, "elearning-admin-promos-patch", 40);
  if (limited) return limited;
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const headers = requireJsonBodyHeaders(request);
  if (headers) return headers;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid", message: "Invalid JSON body." }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id : "";
  if (!id || typeof body.active !== "boolean") {
    return NextResponse.json({ error: "invalid", message: "id and active are required." }, { status: 400 });
  }

  const row = await setPromoCodeActive(id, body.active);
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ item: row });
}
