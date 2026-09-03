export type DeviceClass = "desktop" | "mobile" | "tablet" | "other";
export type BrowserClass = "chrome" | "safari" | "firefox" | "edge" | "other";

const ISO_COUNTRY = /^[A-Z]{2}$/;
const BLOCKED_COUNTRY_CODES = new Set(["XX", "T1", "A1", "A2", "O1"]);

export function normalizeCountryCode(value: string | null | undefined): string | null {
  if (!value) return null;
  const code = value.trim().toUpperCase();
  if (!ISO_COUNTRY.test(code)) return null;
  if (BLOCKED_COUNTRY_CODES.has(code)) return null;
  return code;
}

export function countryFromRequestHeaders(headers: {
  get(name: string): string | null;
}): string | null {
  const edge =
    headers.get("cf-ipcountry") ||
    headers.get("x-vercel-ip-country") ||
    headers.get("x-country-code");
  return normalizeCountryCode(edge);
}

export function classifyDevice(userAgent: string | null | undefined): DeviceClass {
  const ua = userAgent ?? "";
  if (!ua.trim()) return "other";
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) {
    return "tablet";
  }
  if (/Mobile|iPhone|iPod|Android.+Mobile|Windows Phone|IEMobile/i.test(ua)) {
    return "mobile";
  }
  if (/Windows NT|Macintosh|X11|Linux x86_64|CrOS/i.test(ua)) {
    return "desktop";
  }
  return "other";
}

export function classifyBrowser(userAgent: string | null | undefined): BrowserClass {
  const ua = userAgent ?? "";
  if (!ua.trim()) return "other";
  if (/Edg(e|A|iOS)?\//i.test(ua)) return "edge";
  if (/OPR\/|Opera\//i.test(ua)) return "other";
  if (/Chrome\/|CriOS\//i.test(ua) && !/Edg/i.test(ua)) return "chrome";
  if (/Firefox\/|FxiOS\//i.test(ua)) return "firefox";
  if (/Safari\//i.test(ua) && !/Chrome|Chromium|CriOS|FxiOS|Edg/i.test(ua)) return "safari";
  return "other";
}

export type AnalyticsHints = {
  country: string | null;
  device: DeviceClass;
  browser: BrowserClass;
};

export function buildAnalyticsHints(input: {
  headers?: { get(name: string): string | null };
  userAgent?: string | null;
  jurisdiction?: string | null;
}): AnalyticsHints {
  const fromEdge = input.headers ? countryFromRequestHeaders(input.headers) : null;
  const fromJurisdiction = normalizeCountryCode(input.jurisdiction);
  return {
    country: fromEdge ?? fromJurisdiction,
    device: classifyDevice(input.userAgent),
    browser: classifyBrowser(input.userAgent),
  };
}

export function mergeAnalyticsMetadata(
  evidence: Record<string, unknown>,
  hints: AnalyticsHints,
): Record<string, unknown> {
  return {
    ...evidence,
    analytics: {
      country: hints.country,
      device: hints.device,
      browser: hints.browser,
    },
  };
}

const COUNTRY_NAMES: Record<string, string> = {
  US: "United States",
  GB: "United Kingdom",
  IN: "India",
  DE: "Germany",
  FR: "France",
  CA: "Canada",
  AU: "Australia",
  BR: "Brazil",
  JP: "Japan",
  NL: "Netherlands",
  ES: "Spain",
  IT: "Italy",
  IE: "Ireland",
  SG: "Singapore",
  AE: "United Arab Emirates",
  EU: "European Union",
};

export function countryDisplayName(code: string): string {
  if (code === "unknown" || !code) return "Unknown";
  return COUNTRY_NAMES[code] ?? code;
}

export function deviceDisplayName(value: string): string {
  const map: Record<string, string> = {
    desktop: "Desktop",
    mobile: "Mobile",
    tablet: "Tablet",
    other: "Other",
    unknown: "Unknown",
  };
  return map[value] ?? "Unknown";
}

export function browserDisplayName(value: string): string {
  const map: Record<string, string> = {
    chrome: "Chrome",
    safari: "Safari",
    firefox: "Firefox",
    edge: "Edge",
    other: "Other",
    unknown: "Unknown",
  };
  return map[value] ?? "Unknown";
}
