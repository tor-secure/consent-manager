/**
 * Pure helpers for consent-revocation confirmation emails.
 * No DB/Nodemailer imports — safe to unit-test without a mail transport.
 */

export type DecisionSnapshot = {
  purposeId: string | null;
  vendorId: string | null;
  granted: boolean;
};

export type RevokedItem = {
  kind: "purpose" | "vendor";
  id: string;
  name: string;
};

export type PreferenceChangeItem = RevokedItem & {
  change: "revoked" | "granted";
};

export type SubjectIdentity = {
  email: string;
  verifiedAt: string;
  source: "api_key" | "dsar_verified" | "clerk_session";
};

export type RevocationMailBookkeeping = {
  /** Dedupe keys already claimed or sent for this consent record. */
  keys: string[];
  /** Last skip/send outcome (no secrets or full email). */
  lastOutcome?: {
    at: string;
    status: "sent" | "skipped" | "failed";
    reason?: string;
    dedupeKey: string;
  };
};

/** Preference change queued until a trusted email is bound to the consent. */
export type PendingPreferenceMail = {
  dedupeKey: string;
  stateVersion: number;
  revokedAt: string;
  items: PreferenceChangeItem[];
};

const EMAIL_RE =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (!email || email.length > 320 || !EMAIL_RE.test(email)) return null;
  return email;
}

export function decisionKey(row: Pick<DecisionSnapshot, "purposeId" | "vendorId">): string | null {
  if (row.purposeId) return `purpose:${row.purposeId}`;
  if (row.vendorId) return `vendor:${row.vendorId}`;
  return null;
}

function toDecisionRef(
  row: DecisionSnapshot,
): { kind: "purpose" | "vendor"; id: string } | null {
  if (row.purposeId) return { kind: "purpose", id: row.purposeId };
  if (row.vendorId) return { kind: "vendor", id: row.vendorId };
  return null;
}

/**
 * Any purpose/vendor grant flip (revoked or newly granted).
 * Unchanged rows and first-time creates with no prior decisions yield [].
 */
export function diffPreferenceChanges(
  previous: DecisionSnapshot[],
  next: DecisionSnapshot[],
): Array<{ kind: "purpose" | "vendor"; id: string; change: "revoked" | "granted" }> {
  const prevMap = new Map<string, boolean>();
  const refs = new Map<string, { kind: "purpose" | "vendor"; id: string }>();

  for (const row of previous) {
    const key = decisionKey(row);
    const ref = toDecisionRef(row);
    if (!key || !ref) continue;
    prevMap.set(key, row.granted);
    refs.set(key, ref);
  }
  for (const row of next) {
    const key = decisionKey(row);
    const ref = toDecisionRef(row);
    if (!key || !ref) continue;
    refs.set(key, ref);
  }

  const changes: Array<{ kind: "purpose" | "vendor"; id: string; change: "revoked" | "granted" }> =
    [];
  for (const row of next) {
    const key = decisionKey(row);
    const ref = key ? refs.get(key) : null;
    if (!key || !ref) continue;
    const wasGranted = prevMap.has(key) ? Boolean(prevMap.get(key)) : null;
    // No prior decision row: only notify for a new grant on an existing record
    // when previous had some decisions (handled by caller via empty previous → []).
    if (wasGranted === null) {
      if (previous.length > 0 && row.granted) {
        changes.push({ ...ref, change: "granted" });
      }
      continue;
    }
    if (wasGranted && !row.granted) changes.push({ ...ref, change: "revoked" });
    if (!wasGranted && row.granted) changes.push({ ...ref, change: "granted" });
  }

  // Previously present grants missing from next count as revoked.
  for (const [key, wasGranted] of prevMap) {
    if (!wasGranted) continue;
    const stillPresent = next.some((row) => decisionKey(row) === key);
    if (stillPresent) continue;
    const ref = refs.get(key);
    if (ref) changes.push({ ...ref, change: "revoked" });
  }

  changes.sort((a, b) =>
    `${a.change}:${a.kind}:${a.id}`.localeCompare(`${b.change}:${b.kind}:${b.id}`),
  );
  return changes;
}

