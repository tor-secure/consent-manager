export const GRIEVANCE_CATEGORY_OPTIONS = [
  { value: "consent_violation", label: "Consent Violation" },
  { value: "data_breach", label: "Data Breach Incident" },
  { value: "unauthorized_processing", label: "Unauthorized Data Processing" },
  { value: "rights_not_honored", label: "Data Principal Rights Not Honored" },
  { value: "data_quality", label: "Data Quality / Inaccuracy" },
  { value: "excessive_collection", label: "Excessive Data Collection" },
  { value: "retention_violation", label: "Data Retention Violation" },
  { value: "unauthorized_sharing", label: "Unauthorized Third-Party Sharing" },
  { value: "children_data", label: "Children's Data Violation" },
  { value: "cross_border", label: "Cross-Border Transfer Violation" },
  { value: "other", label: "Other" },
] as const;

export const DPDP_REQUEST_TYPE_OPTIONS = [
  { value: "access", label: "Right to Access (Section 11)" },
  { value: "erasure", label: "Right to Erasure/Deletion (Section 12)" },
  { value: "correction", label: "Right to Correction/Rectification (Section 11)" },
  { value: "portability", label: "Right to Data Portability (Section 11)" },
  { value: "objection", label: "Right to Object (Section 11)" },
  { value: "restriction", label: "Right to Restrict Processing (Section 11)" },
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

const GRIEVANCE_CATEGORY_VALUES = new Set(
  GRIEVANCE_CATEGORY_OPTIONS.map((option) => option.value),
);
const DATA_CATEGORY_VALUES = new Set(
  DATA_CATEGORY_OPTIONS.map((option) => option.value),
);
const LANGUAGE_VALUES = new Set(
  PREFERRED_LANGUAGE_OPTIONS.map((option) => option.value),
);

export type GrievanceCategoryValue = (typeof GRIEVANCE_CATEGORY_OPTIONS)[number]["value"];
export type DataCategoryValue = (typeof DATA_CATEGORY_OPTIONS)[number]["value"];
export type PreferredLanguageValue = (typeof PREFERRED_LANGUAGE_OPTIONS)[number]["value"];

export function sanitizeGrievanceCategory(value: unknown): GrievanceCategoryValue | null {
  const key = String(value ?? "").trim();
  return GRIEVANCE_CATEGORY_VALUES.has(key as GrievanceCategoryValue)
    ? (key as GrievanceCategoryValue)
    : null;
}

export function grievanceCategoryLabel(value: string): string {
  return GRIEVANCE_CATEGORY_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

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
  grievanceCategory?: string | null;
  priorCommunication?: string;
}): string {
  const extras: string[] = [];
  if (input.grievanceCategory) {
    extras.push(`Grievance category: ${grievanceCategoryLabel(input.grievanceCategory)}`);
  }
  const identityProof = input.identityProof?.trim();
  if (identityProof) extras.push(`Identity proof: ${identityProof}`);
  const priorCommunication = input.priorCommunication?.trim();
  if (priorCommunication) extras.push(`Prior communication: ${priorCommunication}`);
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
