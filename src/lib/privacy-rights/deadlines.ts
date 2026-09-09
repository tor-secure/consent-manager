import { normalizeRightsJurisdiction } from "./applicability";
import type { DeadlineKind, RightsJurisdiction } from "./types";

export type RightsDeadlineConfig = {
  acknowledgeHours: number;
  responseDays: number;
  kind: DeadlineKind;
  label: string;
};

const DEADLINES: Record<RightsJurisdiction, RightsDeadlineConfig> = {
  dpdp: {
    acknowledgeHours: 48,
    responseDays: 30,
    kind: "configured_target",
    label: "DPDP-oriented configured target",
  },
  gdpr: {
    acknowledgeHours: 72,
    responseDays: 30,
    kind: "configured_target",
    label: "GDPR-oriented configured target",
  },
  ccpa: {
    acknowledgeHours: 72,
    responseDays: 45,
    kind: "configured_target",
    label: "CCPA/CPRA-oriented configured target",
  },
  lgpd: {
    acknowledgeHours: 72,
    responseDays: 15,
    kind: "configured_target",
    label: "LGPD-oriented configured target",
  },
};

export function rightsDeadlineConfig(jurisdiction: unknown): RightsDeadlineConfig {
  return DEADLINES[normalizeRightsJurisdiction(jurisdiction)];
}

export function computeRightsDeadlines(
  submittedAt: Date,
  jurisdiction: unknown,
): {
  acknowledgeBy: Date;
  dueAt: Date;
  deadlineKind: DeadlineKind;
  config: RightsDeadlineConfig;
} {
  const config = rightsDeadlineConfig(jurisdiction);
  return {
    acknowledgeBy: new Date(
      submittedAt.getTime() + config.acknowledgeHours * 60 * 60 * 1000,
    ),
    dueAt: new Date(submittedAt.getTime() + config.responseDays * 24 * 60 * 60 * 1000),
    deadlineKind: config.kind,
    config,
  };
}

export function classifyDeadline(input: {
  dueAt: Date;
  completedAt?: Date | null;
  status: string;
  now?: Date;
}): "completed" | "rejected" | "overdue" | "due_soon" | "on_track" {
  if (input.status === "completed") return "completed";
  if (input.status === "rejected" || input.status === "cancelled") return "rejected";
  if (input.completedAt) return "completed";
  const now = input.now ?? new Date();
  if (now.getTime() > input.dueAt.getTime()) return "overdue";
  const fiveDays = 5 * 24 * 60 * 60 * 1000;
  if (input.dueAt.getTime() - now.getTime() <= fiveDays) return "due_soon";
  return "on_track";
}
