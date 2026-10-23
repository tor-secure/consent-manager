import { NextResponse, type NextRequest } from "next/server";

import { countryFromRequestHeaders } from "@/lib/analytics/client-hints";
import { regionFromRequestHeaders } from "@/lib/regulations/geo";
import {
  isLawGuideId,
  LAW_GUIDE_COOKIE,
  LAW_GUIDES,
  lawGuideForLocation,
} from "@/lib/regulations/journey-route";

/**
 * Sends the visitor to the privacy-law journey for where they are: the guide
 * they last picked, else their location from the edge headers. `?country=DE`
 * (and `?region=`) override the location, for testing where no edge is.
 */
export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const picked = request.cookies.get(LAW_GUIDE_COOKIE)?.value;
  const override = params.get("country") || params.get("region");

  const guide =
    !override && isLawGuideId(picked)
      ? picked
      : lawGuideForLocation({
          country: params.get("country") ?? countryFromRequestHeaders(request.headers),
          region: params.get("region") ?? regionFromRequestHeaders(request.headers),
        });

  const response = NextResponse.redirect(new URL(LAW_GUIDES[guide].path, request.url), 307);
  // The answer depends on who is asking; never let a cache share it.
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
