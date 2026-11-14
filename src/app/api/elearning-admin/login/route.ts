import { NextResponse, type NextRequest } from "next/server";

import {
  attachElearningAdminSession,
  authenticateElearningAdmin,
  isElearningAdminConfigured,
  requireElearningAdminConfigured,
} from "@/lib/learning/admin-auth";
import { learningRateLimit, requireJsonBodyHeaders } from "@/lib/learning/request-guard";

export async function POST(request: NextRequest) {
  const limited = learningRateLimit(request, "elearning-admin-login", 20);
  if (limited) return limited;
  const configured = await requireElearningAdminConfigured();
  if (configured) return configured;
  const headers = requireJsonBodyHeaders(request);
  if (headers) return headers;

  let body: { username?: unknown; password?: unknown };
  try {
    body = (await request.json()) as { username?: unknown; password?: unknown };
  } catch {
    return NextResponse.json({ error: "invalid", message: "Invalid JSON body." }, { status: 400 });
  }

  const username = typeof body.username === "string" ? body.username : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!username || !password) {
    return NextResponse.json({ error: "invalid", message: "Username and password are required." }, { status: 400 });
  }

  if (!(await authenticateElearningAdmin(username, password))) {
    return NextResponse.json({ error: "unauthorized", message: "Invalid username or password." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, configured: await isElearningAdminConfigured() });
  attachElearningAdminSession(response, username);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
