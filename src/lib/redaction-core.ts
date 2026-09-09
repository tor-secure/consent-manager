export type RedactionFieldRule = {
  path: string;
  purposeKeys?: string[];
  dataCategories?: string[];
  essential?: boolean;
};

export type RedactionPolicy = {
  fields: RedactionFieldRule[];
};

export type RedactionConsent = {
  allowedPurposeKeys: ReadonlySet<string>;
  allowedDataCategories: ReadonlySet<string>;
};

export type RedactionResult<T = unknown> = {
  value: T;
  removedPaths: string[];
};

const KEY_RE = /^[A-Za-z0-9_-]{1,100}$/;
const PATH_RE = /^[A-Za-z0-9_-]+(?:\.(?:[A-Za-z0-9_-]+|\*))*$/;

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function validateRedactionPolicy(
  input: unknown,
): { ok: true; policy: RedactionPolicy } | { ok: false; message: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, message: "policy must be an object" };
  }
  const fields = (input as Record<string, unknown>).fields;
  if (!Array.isArray(fields) || fields.length > 200) {
    return { ok: false, message: "policy.fields must contain at most 200 rules" };
  }
  const parsed: RedactionFieldRule[] = [];
  for (const item of fields) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return { ok: false, message: "Each redaction rule must be an object" };
    }
    const row = item as Record<string, unknown>;
    if (typeof row.path !== "string" || !PATH_RE.test(row.path) || row.path.length > 300) {
      return { ok: false, message: "Redaction rule path is invalid" };
    }
    const purposes = readKeys(row.purposeKeys);
    const categories = readKeys(row.dataCategories);
    if (!purposes.ok || !categories.ok || typeof row.essential !== "undefined" && typeof row.essential !== "boolean") {
      return { ok: false, message: "Redaction rule conditions are invalid" };
    }
    if (row.essential !== true && purposes.values.length === 0 && categories.values.length === 0) {
      return { ok: false, message: "Every field requires consent or explicit essential access" };
    }
    parsed.push({
      path: row.path,
      purposeKeys: purposes.values,
      dataCategories: categories.values,
      essential: row.essential === true,
    });
  }
  return { ok: true, policy: { fields: parsed } };
}

function readKeys(input: unknown): { ok: boolean; values: string[] } {
  if (input === undefined) return { ok: true, values: [] };
  if (!Array.isArray(input) || input.length > 50) return { ok: false, values: [] };
  const values = input.filter((value): value is string => typeof value === "string");
  if (values.length !== input.length || values.some((value) => !KEY_RE.test(value))) {
    return { ok: false, values: [] };
  }
  return { ok: true, values: values.map(normalize) };
}

export function redactValue<T>(
  value: T,
  policy: RedactionPolicy,
  consent: RedactionConsent,
): RedactionResult<unknown> {
  const rules = policy.fields.map((rule) => ({
    ...rule,
    segments: rule.path.split("."),
  }));
  const removedPaths: string[] = [];

  function visit(current: unknown, segments: string[], displayPath: string): unknown {
    if (Array.isArray(current)) {
      return current.map((item, index) =>
        visit(item, [...segments, "*"], `${displayPath}[${index}]`),
      );
    }
    if (!current || typeof current !== "object") return current;

    const output: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(current)) {
      const childSegments = [...segments, key];
      const childPath = displayPath ? `${displayPath}.${key}` : key;
      const exact = rules.find((rule) => pathsEqual(rule.segments, childSegments));
      if (exact) {
        if (ruleAllowed(exact, consent)) output[key] = child;
        else removedPaths.push(childPath);
        continue;
      }
      const hasDescendant = rules.some((rule) => pathPrefix(childSegments, rule.segments));
      if (hasDescendant && child && typeof child === "object") {
        output[key] = visit(child, childSegments, childPath);
      } else {
        removedPaths.push(childPath);
      }
    }
    return output;
  }

  return { value: visit(value, [], "") as unknown, removedPaths };
}

function pathsEqual(rule: string[], actual: string[]): boolean {
  return rule.length === actual.length && rule.every((part, i) => part === "*" || part === actual[i]);
}

function pathPrefix(actual: string[], rule: string[]): boolean {
  return actual.length < rule.length && actual.every((part, i) => rule[i] === "*" || rule[i] === part);
}

function ruleAllowed(
  rule: RedactionFieldRule,
  consent: RedactionConsent,
): boolean {
  if (rule.essential) return true;
  const purposes = rule.purposeKeys ?? [];
  const categories = rule.dataCategories ?? [];
  return purposes.every((key) => consent.allowedPurposeKeys.has(normalize(key))) &&
    categories.every((key) => consent.allowedDataCategories.has(normalize(key)));
}
