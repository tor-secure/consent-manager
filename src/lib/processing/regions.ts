const EEA = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU",
  "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES",
  "SE", "IS", "LI", "NO", "EU", "EEA",
]);

export type TransferRegion = "eea" | "uk" | "us" | "in" | "other";

export function normalizeCountry(value: string | null | undefined): string {
  return String(value ?? "").trim().toUpperCase();
}

export function regionOf(countryOrRegion: string | null | undefined): TransferRegion | null {
  const key = normalizeCountry(countryOrRegion);
  if (!key) return null;
  if (key === "UK" || key === "GB") return "uk";
  if (key === "US" || key === "USA") return "us";
  if (key === "IN" || key === "INDIA") return "in";
  if (EEA.has(key)) return "eea";
  return "other";
}

export function locationsSuggestTransfer(
  websiteRegion: string | null | undefined,
  locations: Array<string | null | undefined>,
): boolean {
  const source = regionOf(websiteRegion);
  if (!source) {
    return locations.some((item) => normalizeCountry(item).length > 0);
  }
  return locations.some((item) => {
    const dest = regionOf(item);
    return dest !== null && dest !== source;
  });
}

export function transferRecordComplete(input: {
  destinationCountry: string | null | undefined;
  destinationRegion: string | null | undefined;
  mechanism: string | null | undefined;
}): boolean {
  const destination =
    normalizeCountry(input.destinationCountry) ||
    String(input.destinationRegion ?? "").trim();
  const mechanism = String(input.mechanism ?? "").trim();
  return destination.length > 0 && mechanism.length > 0 && mechanism !== "not_configured";
}