/**
 * Items that were previously granted and are now not granted.
 * Initial rejection (no prior grants) yields an empty list.
 */
export function diffRevokedDecisions(
  previous: DecisionSnapshot[],
  next: DecisionSnapshot[],
): Array<{ kind: "purpose" | "vendor"; id: string }> {
  return diffPreferenceChanges(previous, next)
    .filter((item) => item.change === "revoked")
    .map(({ kind, id }) => ({ kind, id }));
}

export function nameRevokedItems(
  revoked: Array<{ kind: "purpose" | "vendor"; id: string }>,
  names: { purposes: Record<string, string>; vendors: Record<string, string> },
): RevokedItem[] {
  return revoked.map((item) => ({
    ...item,
    name:
      item.kind === "purpose"
        ? names.purposes[item.id] || item.id
        : names.vendors[item.id] || item.id,
  }));
}

export function namePreferenceChanges(
  changes: Array<{ kind: "purpose" | "vendor"; id: string; change: "revoked" | "granted" }>,
  names: { purposes: Record<string, string>; vendors: Record<string, string> },
): PreferenceChangeItem[] {
  return changes.map((item) => ({
    ...item,
    name:
      item.kind === "purpose"
        ? names.purposes[item.id] || item.id
        : names.vendors[item.id] || item.id,
  }));
}

export function buildRevocationDedupeKey(input: {
  consentId: string;
  stateVersion: number;
  revoked: Array<{ kind: "purpose" | "vendor"; id: string }>;
  granted?: Array<{ kind: "purpose" | "vendor"; id: string }>;
}): string {
  const revokedParts = input.revoked.map((item) => `revoked:${item.kind}:${item.id}`);
  const grantedParts = (input.granted ?? []).map(
    (item) => `granted:${item.kind}:${item.id}`,
  );
  const parts = [...revokedParts, ...grantedParts].sort();
  return `${input.consentId}:v${input.stateVersion}:${parts.join(",")}`;
}

export function readSubjectIdentity(
  metadata: Record<string, unknown> | null | undefined,
): SubjectIdentity | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const subject = metadata.subject;
  if (!subject || typeof subject !== "object" || Array.isArray(subject)) return null;
  const record = subject as Record<string, unknown>;
  const email = normalizeEmail(record.email);
  if (!email) return null;
  const verifiedAt =
    typeof record.verifiedAt === "string" && record.verifiedAt.trim()
      ? record.verifiedAt.trim()
      : null;
  if (!verifiedAt) return null;
  const source =
    record.source === "api_key" ||
    record.source === "dsar_verified" ||
    record.source === "clerk_session"
      ? record.source
      : null;
  if (!source) return null;
  return { email, verifiedAt, source };
}

export function withSubjectIdentity(
  metadata: Record<string, unknown> | null | undefined,
  identity: SubjectIdentity,
): Record<string, unknown> {
  const base =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? { ...metadata }
      : {};
  return {
    ...base,
    subject: {
      email: identity.email,
      verifiedAt: identity.verifiedAt,
      source: identity.source,
    },
  };
}

/** Preserve trusted subject binding when consent evidence metadata is rewritten. */
export function preserveSubjectMetadata(
  nextMetadata: Record<string, unknown>,
  previousMetadata: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const existing = readSubjectIdentity(previousMetadata);
  if (!existing) return nextMetadata;
  if (readSubjectIdentity(nextMetadata)) return nextMetadata;
  return withSubjectIdentity(nextMetadata, existing);
}

