import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { learningDb } from "@/db/learning/client";
import { learningAdmins } from "@/db/learning/schema";
import { verifyAdminPassword } from "@/lib/learning/admin-password";

export const ELEARNING_ADMIN_COOKIE = "cg_elearning_admin";
const SESSION_SECONDS = 60 * 60 * 12;

type AdminSession = {
  sub: string;
  exp: number;
};

function sessionSecret() {
  const secret =
    process.env.ELEARNING_ADMIN_SESSION_SECRET?.trim() ||
    process.env.LEARNING_CLERK_SECRET_KEY?.trim() ||
    process.env.LEARNING_DATABASE_URL?.trim() ||
    "";
  if (!secret) throw new Error("Set ELEARNING_ADMIN_SESSION_SECRET for admin sessions.");
  return secret;
}

function signSession(payload: AdminSession) {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = createHmac("sha256", sessionSecret()).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function verifySession(token: string | undefined): AdminSession | null {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = createHmac("sha256", sessionSecret()).update(body).digest("base64url");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as AdminSession;
    if (!payload?.sub || typeof payload.exp !== "number") return null;
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

async function countActiveAdmins() {
  try {
    const rows = await learningDb
      .select({ id: learningAdmins.id })
      .from(learningAdmins)
      .where(eq(learningAdmins.active, true))
      .limit(1);
    return rows.length > 0;
  } catch {
    return false;
  }
}

export async function isElearningAdminConfigured() {
  return countActiveAdmins();
}

export async function getElearningAdminSession(): Promise<AdminSession | null> {
  const token = (await cookies()).get(ELEARNING_ADMIN_COOKIE)?.value;
  return verifySession(token);
}

export async function requireElearningAdminConfigured(): Promise<NextResponse | null> {
  if (await isElearningAdminConfigured()) return null;
  return NextResponse.json(
    {
      error: "not_configured",
      message: "No e-learning admin account is set up yet. Run scripts/seed-elearning-admin.mjs.",
    },
    { status: 503 },
  );
}

export async function authenticateElearningAdmin(username: string, password: string): Promise<boolean> {
  const normalized = username.trim().toLowerCase();
  if (!normalized || !password) return false;
  const [row] = await learningDb
    .select()
    .from(learningAdmins)
    .where(eq(learningAdmins.username, normalized))
    .limit(1);
  if (!row || !row.active) return false;
  return verifyAdminPassword(password, row.passwordHash);
}

export function attachElearningAdminSession(response: NextResponse, username: string) {
  const token = signSession({
    sub: username.trim().toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS,
  });
  response.cookies.set(ELEARNING_ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
  return response;
}

export function clearElearningAdminSession(response: NextResponse) {
  response.cookies.set(ELEARNING_ADMIN_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
