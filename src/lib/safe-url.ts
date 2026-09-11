const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const RGB_COLOR_RE =
  /^rgba?\(\s*(?:\d{1,3}%?\s*,\s*){2}\d{1,3}%?(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/;

export function sanitizeHttpUrl(value: string | null | undefined, maxLength = 2048): string {
  const trimmed = String(value ?? "").trim();
  if (!trimmed || trimmed.length > maxLength) return "";
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "";
    if (parsed.username || parsed.password) return "";
    if (parsed.protocol === "http:" && !isLoopbackHostname(parsed.hostname)) {
      // Production notices should be https; allow http only for local previews.
      if (process.env.NODE_ENV === "production") return "";
    }
    return parsed.href;
  } catch {
    return "";
  }
}

export function sanitizeCssColor(value: string | null | undefined): string {
  const trimmed = String(value ?? "").trim();
  if (HEX_COLOR_RE.test(trimmed)) return trimmed;
  if (RGB_COLOR_RE.test(trimmed)) return trimmed;
  return "";
}

export function isLoopbackHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "0.0.0.0";
}
