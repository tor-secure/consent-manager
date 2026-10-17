import { ADMIN_ROLE, MEMBER_ROLE } from "../org-roles";

/** Operator access requires an allowlisted address and a verified email from the IdP. */
export function resolveLearningRole(email: string, emailVerified: boolean, allowlist: Iterable<string>): string {
  if (!emailVerified) return MEMBER_ROLE;
  const normalized = email.trim().toLowerCase();
  if (!normalized) return MEMBER_ROLE;
  const allowed = allowlist instanceof Set ? allowlist : new Set(
    [...allowlist].map((item) => item.trim().toLowerCase()).filter(Boolean),
  );
  return allowed.has(normalized) ? ADMIN_ROLE : MEMBER_ROLE;
}

export function parseOperatorEmailAllowlist(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}
