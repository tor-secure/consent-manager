/**
 * Pure helpers for logged-in preference sync webhooks.
 * Safe for unit tests without DB.
 */

import {
  diffPreferenceChanges,
  diffRevokedDecisions,
  namePreferenceChanges,
  type DecisionSnapshot,
} from "@/lib/consent/revocation-notification-core";

export const PREFERENCE_SYNC_EVENT_TYPE = "consent.preferences.updated" as const;

export type NamedPreference = {
  kind: "purpose" | "vendor";
  id: string;
  name: string;
  granted: boolean;
};

export type PreferenceSyncChange = {
  kind: "purpose" | "vendor";
  id: string;
  name: string;
  previousGranted: boolean;
  currentGranted: boolean;
};

export type PreferenceSyncBuildInput = {
  organizationId: string;
  siteId: string;
  subjectKey: string;
  preferenceRevision: number;
  previous: DecisionSnapshot[];
  next: DecisionSnapshot[];
  names: {
    purposes: Record<string, string>;
    vendors: Record<string, string>;
  };
  fullWithdrawal?: boolean;
  occurredAt?: Date;
  eventId: string;
  hadPreviousRecord: boolean;
};

export type PreferenceSyncEnvelope = {
  id: string;
  type: typeof PREFERENCE_SYNC_EVENT_TYPE;
  organizationId: string;
  data: {
    siteId: string;
    subjectKey: string;
    eventId: string;
    occurredAt: string;
    preferenceRevision: number;
    changeKind: "established" | "updated";
    preferences: NamedPreference[];
    changes: PreferenceSyncChange[];
  };
};

export type PreferenceSyncBuildResult =
  | { shouldEmit: false; reason: "identical" | "empty" }
  | { shouldEmit: true; envelope: PreferenceSyncEnvelope };

function decisionToNamed(
  row: DecisionSnapshot,
  names: PreferenceSyncBuildInput["names"],
): NamedPreference | null {
  if (row.purposeId) {
    return {
      kind: "purpose",
      id: row.purposeId,
      name: names.purposes[row.purposeId] || row.purposeId,
      granted: Boolean(row.granted),
    };
  }
  if (row.vendorId) {
    return {
      kind: "vendor",
      id: row.vendorId,
      name: names.vendors[row.vendorId] || row.vendorId,
      granted: Boolean(row.granted),
    };
  }
  return null;
}

export function buildNamedPreferences(
  decisions: DecisionSnapshot[],
  names: PreferenceSyncBuildInput["names"],
): NamedPreference[] {
  const out: NamedPreference[] = [];
  for (const row of decisions) {
    const named = decisionToNamed(row, names);
    if (named) out.push(named);
  }
  return out;
}

export function buildPreferenceSyncEnvelope(
  input: PreferenceSyncBuildInput,
): PreferenceSyncBuildResult {
  const nextDecisions = input.fullWithdrawal
    ? input.previous.map((row) => ({ ...row, granted: false }))
    : input.next;

  const preferences = buildNamedPreferences(nextDecisions, input.names);

  if (!input.hadPreviousRecord) {
    if (preferences.length === 0) {
      return { shouldEmit: false, reason: "empty" };
    }
    return {
      shouldEmit: true,
      envelope: {
        id: input.eventId,
        type: PREFERENCE_SYNC_EVENT_TYPE,
        organizationId: input.organizationId,
        data: {
          siteId: input.siteId,
          subjectKey: input.subjectKey,
          eventId: input.eventId,
          occurredAt: (input.occurredAt ?? new Date()).toISOString(),
          preferenceRevision: input.preferenceRevision,
          changeKind: "established",
          preferences,
          changes: [],
        },
      },
    };
  }

  const changeRaw = input.fullWithdrawal
    ? diffRevokedDecisions(
        input.previous,
        input.previous.map((row) => ({ ...row, granted: false })),
      ).map((item) => ({ ...item, change: "revoked" as const }))
    : diffPreferenceChanges(input.previous, nextDecisions);

  if (changeRaw.length === 0) {
    return { shouldEmit: false, reason: "identical" };
  }

  const named = namePreferenceChanges(changeRaw, input.names);
  const changes: PreferenceSyncChange[] = named.map((item) => ({
    kind: item.kind,
    id: item.id,
    name: item.name,
    previousGranted: item.change === "revoked",
    currentGranted: item.change === "granted",
  }));

  return {
    shouldEmit: true,
    envelope: {
      id: input.eventId,
      type: PREFERENCE_SYNC_EVENT_TYPE,
      organizationId: input.organizationId,
      data: {
        siteId: input.siteId,
        subjectKey: input.subjectKey,
        eventId: input.eventId,
        occurredAt: (input.occurredAt ?? new Date()).toISOString(),
        preferenceRevision: input.preferenceRevision,
        changeKind: "updated",
        preferences,
        changes,
      },
    },
  };
}

/** Owner-facing summary for client dashboards (documentation / examples). */
export function formatPreferenceSyncOwnerSummary(input: {
  subjectKey: string;
  changes: PreferenceSyncChange[];
}): string {
  if (input.changes.length === 0) {
    return `User ${input.subjectKey} established privacy preferences.`;
  }
  const parts = input.changes.map((change) => {
    const from = change.previousGranted ? "On" : "Off";
    const to = change.currentGranted ? "On" : "Off";
    return `${change.name} from ${from} to ${to}`;
  });
  if (parts.length === 1) {
    return `User ${input.subjectKey} changed ${parts[0]}.`;
  }
  const last = parts[parts.length - 1];
  const head = parts.slice(0, -1).join(", ");
  return `User ${input.subjectKey} changed ${head} and ${last}.`;
}
