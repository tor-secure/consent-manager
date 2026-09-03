export const INTERACTION_EVENT_TYPES = [
  "consent.created",
  "consent.updated",
  "consent.expired_and_renewed",
  "consent.withdrawn",
] as const;

export const CHOICE_EVENT_TYPES = [
  "consent.created",
  "consent.updated",
  "consent.expired_and_renewed",
] as const;

export type ConsentOutcomeStatus =
  | "accepted"
  | "rejected"
  | "partial"
  | "withdrawn"
  | "pending"
  | string;

export type InteractionEvent = {
  id: string;
  eventType: string;
  choice?: string | null;
  occurredAt: Date;
  consentRecordId: string;
};

export type ConsentRecordSnapshot = {
  id: string;
  status: ConsentOutcomeStatus;
  createdAt: Date;
  country?: string | null;
  device?: string | null;
  browser?: string | null;
  policyVersionId?: string | null;
  websiteId?: string | null;
};

export function uniqueById<T extends { id: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of rows) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
  }
  return out;
}

export function rate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export function summarizeOutcomes(records: ConsentRecordSnapshot[]) {
  const unique = uniqueById(records);
  const total = unique.length;
  let accepted = 0;
  let rejected = 0;
  let partial = 0;
  let withdrawn = 0;
  let pending = 0;
  for (const row of unique) {
    if (row.status === "accepted") accepted += 1;
    else if (row.status === "rejected") rejected += 1;
    else if (row.status === "partial") partial += 1;
    else if (row.status === "withdrawn") withdrawn += 1;
    else if (row.status === "pending") pending += 1;
  }
  return {
    total,
    accepted,
    rejected,
    partial,
    withdrawn,
    pending,
    acceptRate: rate(accepted, total),
    rejectRate: rate(rejected, total),
    granularRate: rate(partial, total),
    withdrawalRate: rate(withdrawn, total),
    consentRate: rate(accepted + partial, total),
  };
}

export function summarizeInteractions(events: InteractionEvent[]) {
  const unique = uniqueById(events);
  const interactions = unique.filter((event) =>
    (INTERACTION_EVENT_TYPES as readonly string[]).includes(event.eventType),
  );
  const choiceEvents = unique.filter((event) =>
    (CHOICE_EVENT_TYPES as readonly string[]).includes(event.eventType),
  );
  const acceptAll = choiceEvents.filter((event) => event.choice === "accept-all").length;
  const rejectAll = choiceEvents.filter((event) => event.choice === "reject-all").length;
  const granular = choiceEvents.filter((event) => event.choice === "granular").length;
  const withdrawals = interactions.filter((event) => event.eventType === "consent.withdrawn").length;
  return {
    interactions: interactions.length,
    choiceEvents: choiceEvents.length,
    acceptAll,
    rejectAll,
    granular,
    withdrawals,
    acceptAllRate: rate(acceptAll, choiceEvents.length),
    rejectAllRate: rate(rejectAll, choiceEvents.length),
    granularRate: rate(granular, choiceEvents.length),
    withdrawalRate: rate(withdrawals, interactions.length),
  };
}

export function bucketTrendsByDay(events: InteractionEvent[]) {
  const unique = uniqueById(events);
  const buckets = new Map<
    string,
    { day: string; interactions: number; acceptAll: number; rejectAll: number; granular: number; withdrawals: number }
  >();
  for (const event of unique) {
    const day = event.occurredAt.toISOString().slice(0, 10);
    const current = buckets.get(day) ?? {
      day,
      interactions: 0,
      acceptAll: 0,
      rejectAll: 0,
      granular: 0,
      withdrawals: 0,
    };
    if ((INTERACTION_EVENT_TYPES as readonly string[]).includes(event.eventType)) {
      current.interactions += 1;
    }
    if (event.eventType === "consent.withdrawn") current.withdrawals += 1;
    if ((CHOICE_EVENT_TYPES as readonly string[]).includes(event.eventType)) {
      if (event.choice === "accept-all") current.acceptAll += 1;
      if (event.choice === "reject-all") current.rejectAll += 1;
      if (event.choice === "granular") current.granular += 1;
    }
    buckets.set(day, current);
  }
  return [...buckets.values()].sort((a, b) => a.day.localeCompare(b.day));
}

export function groupDimension(
  records: ConsentRecordSnapshot[],
  key: "country" | "device" | "browser" | "policyVersionId",
) {
  const unique = uniqueById(records);
  const groups = new Map<string, ConsentRecordSnapshot[]>();
  for (const row of unique) {
    const raw = row[key];
    const label = raw && String(raw).trim() ? String(raw) : "unknown";
    const list = groups.get(label) ?? [];
    list.push(row);
    groups.set(label, list);
  }
  return [...groups.entries()]
    .map(([dimension, rows]) => ({
      key: dimension,
      ...summarizeOutcomes(rows),
    }))
    .sort((a, b) => b.total - a.total);
}

const VISITOR_LEAK_KEYS = [
  "visitorId",
  "visitor_id",
  "ip",
  "ipAddress",
  "userAgent",
  "user_agent",
  "fingerprint",
  "consentId",
  "rawMetadata",
];

export function collectForbiddenAnalyticsKeys(value: unknown, path = ""): string[] {
  if (!value || typeof value !== "object") return [];
  const hits: string[] = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      hits.push(...collectForbiddenAnalyticsKeys(item, `${path}[${index}]`));
    });
    return hits;
  }
  for (const [key, nested] of Object.entries(value)) {
    const next = path ? `${path}.${key}` : key;
    if (VISITOR_LEAK_KEYS.includes(key)) hits.push(next);
    hits.push(...collectForbiddenAnalyticsKeys(nested, next));
  }
  return hits;
}

export function parseAnalyticsPeriod(input: {
  days?: string | null;
  from?: string | null;
  to?: string | null;
  now?: Date;
}): { since: Date | null; until: Date | null; label: string } {
  const now = input.now ?? new Date();
  if (input.from || input.to) {
    const since = input.from ? new Date(`${input.from}T00:00:00.000Z`) : null;
    const until = input.to ? new Date(`${input.to}T23:59:59.999Z`) : null;
    const validSince = since && !Number.isNaN(since.getTime()) ? since : null;
    const validUntil = until && !Number.isNaN(until.getTime()) ? until : null;
    return {
      since: validSince,
      until: validUntil,
      label: [input.from ?? "start", input.to ?? "now"].join(" → "),
    };
  }
  if (!input.days || input.days === "all") {
    return { since: null, until: null, label: "All time" };
  }
  const n = Number.parseInt(input.days, 10);
  const days = Number.isFinite(n) && n > 0 ? Math.min(n, 365) : 30;
  const since = new Date(now.getTime());
  since.setUTCDate(since.getUTCDate() - days);
  return { since, until: null, label: `Last ${days} days` };
}
