import type { NextRequest, NextResponse } from "next/server";

const STASH_SESSION = "cg_platform_session";
const STASH_UAT = "cg_platform_uat";
const STASH_DEV = "cg_platform_db_jwt";

const CLERK_SESSION = "__session";
const CLERK_UAT = "__client_uat";
const CLERK_DEV = "__clerk_db_jwt";

export type ClerkCookieWrite = {
  name: string;
  value: string;
  httpOnly: boolean;
  maxAge?: number;
};

function frontendApi(publishableKey: string | undefined): string {
  const encoded = publishableKey?.trim().replace(/^pk_(test|live)_/, "") ?? "";
  if (!encoded) return "";
  try {
    return Buffer.from(encoded, "base64").toString("utf8").replace(/\$$/, "");
  } catch {
    return "";
  }
}

function issuer(token: string | undefined): string {
  const part = token?.split(".")[1];
  if (!part) return "";
  try {
    const payload = JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as { iss?: unknown };
    return typeof payload.iss === "string" ? payload.iss.replace(/^https?:\/\//, "").replace(/\/$/, "") : "";
  } catch {
    return "";
  }
}

export function sessionOwner(token: string | undefined): "platform" | "learning" | "unknown" {
  const iss = issuer(token);
  if (!iss) return "unknown";
  if (iss === frontendApi(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)) return "platform";
  if (iss === frontendApi(process.env.NEXT_PUBLIC_LEARNING_CLERK_PUBLISHABLE_KEY)) return "learning";
  return "unknown";
}

function cookieBase(httpOnly: boolean, maxAge?: number) {
  return {
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    httpOnly,
    ...(maxAge === undefined ? {} : { maxAge }),
  };
}

function clearStashWrites(): ClerkCookieWrite[] {
  return [STASH_SESSION, STASH_UAT, STASH_DEV].map((name) => ({
    name,
    value: "",
    httpOnly: true,
    maxAge: 0,
  }));
}

export function rememberPlatformSession(request: NextRequest, response: NextResponse) {
  const current = request.cookies.get(CLERK_SESSION)?.value;
  if (sessionOwner(current) !== "platform") return;
  const pairs: Array<[string, string | undefined, boolean]> = [
    [STASH_SESSION, current, true],
    [STASH_UAT, request.cookies.get(CLERK_UAT)?.value, false],
    [STASH_DEV, request.cookies.get(CLERK_DEV)?.value, true],
  ];
  for (const [name, value, httpOnly] of pairs) {
    if (!value) continue;
    response.cookies.set(name, value, cookieBase(httpOnly, 60 * 60 * 24 * 14));
  }
}

/** Put the workspace Clerk session back when the course login replaced it. */
export function takePlatformSession(request: NextRequest): ClerkCookieWrite[] {
  const stashed = request.cookies.get(STASH_SESSION)?.value;
  if (!stashed || sessionOwner(stashed) !== "platform") return [];
  const owner = sessionOwner(request.cookies.get(CLERK_SESSION)?.value);
  if (owner === "platform") return [];
  if (owner !== "learning") return clearStashWrites();

  request.cookies.set(CLERK_SESSION, stashed);
  const writes: ClerkCookieWrite[] = [{ name: CLERK_SESSION, value: stashed, httpOnly: true }];
  const uat = request.cookies.get(STASH_UAT)?.value;
  if (uat) {
    request.cookies.set(CLERK_UAT, uat);
    writes.push({ name: CLERK_UAT, value: uat, httpOnly: false });
  }
  const dev = request.cookies.get(STASH_DEV)?.value;
  if (dev) {
    request.cookies.set(CLERK_DEV, dev);
    writes.push({ name: CLERK_DEV, value: dev, httpOnly: true });
  }
  return [...writes, ...clearStashWrites()];
}

export function applyClerkCookies(response: NextResponse, writes: ClerkCookieWrite[]) {
  for (const cookie of writes) {
    response.cookies.set(cookie.name, cookie.value, cookieBase(cookie.httpOnly, cookie.maxAge));
  }
}

export function clearLearningClerkCookies(request: NextRequest, response: NextResponse) {
  if (sessionOwner(request.cookies.get(CLERK_SESSION)?.value) !== "learning") return;
  for (const name of [CLERK_SESSION, CLERK_UAT, "__refresh", CLERK_DEV, "__clerk_handshake"]) {
    response.cookies.set(name, "", { path: "/", maxAge: 0 });
  }
}
