import { NextResponse } from "next/server";
import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { getConsentProofKeyMetadata } from "@/lib/consent-proof";
export async function GET() { try { await requireDashboardContext(); return NextResponse.json({ success: true, ...getConsentProofKeyMetadata() }); } catch { return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 }); } }
