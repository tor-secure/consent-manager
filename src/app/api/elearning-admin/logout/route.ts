import { NextResponse, type NextRequest } from "next/server";

import { clearElearningAdminSession } from "@/lib/learning/admin-auth";
import { learningRateLimit } from "@/lib/learning/request-guard";

export async function POST(request: NextRequest) {
  const limited = learningRateLimit(request, "elearning-admin-logout", 30);
  if (limited) return limited;
  const response = NextResponse.json({ ok: true });
  clearElearningAdminSession(response);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