export function readRevocationMailBookkeeping(
  metadata: Record<string, unknown> | null | undefined,
): RevocationMailBookkeeping {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return { keys: [] };
  }
  const raw = metadata.revocationMail;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { keys: [] };
  const record = raw as Record<string, unknown>;
  const keys = Array.isArray(record.keys)
    ? record.keys.filter((key): key is string => typeof key === "string").slice(0, 100)
    : [];
  let lastOutcome: RevocationMailBookkeeping["lastOutcome"];
  const outcome = record.lastOutcome;
  if (outcome && typeof outcome === "object" && !Array.isArray(outcome)) {
    const row = outcome as Record<string, unknown>;
    if (
      typeof row.at === "string" &&
      typeof row.dedupeKey === "string" &&
      (row.status === "sent" || row.status === "skipped" || row.status === "failed")
    ) {
      lastOutcome = {
        at: row.at,
        status: row.status,
        dedupeKey: row.dedupeKey,
        reason: typeof row.reason === "string" ? row.reason : undefined,
      };
    }
  }
  return { keys, lastOutcome };
}

export function readPendingPreferenceMail(
  metadata: Record<string, unknown> | null | undefined,
): PendingPreferenceMail | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const raw = metadata.pendingPreferenceMail;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  const dedupeKey = typeof record.dedupeKey === "string" ? record.dedupeKey.trim() : "";
  const stateVersion = Number(record.stateVersion);
  const revokedAt = typeof record.revokedAt === "string" ? record.revokedAt : "";
  if (!dedupeKey || !Number.isInteger(stateVersion) || stateVersion < 1 || !revokedAt) {
    return null;
  }
  if (!Array.isArray(record.items) || record.items.length === 0) return null;
  const items: PreferenceChangeItem[] = [];
  for (const entry of record.items.slice(0, 100)) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const row = entry as Record<string, unknown>;
    if (row.kind !== "purpose" && row.kind !== "vendor") continue;
    if (row.change !== "revoked" && row.change !== "granted") continue;
    if (typeof row.id !== "string" || !row.id.trim()) continue;
    if (typeof row.name !== "string" || !row.name.trim()) continue;
    items.push({
      kind: row.kind,
      id: row.id.trim(),
      name: row.name.trim().slice(0, 200),
      change: row.change,
    });
  }
  if (items.length === 0) return null;
  return { dedupeKey, stateVersion, revokedAt, items };
}

export function withPendingPreferenceMail(
  metadata: Record<string, unknown> | null | undefined,
  pending: PendingPreferenceMail | null,
): Record<string, unknown> {
  const base =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? { ...metadata }
      : {};
  if (!pending) {
    delete base.pendingPreferenceMail;
    return base;
  }
  return {
    ...base,
    pendingPreferenceMail: {
      dedupeKey: pending.dedupeKey,
      stateVersion: pending.stateVersion,
      revokedAt: pending.revokedAt,
      items: pending.items.map((item) => ({
        kind: item.kind,
        id: item.id,
        name: item.name,
        change: item.change,
      })),
    },
  };
}

export function hasRevocationMailKey(
  metadata: Record<string, unknown> | null | undefined,
  dedupeKey: string,
): boolean {
  return readRevocationMailBookkeeping(metadata).keys.includes(dedupeKey);
}

export function withRevocationMailOutcome(
  metadata: Record<string, unknown> | null | undefined,
  input: {
    dedupeKey: string;
    status: "sent" | "skipped" | "failed";
    reason?: string;
    at?: Date;
    claimKey?: boolean;
  },
): Record<string, unknown> {
  const base =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? { ...metadata }
      : {};
  const prior = readRevocationMailBookkeeping(base);
  const keys =
    input.claimKey === false
      ? prior.keys
      : prior.keys.includes(input.dedupeKey)
        ? prior.keys
        : [...prior.keys, input.dedupeKey].slice(-50);
  return {
    ...base,
    revocationMail: {
      keys,
      lastOutcome: {
        at: (input.at ?? new Date()).toISOString(),
        status: input.status,
        reason: input.reason,
        dedupeKey: input.dedupeKey,
      },
    },
  };
}

