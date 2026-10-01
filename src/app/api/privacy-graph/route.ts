import { NextResponse } from "next/server";
import { z } from "zod";
import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { loadPrivacyGraph } from "@/lib/intelligence/privacy-graph";

export async function GET(request: Request) {
  try { const context = await requireDashboardContext(); const websiteId = new URL(request.url).searchParams.get("websiteId"); if (!websiteId) return NextResponse.json({ success: false, message: "websiteId is required" }, { status: 400 }); const graph = await loadPrivacyGraph(context.organization.id, websiteId); if (!graph) return NextResponse.json({ success: false, message: "Website not found" }, { status: 404 }); return NextResponse.json({ success: true, graph }); }
  catch { return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 }); }
}
const simulationSchema = z.object({ websiteId: z.string().uuid(), type: z.literal("disable_purpose"), purposeId: z.string().uuid() });
export async function POST(request: Request) {
  try { const context = await requireDashboardContext(); const input = simulationSchema.safeParse(await request.json()); if (!input.success) return NextResponse.json({ success: false, message: "Invalid simulation" }, { status: 400 }); const graph = await loadPrivacyGraph(context.organization.id, input.data.websiteId); if (!graph) return NextResponse.json({ success: false, message: "Website not found" }, { status: 404 }); const { simulatePurposeDisabled } = await import("@/lib/intelligence/privacy-graph-core"); return NextResponse.json({ success: true, ...simulatePurposeDisabled(graph, input.data.purposeId) }); }
  catch { return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 }); }
}
