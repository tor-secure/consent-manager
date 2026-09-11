import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
}
