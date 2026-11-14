import { asc, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { learningDb } from "@/db/learning/client";
import { learningAdmins } from "@/db/learning/schema";
import { isElearningAdminConfigured } from "@/lib/learning/admin-auth";
import { createAdminPasswordResetToken } from "@/lib/learning/admin-password";
import { learningRateLimit } from "@/lib/learning/request-guard";
import { isMailConfigured } from "@/lib/mail/send-email";
import { sendElearningAdminPasswordResetEmail } from "@/lib/mail/send-elearning-admin-reset";
import { SITE_URL } from "@/lib/site-metadata";

const RESET_TTL_MINUTES = 60;

export async function POST(request: NextRequest) {
  const limited = learningRateLimit(request, "elearning-admin-forgot", 5, 60_000);
  if (limited) return limited;

  if (!(await isElearningAdminConfigured())) {
    return NextResponse.json(
      { error: "not_configured", message: "No admin account is configured." },
      { status: 503 },
    );
  }

  if (!isMailConfigured()) {
    return NextResponse.json(
      { error: "mail_not_configured", message: "Mail is not configured on this server." },
      { status: 503 },
    );
  }

  const [admin] = await learningDb
    .select()
    .from(learningAdmins)
    .where(eq(learningAdmins.active, true))
    .orderBy(asc(learningAdmins.createdAt))
    .limit(1);

  if (!admin) {
    return NextResponse.json(
      { error: "not_configured", message: "No admin account is configured." },
      { status: 503 },
    );
  }

  const { token, tokenHash } = createAdminPasswordResetToken();
  const expiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60_000);

  await learningDb
    .update(learningAdmins)
    .set({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: expiresAt,
      updatedAt: new Date(),
    })
    .where(eq(learningAdmins.id, admin.id));

  const origin = request.nextUrl.origin || SITE_URL;
  const resetUrl = `${origin}/elearning-admin/reset-password?token=${encodeURIComponent(token)}`;

  try {
    await sendElearningAdminPasswordResetEmail({
      username: admin.username,
      resetUrl,
      expiresInMinutes: RESET_TTL_MINUTES,
    });
  } catch {
    return NextResponse.json(
      { error: "mail_failed", message: "Could not send the reset email. Try again later." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Password reset link sent to consentguruofficial@gmail.com.",
  });
}
