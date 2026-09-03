import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import {
  applyBaselineSecurityHeaders,
  CLERK_CSP_EXTRA_DIRECTIVES,
  isTrustedDashboardMutation,
  shouldEnforceCsrfOrigin,
} from "@/lib/security-headers";

export default clerkMiddleware(
  async (_auth, request) => {
    const { pathname } = request.nextUrl;

    if (shouldEnforceCsrfOrigin(request.method, pathname)) {
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
