import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

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
  "/privacy-request(.*)",
  "/guardian-consent(.*)",
  "/sdk-demo(.*)",
  "/api/health",
  "/api/sdk(.*)",
  "/api/consent/record(.*)",
  "/api/consent/withdraw(.*)",
  "/api/consent/policy(.*)",
  "/api/rights-request(.*)",
  "/api/age-assurance(.*)",
  "/api/guardian-consent(.*)",
  "/api/cron(.*)",
  "/api/webhooks/clerk(.*)",
  "/api/v1(.*)",
  "/api/agent(.*)",
]);

export default clerkMiddleware(
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

    const response = NextResponse.next();
    applyBaselineSecurityHeaders(response.headers, {
      protocol: request.nextUrl.protocol,
      forwardedProto: request.headers.get("x-forwarded-proto"),
    });
    return response;
  },
  {
    contentSecurityPolicy: {
      strict: true,
      directives: CLERK_CSP_EXTRA_DIRECTIVES,
    },
  },
);

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
