const SECRET_KEY_RE =
  /(password|secret|token|api[_-]?key|authorization|cookie|hash|signature|private)/i;

export function stripSensitiveKeys(
  value: unknown,
  depth = 0,
): unknown {
  if (depth > 8) return undefined;
  if (Array.isArray(value)) {
    return value.map((item) => stripSensitiveKeys(item, depth + 1));
  }
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (SECRET_KEY_RE.test(key) && key !== "evidenceHash" && key !== "requestHash") {
        continue;
      }
      output[key] = stripSensitiveKeys(nested, depth + 1);
    }
    return output;
  }
  return value;
}

export function buildExportMetadata(input: {
  requestId: string;
  exportKind: "access" | "portability";
  organizationId: string;
  websiteId: string | null;
  jurisdiction: string;
  generatedAt: Date;
  categories: string[];
}) {
  return {
    requestId: input.requestId,
    exportKind: input.exportKind,
    generatedAt: input.generatedAt.toISOString(),
    organizationId: input.organizationId,
    websiteId: input.websiteId,
    jurisdiction: input.jurisdiction,
    dataCategories: input.categories,
    layers: {
      currentOperationalData: true,
      historicalConsentEvidence: input.exportKind === "access",
    },
    portableClaim: input.exportKind === "portability"
      ? "Structured current preference/consent state only. Not a claim that every CMP record is legally portable."
      : "Access package for operator review. Scope is CMP-held data for the matched identifiers.",
  };
}
