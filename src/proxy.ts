import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

import { SEO_PUBLIC_MATCHERS } from "@/content/seo-landings";
import { isClerkConfigured } from "@/lib/clerk-config";
import { applyClerkCookies, rememberPlatformSession, takePlatformSession } from "@/lib/learning/platform-session";
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
  "/privacy-center(.*)",
  "/disclaimer(.*)",
  "/faqs(.*)",
  "/pricing(.*)",
  "/dpo-as-service(.*)",
  "/privacy-request(.*)",
  "/guardian-consent(.*)",
  "/consent/whatsapp(.*)",
  "/sdk-demo(.*)",
  "/blogs(.*)",
  "/news(.*)",
  "/learning/verify(.*)",
  "/learning/certificate(.*)",
  "/dpdp-act(.*)",
  "/tools(.*)",
  "/blog(.*)",
  ...SEO_PUBLIC_MATCHERS,
  "/robots.txt",
  "/sitemap.xml",
  "/manifest.webmanifest",
  "/.well-known(.*)",
  "/api/health",
  "/api/health/ready",
  "/api/sdk(.*)",
  "/api/consent/record(.*)",
  "/api/consent/withdraw(.*)",
  "/api/consent/policy(.*)",
  "/api/consent/receipt(.*)",
  "/api/consent/whatsapp(.*)",
  "/api/rights-request(.*)",
  "/api/pricing-enquiry(.*)",
  "/api/dpo-enquiry(.*)",
  "/api/tools/reports/pdf(.*)",
  "/api/tools/notice-review(.*)",
  "/api/age-assurance(.*)",
  "/api/guardian-consent(.*)",
  "/api/cron(.*)",
  "/api/webhooks/clerk(.*)",
  "/api/webhooks/stripe(.*)",
  "/api/webhooks/whatsapp(.*)",
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

/** Pass the request through, exposing the pathname to the root layout via x-cg-path. */
function nextWithPath(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-cg-path", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
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

    if (!isPublicRoute(request) && pathname.startsWith("/api/")) {
      const session = await auth();
      if (!session.userId) {
        const unauthorized = NextResponse.json(
          { success: false, message: "Unauthorized" },
          { status: 401 },
        );
        return withBaselineHeaders(request, unauthorized);
      }
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

    if (isPrivatePage(pathname)) {
      await auth.protect();
    }

    return withBaselineHeaders(request, nextWithPath(request));
  },
  {
    contentSecurityPolicy: {
      strict: true,
      directives: CLERK_CSP_EXTRA_DIRECTIVES,
    },
  },
);

function isPrivatePage(pathname: string) {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/") || pathname === "/create-organization" || pathname.startsWith("/create-organization/");
}

async function unconfiguredProxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (request.method === "OPTIONS" && isPublicCrossOriginApiPath(pathname)) {
    const preflight = publicOptionsResponse("GET, POST, OPTIONS");
    return withBaselineHeaders(request, preflight);
  }

  return withBaselineHeaders(request, nextWithPath(request));
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
    (!pathname.startsWith("/api/") && !isPrivatePage(pathname))
  ) {
    return withBaselineHeaders(request, nextWithPath(request));
  }

  const unavailable = NextResponse.json(
    { success: false, message: "Authentication is not configured." },
    { status: 503 },
  );
  return withBaselineHeaders(request, unavailable);
}

function isLearningPath(pathname: string) {
  return pathname === "/e-learning" || pathname.startsWith("/e-learning/") || pathname === "/api/learning" || pathname.startsWith("/api/learning/");
}

function isLearningSignPage(pathname: string) {
  return pathname === "/e-learning/sign-in" || pathname.startsWith("/e-learning/sign-in/") || pathname === "/e-learning/sign-up" || pathname.startsWith("/e-learning/sign-up/");
}

function learningPass(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-cg-auth", "learning");
  requestHeaders.set("x-cg-path", request.nextUrl.pathname);
  return withBaselineHeaders(request, NextResponse.next({ request: { headers: requestHeaders } }));
}

const platformProxy = isClerkConfigured()
  ? clerkProxy
  : process.env.NODE_ENV === "production"
    ? productionUnconfiguredProxy
    : unconfiguredProxy;

export default async function proxy(request: NextRequest, event: NextFetchEvent) {
  const pathname = request.nextUrl.pathname;
  if (isLearningSignPage(pathname)) {
    const response = await learningPass(request);
    rememberPlatformSession(request, response);
    return response;
  }
  if (pathname === "/e-learning/session") return learningPass(request);
  if (isLearningPath(pathname)) {
    const restored = takePlatformSession(request);
    const response = await learningPass(request);
    applyClerkCookies(response, restored);
    return response;
  }
  const restored = takePlatformSession(request);
  const response = await platformProxy(request, event);
  if (response instanceof NextResponse) applyClerkCookies(response, restored);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
