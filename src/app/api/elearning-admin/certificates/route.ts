import { NextResponse, type NextRequest } from "next/server";

import { getElearningAdminSession } from "@/lib/learning/admin-auth";
import { adminIssueCertificate, listAdminCertificates } from "@/lib/learning/admin-service";
import { learningRateLimit, requireJsonBodyHeaders } from "@/lib/learning/request-guard";

export async function GET(request: NextRequest) {
  const limited = learningRateLimit(request, "elearning-admin-certs-get", 60);
  if (limited) return limited;
  const session = await getElearningAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const items = await listAdminCertificates();
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const limited = learningRateLimit(request, "elearning-admin-certs-post", 20);
  if (limited) return limited;
  const session = await getElearningAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const headers = requireJsonBodyHeaders(request);
  if (headers) return headers;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid", message: "Invalid JSON body." }, { status: 400 });
  }

  const learnerId = typeof body.learnerId === "string" ? body.learnerId : "";
  if (!learnerId) {
    return NextResponse.json({ error: "invalid", message: "learnerId is required." }, { status: 400 });
  }

  const result = await adminIssueCertificate({
    learnerId,
    scorePercent: typeof body.scorePercent === "number" ? body.scorePercent : undefined,
    learnerName: typeof body.learnerName === "string" ? body.learnerName : undefined,
  });

  if (result.error) {
    return NextResponse.json(
      { error: result.error, message: result.message },
      { status: result.error === "not_found" ? 404 : 400 },
    );
  }

  return NextResponse.json({
    certificate: result.certificate,
    verificationPath: result.verificationPath,
  }, { status: 201 });
}
