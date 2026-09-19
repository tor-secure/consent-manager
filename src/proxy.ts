import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import { isClerkConfigured } from "@/lib/clerk-config";
import { publicOptionsResponse } from "@/lib/sdk/public-http";
import {
  applyBaselineSecurityHeaders,
  CLERK_CSP_EXTRA_DIRECTIVES,
  hasMachineBearerAuth,
  isPublicCrossOriginApiPath,
  isTrustedDashboardMutation,
  shouldEnforceCsrfOrigin,
} from "@/lib/security-headers";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/about(.*)",
  "/privacy-request(.*)",
  "/guardian-consent(.*)",
  "/sdk-demo(.*)",
  "/blogs(.*)",
  "/e-learning(.*)",
  "/api/health",
  "/api/health/ready",
  "/api/sdk(.*)",
  "/api/consent/record(.*)",
  "/api/consent/withdraw(.*)",
  "/api/consent/policy(.*)",
  "/api/rights-request(.*)",
  "/api/age-assurance(.*)",
  "/api/guardian-consent(.*)",
  "/api/cron(.*)",
  "/api/webhooks/clerk(.*)",
  "/api/webhooks/stripe(.*)",
  "/api/v1(.*)",
  "/api/agent(.*)",
]);

async function withBaselineHeaders(request: NextRequest, response: NextResponse) {
  applyBaselineSecurityHeaders(response.headers, {
    protocol: request.nextUrl.protocol,
    forwardedProto: request.headers.get("x-forwarded-proto"),
  });
  return response;
}

const clerkProxy = clerkMiddleware(
  async (auth, request) => {
    const { pathname } = request.nextUrl;

    if (request.method === "OPTIONS" && isPublicCrossOriginApiPath(pathname)) {
      const preflight = publicOptionsResponse("GET, POST, OPTIONS");
      applyBaselineSecurityHeaders(preflight.headers, {
        protocol: request.nextUrl.protocol,
        forwardedProto: request.headers.get("x-forwarded-proto"),
      });
      return preflight;
    }

    if (
      shouldEnforceCsrfOrigin(request.method, pathname) &&
      !hasMachineBearerAuth(request)
    ) {
      const allowed = isTrustedDashboardMutation({
        origin: request.headers.get("origin"),
        referer: request.headers.get("referer"),
        secFetchSite: request.headers.get("sec-fetch-site"),
        requestOrigin: request.nextUrl.origin,
      });
      if (!allowed) {
        const forbidden = NextResponse.json(
          { success: false, message: "Cross-origin request is not allowed." },
          { status: 403 },
        );
        applyBaselineSecurityHeaders(forbidden.headers, {
          protocol: request.nextUrl.protocol,
          forwardedProto: request.headers.get("x-forwarded-proto"),
        });
        return forbidden;
      }
    }

    if (!isPublicRoute(request)) {
      await auth.protect();
    }

    return withBaselineHeaders(request, NextResponse.next());
  },
  {
    contentSecurityPolicy: {
      strict: true,
      directives: CLERK_CSP_EXTRA_DIRECTIVES,
    },
  },
);

async function unconfiguredProxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (request.method === "OPTIONS" && isPublicCrossOriginApiPath(pathname)) {
    const preflight = publicOptionsResponse("GET, POST, OPTIONS");
    return withBaselineHeaders(request, preflight);
  }

  return withBaselineHeaders(request, NextResponse.next());
}

async function productionUnconfiguredProxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (request.method === "OPTIONS" && isPublicCrossOriginApiPath(pathname)) {
    const preflight = publicOptionsResponse("GET, POST, OPTIONS");
    return withBaselineHeaders(request, preflight);
  }

  if (
    pathname === "/api/health" ||
    pathname === "/api/health/ready" ||
    (isPublicRoute(request) && !pathname.startsWith("/api/"))
  ) {
    return withBaselineHeaders(request, NextResponse.next());
  }

  const unavailable = NextResponse.json(
    { success: false, message: "Authentication is not configured." },
    { status: 503 },
  );
  return withBaselineHeaders(request, unavailable);
}

export default isClerkConfigured()
  ? clerkProxy
  : process.env.NODE_ENV === "production"
    ? productionUnconfiguredProxy
    : unconfiguredProxy;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
