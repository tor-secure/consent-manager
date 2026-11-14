import { and, eq, gt, isNotNull } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { learningDb } from "@/db/learning/client";
import { learningAdmins } from "@/db/learning/schema";
import {
  hashAdminPassword,
  hashAdminPasswordResetToken,
} from "@/lib/learning/admin-password";
import { learningRateLimit } from "@/lib/learning/request-guard";

const MIN_PASSWORD_LENGTH = 8;

export async function POST(request: NextRequest) {
  const limited = learningRateLimit(request, "elearning-admin-reset", 10, 60_000);
  if (limited) return limited;

  let body: { token?: string; password?: string; confirmPassword?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json", message: "Invalid request." }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";

  if (!token) {
    return NextResponse.json(
      { error: "missing_token", message: "Reset link is missing or invalid." },
      { status: 400 },
    );
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      {
        error: "weak_password",
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      },
      { status: 400 },
    );
  }
  if (password !== confirmPassword) {
    return NextResponse.json(
      { error: "mismatch", message: "Passwords do not match." },
      { status: 400 },
    );
  }

  const tokenHash = hashAdminPasswordResetToken(token);
  const [admin] = await learningDb
    .select()
    .from(learningAdmins)
    .where(
      and(
        eq(learningAdmins.active, true),
        eq(learningAdmins.passwordResetTokenHash, tokenHash),
        isNotNull(learningAdmins.passwordResetExpiresAt),
        gt(learningAdmins.passwordResetExpiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!admin) {
    return NextResponse.json(
      {
        error: "invalid_token",
        message: "This reset link is invalid or has expired. Request a new one from the login page.",
      },
      { status: 400 },
    );
  }

  await learningDb
    .update(learningAdmins)
    .set({
      passwordHash: hashAdminPassword(password),
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
      updatedAt: new Date(),
    })
    .where(eq(learningAdmins.id, admin.id));

  return NextResponse.json({
    ok: true,
    message: "Password updated. You can sign in with your new password.",
  });
}
