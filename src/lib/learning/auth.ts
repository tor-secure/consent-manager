import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { createClerkClient } from "@clerk/backend";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { learningDb } from "@/db/learning/client";
import { learningLearners } from "@/db/learning/schema";
import { learningClerkKeys, safeLearningPath } from "@/lib/learning/clerk";
import { parseOperatorEmailAllowlist, resolveLearningRole } from "@/lib/learning/operator-access";
import { forceClearClerkBrowserCookies } from "@/lib/learning/platform-session";
import type { LearnerContext } from "@/lib/learning/service";
import { LEARNING_UI_COOKIE } from "@/lib/learning/ui-cookie";

export const LEARNING_SESSION_COOKIE = "cg_learning";
/** Short-lived flag so the client session bridge does not immediately sign the learner back in. */
export const LEARNING_SIGNED_OUT_COOKIE = "cg_learning_signed_out";
export { LEARNING_UI_COOKIE };
const SESSION_SECONDS = 60 * 60 * 24 * 14;
/** Skip learner upsert when profile is unchanged and recently synced. */
const LEARNER_SYNC_MS = 15 * 60 * 1000;

type SessionPayload = {
  sub: string;
  email: string;
  name: string;
  exp: number;
  /** Absent on legacy cookies — treated as unverified so operator privilege cannot linger. */
  emailVerified?: boolean;
};

function learningClerk() {
  const { secretKey, publishableKey, configured } = learningClerkKeys();
  if (!configured) {
    throw new Error("Set LEARNING_CLERK_SECRET_KEY and NEXT_PUBLIC_LEARNING_CLERK_PUBLISHABLE_KEY.");
  }
  return createClerkClient({ secretKey, publishableKey });
}

export async function getLearningSession(): Promise<LearnerContext | null> {
  const token = (await cookies()).get(LEARNING_SESSION_COOKIE)?.value;
  const payload = verifySession(token);
  if (!payload) return null;
  return saveLearner(payload);
}

export async function establishLearningSession(request: NextRequest): Promise<NextResponse> {
  const next = safeLearningPath(request.nextUrl.searchParams.get("next"));
  const state = await learningClerk().authenticateRequest(request);
  if (state.status === "handshake") {
    const location = state.headers.get("location");
    const response = location ? NextResponse.redirect(location, 307) : NextResponse.next();
    state.headers.forEach((value, key) => {
      if (key.toLowerCase() === "location") return;
      response.headers.append(key, value);
    });
    return response;
  }
  if (!state.isAuthenticated) {
    const signIn = new URL("/e-learning/sign-in", request.url);
    signIn.searchParams.set("redirect_url", next);
    return NextResponse.redirect(signIn);
  }

  const auth = state.toAuth();
  const user = await learningClerk().users.getUser(auth.userId);
  const primary =
    user.emailAddresses.find((item) => item.id === user.primaryEmailAddressId) ?? user.emailAddresses[0];
  const email = primary?.emailAddress ?? "";
  const emailVerified = primary?.verification?.status === "verified";
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || email || "Learner";

  // Hard navigation (not Next soft-nav): after logout the guest /e-learning RSC tree is
  // cached without a sidebar; a normal 302 can reuse that cache until a full refresh.
  const target = new URL(next, request.url);
  const destination = `${target.pathname}${target.search}`;
  const response = new NextResponse(
    `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="robots" content="noindex"/><title>Opening course</title></head><body style="font-family:system-ui,sans-serif;display:flex;min-height:50vh;align-items:center;justify-content:center;color:#4d6570"><p>Opening your course...</p><script>window.location.replace(${JSON.stringify(destination)});</script></body></html>`,
    {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
  response.cookies.set(
    LEARNING_SESSION_COOKIE,
    signSession({
      sub: auth.userId,
      email,
      name,
      emailVerified,
      exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS,
    }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_SECONDS,
    },
  );
  // Client-readable twin so the UI can refresh if a soft navigation still serves guest chrome.
  response.cookies.set(LEARNING_UI_COOKIE, "1", {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
  // Clear any prior "just logged out" flag so the portal session is active again.
  response.cookies.set(LEARNING_SIGNED_OUT_COOKIE, "", {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  // Keep Learning Clerk cookies for this redirect so the session sticks.
  // Platform stash is restored only when leaving e-learning (see proxy), not here.
  return response;
}

export function clearLearningSession(response: NextResponse) {
  response.cookies.set(LEARNING_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  response.cookies.set(LEARNING_UI_COOKIE, "", {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function endLearningSession(request: NextRequest): Promise<NextResponse> {
  // fetch() + redirect: "manual" can drop Set-Cookie; JSON lets the client apply cookies.
  const wantsJson = request.headers.get("accept")?.includes("application/json");
  const response = wantsJson
    ? NextResponse.json({ ok: true })
    : NextResponse.redirect(new URL("/e-learning", request.url));
  response.headers.set("Cache-Control", "no-store, max-age=0");
  clearLearningSession(response);

  // Drop Learning Clerk browser cookies so the session bridge cannot remint cg_learning.
  // Do NOT restore the stashed workspace Clerk session here — putting dashboard
  // `__session` on /e-learning made the curriculum sidebar vanish until a second login.
  // Platform stash is restored only when leaving e-learning (see proxy).
  forceClearClerkBrowserCookies(response);

  // Block auto re-login via LearningSessionBridge until Clerk sign-out has settled.
  response.cookies.set(LEARNING_SIGNED_OUT_COOKIE, "1", {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 300,
  });
  return response;
}

async function saveLearner(payload: SessionPayload): Promise<LearnerContext> {
  const email = payload.email.trim().toLowerCase();
  const roleName = resolveLearningRole(email, Boolean(payload.emailVerified), operatorEmails());
  const [existing] = await learningDb
    .select()
    .from(learningLearners)
    .where(eq(learningLearners.clerkUserId, payload.sub))
    .limit(1);
  if (
    existing &&
    existing.email === email &&
    existing.name === payload.name &&
    existing.roleName === roleName &&
    Date.now() - existing.updatedAt.getTime() < LEARNER_SYNC_MS
  ) {
    return {
      learnerId: existing.id,
      clerkUserId: existing.clerkUserId,
      email: existing.email,
      roleName: existing.roleName,
      learnerName: existing.name,
    };
  }

  const now = new Date();
  const [row] = await learningDb
    .insert(learningLearners)
    .values({
      clerkUserId: payload.sub,
      email,
      name: payload.name,
      roleName,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: learningLearners.clerkUserId,
      set: { email, name: payload.name, roleName, updatedAt: now },
    })
    .returning();
  if (!row) throw new Error("The learner account could not be saved.");
  return {
    learnerId: row.id,
    clerkUserId: row.clerkUserId,
    email: row.email,
    roleName: row.roleName,
    learnerName: row.name,
  };
}

function operatorEmails(): Set<string> {
  return parseOperatorEmailAllowlist(process.env.LEARNING_OPERATOR_EMAILS);
}

function sessionSecret(): string {
  const secret = process.env.LEARNING_CLERK_SECRET_KEY?.trim();
  if (!secret) throw new Error("Set LEARNING_CLERK_SECRET_KEY.");
  return secret;
}

function signSession(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", sessionSecret()).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function verifySession(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = createHmac("sha256", sessionSecret()).update(body).digest("base64url");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.sub || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

