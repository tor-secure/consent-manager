export function postgresErrorCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (let i = 0; i < 5 && current && typeof current === "object"; i += 1) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string" && /^\w{5}$/.test(code)) return code;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

/** Missing table (42P01) or missing column (42703) on an older production database. */
export function isSchemaMismatchError(error: unknown): boolean {
  const code = postgresErrorCode(error);
  return code === "42703" || code === "42P01";
}