export function formatRevocationTimestamp(at: Date, timeZone = "UTC"): string {
  try {
    const formatted = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      dateStyle: "medium",
      timeStyle: "long",
      timeZoneName: "short",
    }).format(at);
    return formatted;
  } catch {
    return `${at.toISOString()} (UTC)`;
  }
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildPrivacyPreferencesUrl(input: {
  appOrigin: string;
  siteKey: string;
}): string | null {
  const origin = input.appOrigin.trim().replace(/\/$/, "");
  const siteKey = input.siteKey.trim();
  if (!origin || !siteKey) return null;
  try {
    const url = new URL("/privacy-center/consent-preferences", origin);
    url.searchParams.set("siteKey", siteKey);
    return url.toString();
  } catch {
    return null;
  }
}

export function buildRevocationEmailContent(input: {
  websiteName: string;
  revokedAt: Date;
  timeZone?: string;
  items: RevokedItem[] | PreferenceChangeItem[];
  preferencesUrl?: string | null;
}): { subject: string; text: string; html: string } {
  const when = formatRevocationTimestamp(input.revokedAt, input.timeZone ?? "UTC");
  const changes: PreferenceChangeItem[] = input.items.map((item) =>
    "change" in item && (item.change === "revoked" || item.change === "granted")
      ? (item as PreferenceChangeItem)
      : { ...item, change: "revoked" as const },
  );
  const revoked = changes.filter((item) => item.change === "revoked");
  const granted = changes.filter((item) => item.change === "granted");

  const formatLine = (item: PreferenceChangeItem) => {
    const label = item.kind === "purpose" ? "Purpose" : "Vendor";
    return `- ${label}: ${item.name}`;
  };
  const formatHtml = (item: PreferenceChangeItem) => {
    const label = item.kind === "purpose" ? "Purpose" : "Vendor";
    return `<li><strong>${escapeHtml(label)}:</strong> ${escapeHtml(item.name)}</li>`;
  };

  const subject = "Your consent preferences have been updated";
  const prefsLine = input.preferencesUrl
    ? `You can review your current choices in your privacy settings: ${input.preferencesUrl}`
    : "You can review your current choices in your privacy settings.";

  const textSections: string[] = [
    `Your consent preferences were updated for ${input.websiteName} on ${when}.`,
    "",
  ];
  if (revoked.length > 0) {
    textSections.push(
      "Your consent for the following purposes or vendors was revoked:",
      ...revoked.map(formatLine),
      "",
    );
  }
  if (granted.length > 0) {
    textSections.push(
      "Your consent for the following purposes or vendors was granted:",
      ...granted.map(formatLine),
      "",
    );
  }
  if (revoked.length > 0) {
    textSections.push(
      "A revocation confirmation means your stored preference was updated to revoked. It does not by itself confirm that historical data was deleted or that every downstream processor has already stopped processing.",
      "",
    );
  }
  textSections.push(prefsLine);

  const prefsHtml = input.preferencesUrl
    ? `<p>You can review your current choices in your <a href="${escapeHtml(input.preferencesUrl)}">privacy settings</a>.</p>`
    : `<p>You can review your current choices in your privacy settings.</p>`;

  const htmlSections: string[] = [
    `<p>Your consent preferences were updated for <strong>${escapeHtml(input.websiteName)}</strong> on <strong>${escapeHtml(when)}</strong>.</p>`,
  ];
  if (revoked.length > 0) {
    htmlSections.push(
      `<p>Your consent for the following purposes or vendors was revoked:</p>`,
      `<ul>${revoked.map(formatHtml).join("")}</ul>`,
    );
  }
  if (granted.length > 0) {
    htmlSections.push(
      `<p>Your consent for the following purposes or vendors was granted:</p>`,
      `<ul>${granted.map(formatHtml).join("")}</ul>`,
    );
  }
  if (revoked.length > 0) {
    htmlSections.push(
      `<p>A revocation confirmation means your stored preference was updated to revoked. It does not by itself confirm that historical data was deleted or that every downstream processor has already stopped processing.</p>`,
    );
  }
  htmlSections.push(prefsHtml);

  return { subject, text: textSections.join("\n"), html: htmlSections.join("\n") };
}

export function emailDomainHint(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 0) return "[redacted]";
  return `***@${email.slice(at + 1)}`;
}
