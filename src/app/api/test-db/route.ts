import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const organizationsList = await db
      .select()
      .from(organizations);

    return NextResponse.json({
      success: true,
      database: "connected",
      organizations: organizationsList,
    });
  } catch (error) {
    console.error("Database connection error:", error);

    return NextResponse.json(
      {
        success: false,
        database: "connection failed",
      },
      { status: 500 }
    );
  }
}