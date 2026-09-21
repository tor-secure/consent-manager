export const DPDP_REQUEST_TYPE_OPTIONS = [
  { value: "access", label: "Access my personal data" },
  { value: "correction", label: "Correct my personal data" },
  { value: "erasure", label: "Erase / delete my personal data" },
  { value: "portability", label: "Receive a copy of my data (portability)" },
  { value: "withdraw_consent", label: "Withdraw consent" },
  { value: "grievance", label: "File a grievance" },
  { value: "nomination", label: "Nominate another person" },
] as const;

export const DATA_CATEGORY_OPTIONS = [
  { value: "personal_information", label: "Personal Information" },
  { value: "financial_data", label: "Financial Data" },
  { value: "health_data", label: "Health Data" },
  { value: "location_data", label: "Location Data" },
  { value: "communication_data", label: "Communication Data" },
  { value: "behavioural_data", label: "Behavioural Data" },
  { value: "biometric_data", label: "Biometric Data" },
  { value: "other", label: "Other" },
] as const;

export const PREFERRED_LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "bn", label: "Bengali" },
  { value: "ta", label: "Tamil" },
  { value: "te", label: "Telugu" },
  { value: "mr", label: "Marathi" },
  { value: "gu", label: "Gujarati" },
  { value: "kn", label: "Kannada" },
  { value: "ml", label: "Malayalam" },
  { value: "pa", label: "Punjabi" },
  { value: "or", label: "Odia" },
  { value: "as", label: "Assamese" },
  { value: "ur", label: "Urdu" },
  { value: "ne", label: "Nepali" },
  { value: "sa", label: "Sanskrit" },
  { value: "kok", label: "Konkani" },
  { value: "mai", label: "Maithili" },
  { value: "doi", label: "Dogri" },
  { value: "ks", label: "Kashmiri" },
  { value: "sd", label: "Sindhi" },
  { value: "sat", label: "Santali" },
  { value: "mni", label: "Manipuri" },
  { value: "brx", label: "Bodo" },
] as const;

const DATA_CATEGORY_VALUES = new Set(
  DATA_CATEGORY_OPTIONS.map((option) => option.value),
);
const LANGUAGE_VALUES = new Set(
  PREFERRED_LANGUAGE_OPTIONS.map((option) => option.value),
);

export type DataCategoryValue = (typeof DATA_CATEGORY_OPTIONS)[number]["value"];
export type PreferredLanguageValue = (typeof PREFERRED_LANGUAGE_OPTIONS)[number]["value"];

export function sanitizeDataCategories(value: unknown): DataCategoryValue[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<DataCategoryValue>();
  for (const item of value) {
    const key = String(item ?? "").trim();
    if (DATA_CATEGORY_VALUES.has(key as DataCategoryValue)) {
      seen.add(key as DataCategoryValue);
    }
  }
  return [...seen];
}

export function sanitizePreferredLanguage(value: unknown): PreferredLanguageValue {
  const key = String(value ?? "").trim();
  return LANGUAGE_VALUES.has(key as PreferredLanguageValue)
    ? (key as PreferredLanguageValue)
    : "en";
}

export function dataCategoryLabels(values: string[]): string[] {
  const map = new Map<string, string>(
    DATA_CATEGORY_OPTIONS.map((option) => [option.value, option.label]),
  );
  return values.map((value) => map.get(value) ?? value);
}

export function languageLabel(value: string): string {
  return PREFERRED_LANGUAGE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function buildIntakeDescription(input: {
  description: string;
  identityProof?: string;
  dataCategories?: string[];
  preferredLanguage?: string;
}): string {
  const extras: string[] = [];
  const identityProof = input.identityProof?.trim();
  if (identityProof) extras.push(`Identity proof: ${identityProof}`);
  const categories = dataCategoryLabels(input.dataCategories ?? []);
  if (categories.length) extras.push(`Data categories: ${categories.join(", ")}`);
  if (input.preferredLanguage) {
    extras.push(`Preferred language: ${languageLabel(input.preferredLanguage)}`);
  }
  if (extras.length === 0) return input.description;
  return `${input.description}\n\n---\n${extras.join("\n")}`;
}

export function normalizeTicketId(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function requestHostFromHeaders(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-host");
  const raw = (forwarded ?? request.headers.get("host") ?? "").split(",")[0]?.trim() ?? "";
  return raw.replace(/:\d+$/, "").replace(/^\[|\]$/g, "").toLowerCase();
}

export function domainLookupCandidates(host: string): string[] {
  const trimmed = host.trim().toLowerCase().replace(/:\d+$/, "").replace(/^\[|\]$/g, "");
  if (!trimmed) return [];
  const bare = trimmed.replace(/^www\./, "");
  return [...new Set([trimmed, bare, `www.${bare}`])];
}
