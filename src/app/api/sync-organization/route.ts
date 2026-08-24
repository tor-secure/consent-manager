import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { syncActiveClerkOrganization } from "@/lib/sync-clerk-organization";

export async function POST() {
  try {
    const { isAuthenticated, orgId } = await auth();

    if (!isAuthenticated) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 },
      );
    }

    if (!orgId) {
      return NextResponse.json(
        {
          success: false,
          message: "No active organization selected.",
        },
        { status: 400 },
      );
    }

    const organization =
      await syncActiveClerkOrganization();

    return NextResponse.json({
      success: true,
      organization,
    });
  } catch (error) {
    console.error("Organization sync failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to sync organization.",
      },
      { status: 500 },
    );
  }
}