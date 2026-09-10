export function postgresErrorCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (let i = 0; i < 5 && current && typeof current === "object"; i += 1) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string" && /^\w{5}$/.test(code)) return code;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

function errorText(error: unknown): string {
  let current: unknown = error;
  const parts: string[] = [];
  for (let i = 0; i < 5 && current; i += 1) {
    if (current instanceof Error) parts.push(`${current.name} ${current.message}`);
    else if (typeof current === "object") {
      const code = (current as { code?: unknown }).code;
      const message = (current as { message?: unknown }).message;
      if (typeof code === "string") parts.push(code);
      if (typeof message === "string") parts.push(message);
      current = (current as { cause?: unknown }).cause;
      continue;
    }
    break;
  }
  return parts.join(" ");
}

/** Missing table (42P01) or missing column (42703) on an older production database. */
export function isSchemaMismatchError(error: unknown): boolean {
  const code = postgresErrorCode(error);
  return code === "42703" || code === "42P01";
}

export function isDatabaseUnreachableError(error: unknown): boolean {
  const text = errorText(error);
  return /ENOTFOUND|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|getaddrinfo|connect ECONN/i.test(text);
}

export function policyValidationFailureMessage(error: unknown): string {
  if (isDatabaseUnreachableError(error)) {
    return "Cannot reach the database. Jio DNS is blocking Neon. Set Windows DNS to 8.8.8.8 and 1.1.1.1, flush DNS, then retry.";
  }
  if (isSchemaMismatchError(error)) {
    return "Policy validation needs vendor role / processing columns. After DNS works, run npm run db:ensure-schema, then reload this page.";
  }
  return "Unable to validate this policy.";
}
