const BLOCKED_KEYS =
  /(^|_)(consent(id|record)?|email|phone|name|address|ip(address)?|user(agent|id)?|cookie|raw|payload|event)(_|$)/i;

const SENSITIVE_VALUE =
  /(?:\b(?:\d{1,3}\.){3}\d{1,3}\b|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|bearer\s+\S+|cookie\s*[:=])/i;

export type SafeIntelligenceContext = Record<
  string,
  string | number | boolean | null | Array<string | number | boolean | null>
>;

/**
 * Produces a shallow, bounded aggregate context for an AI provider. Identifiers,
 * event bodies and likely personal data are dropped rather than redacted.
 */
export function minimizeAiContext(input: Record<string, unknown>): SafeIntelligenceContext {
  const safe: SafeIntelligenceContext = {};
  for (const [key, value] of Object.entries(input).slice(0, 80)) {
    if (BLOCKED_KEYS.test(key)) continue;
    if (typeof value === "number" && Number.isFinite(value)) safe[key] = value;
    else if (typeof value === "boolean" || value === null) safe[key] = value as boolean | null;
    else if (typeof value === "string" && value.length <= 240 && !SENSITIVE_VALUE.test(value)) {
      safe[key] = value;
    } else if (
      Array.isArray(value) &&
      value.length <= 30 &&
      value.every(
        (item) =>
          item === null ||
          typeof item === "boolean" ||
          (typeof item === "number" && Number.isFinite(item)) ||
          (typeof item === "string" && item.length <= 120 && !SENSITIVE_VALUE.test(item)),
      )
    ) {
      safe[key] = value as Array<string | number | boolean | null>;
    }
  }
  return safe;
}
