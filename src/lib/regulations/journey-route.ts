import { normalizeCountry, normalizeRegion } from "@/lib/regulations/geo";

/** The 3D "Follow your data" journeys, one per law. Each URL always shows its own law. */
export const LAW_GUIDES = {
  dpdp: { path: "/dpdp-act", short: "DPDP", where: "India" },
  gdpr: { path: "/gdpr-guide", short: "GDPR", where: "EU & UK" },
  ccpa: { path: "/ccpa-guide", short: "CCPA", where: "California" },
} as const;

export type LawGuideId = keyof typeof LAW_GUIDES;

/** The guide a visitor picked by hand; it outranks their location. */
export const LAW_GUIDE_COOKIE = "cg_law_guide";

/** The shared entry point that sends each visitor to their law's journey. */
export const LAW_GUIDE_ENTRY_PATH = "/privacy-law";

/** Where no law here matches the visitor's location. */
const FALLBACK: LawGuideId = "gdpr";

// The EU and EEA, plus the UK and Switzerland, whose laws mirror the GDPR.
const GDPR_COUNTRIES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE",
  "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
  "IS", "LI", "NO",
  "GB", "CH",
]);

export function isLawGuideId(value: string | null | undefined): value is LawGuideId {
  return value === "dpdp" || value === "gdpr" || value === "ccpa";
}

/**
 * The journey for a visitor's location. Every US visitor gets the CCPA, the
 * most relevant US consumer privacy law here, not only Californians.
 */
export function lawGuideForLocation(input: {
  country?: string | null;
  region?: string | null;
}): LawGuideId {
  const country = normalizeCountry(input.country);
  const region = normalizeRegion(input.region);
  if (country === "IN") return "dpdp";
  if (country === "US" || region === "US-CA") return "ccpa";
  if (country && GDPR_COUNTRIES.has(country)) return "gdpr";
  return FALLBACK;
}
