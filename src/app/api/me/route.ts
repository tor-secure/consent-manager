import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { syncClerkUser } from "@/lib/sync-clerk-user";

export async function GET() {
  await auth.protect();

  const user = await syncClerkUser();

  return NextResponse.json({
    success: true,
    user,
  });
}