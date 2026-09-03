export type GeoHint = {
  country: string | null;
  region: string | null;
  source: "hint" | "website_default" | "none";
};

export type GeoProvider = {
  name: string;
  resolve(input: {
    country?: string | null;
    region?: string | null;
    websiteDefaultRegion?: string | null;
  }): GeoHint;
};

const COARSE_REGION_TO_COUNTRY: Record<string, string> = {
  IN: "IN",
  US: "US",
  UK: "GB",
  GB: "GB",
  CA: "CA",
  AU: "AU",
  BR: "BR",
};

export function normalizeCountry(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(trimmed)) return null;
  return trimmed;
}

export function normalizeRegion(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim().toUpperCase();
  if (!trimmed || trimmed.length > 16) return null;
  if (!/^[A-Z0-9][A-Z0-9._-]{0,15}$/.test(trimmed)) return null;
  return trimmed;
}

export function regionFromRequestHeaders(headers: {
  get(name: string): string | null;
}): string | null {
  return normalizeRegion(
    headers.get("x-vercel-ip-country-region") ||
      headers.get("cf-region-code") ||
      headers.get("x-region-code"),
  );
}

export function resolveJurisdiction(input: {
  country?: string | null;
  region?: string | null;
  websiteDefaultRegion?: string | null;
}): GeoHint {
  const country = normalizeCountry(input.country);
  const region = normalizeRegion(input.region);
  if (country || region) {
    return { country, region, source: "hint" };
  }

  const fallback = (input.websiteDefaultRegion ?? "").trim().toUpperCase();
  if (fallback === "EU" || fallback === "EEA") {
    return { country: null, region: fallback, source: "website_default" };
  }
  const mapped = COARSE_REGION_TO_COUNTRY[fallback];
  if (mapped) {
    return { country: mapped, region: null, source: "website_default" };
  }
  const asCountry = normalizeCountry(fallback);
  if (asCountry) {
    return { country: asCountry, region: null, source: "website_default" };
  }
  return { country: null, region: null, source: "none" };
}

export const queryParamGeoProvider: GeoProvider = {
  name: "query_or_website_default",
  resolve: resolveJurisdiction,
};
