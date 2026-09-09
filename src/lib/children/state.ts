import { childProtectionActive, type ChildProtectionConfig } from "./config";
import type {
  AgeBand,
  AgeStatus,
  AssuranceMethod,
  GuardianStatus,
} from "./types";

export type AgeAssuranceState = {
  ageStatus: AgeStatus;
  ageBand: AgeBand;
  assuranceMethod: AssuranceMethod | null;
  assertedOverThreshold: boolean | null;
  guardianRequired: boolean;
  guardianStatus: GuardianStatus;
  expiresAt: Date;
};

export function isAgeStatus(value: unknown): value is AgeStatus {
  return typeof value === "string" && [
    "unknown", "asserted", "assured", "minor", "child", "age_restricted",
    "guardian_required", "guardian_verified", "expired", "failed",
  ].includes(value);
}

export function resolveAgeBand(
  assertedOverThreshold: boolean | null,
  config: ChildProtectionConfig,
): AgeBand {
  if (assertedOverThreshold === null) return "unknown";
  if (assertedOverThreshold) return "adult";
  const childMax = config.childMaxAge ?? Math.min(13, config.minimumAge ?? 13);
  if ((config.minimumAge ?? 16) > childMax) return "minor";
  return "child";
}

export function nextStateFromAssertion(input: {
  config: ChildProtectionConfig;
  assertedOverThreshold: boolean;
  method: AssuranceMethod;
  now?: Date;
}): AgeAssuranceState {
  const now = input.now ?? new Date();
  const expiresAt = new Date(now.getTime() + input.config.sessionTtlHours * 60 * 60 * 1000);
  const band = resolveAgeBand(input.assertedOverThreshold, input.config);
  const guardianRequired =
    input.config.guardianConsentRequired && band !== "adult";

  if (input.method === "self_declaration" && input.assertedOverThreshold) {
    return {
      ageStatus: "asserted",
      ageBand: "adult",
      assuranceMethod: "self_declaration",
      assertedOverThreshold: true,
      guardianRequired,
      guardianStatus: "none",
      expiresAt,
    };
  }

  if (input.method === "staff_verification" && input.assertedOverThreshold) {
    return {
      ageStatus: "assured",
      ageBand: "adult",
      assuranceMethod: "staff_verification",
      assertedOverThreshold: true,
      guardianRequired: false,
      guardianStatus: "none",
      expiresAt,
    };
  }

  const status: AgeStatus = guardianRequired
    ? "guardian_required"
    : band === "child"
      ? "child"
      : "minor";
  return {
    ageStatus: status,
    ageBand: band,
    assuranceMethod: input.method,
    assertedOverThreshold: input.assertedOverThreshold,
    guardianRequired,
    guardianStatus: guardianRequired ? "pending" : "none",
    expiresAt,
  };
}

export function expireState(state: AgeAssuranceState, now = new Date()): AgeAssuranceState {
  if (state.expiresAt.getTime() > now.getTime()) return state;
  return {
    ...state,
    ageStatus: "expired",
    guardianStatus: state.guardianRequired ? "expired" : state.guardianStatus,
  };
}

export function applyGuardianContactVerified(state: AgeAssuranceState): AgeAssuranceState {
  return {
    ...state,
    guardianStatus: "authority_unverified",
    ageStatus: state.guardianRequired ? "guardian_required" : state.ageStatus,
  };
}

export function applyGuardianStaffVerified(state: AgeAssuranceState): AgeAssuranceState {
  return {
    ...state,
    guardianStatus: "verified",
    ageStatus: "guardian_verified",
  };
}

export function applyGuardianFailure(state: AgeAssuranceState): AgeAssuranceState {
  return {
    ...state,
    guardianStatus: "failed",
    ageStatus: "failed",
  };
}

export function restrictedProcessingAllowed(
  config: ChildProtectionConfig,
  state: AgeAssuranceState | null,
  now = new Date(),
): boolean {
  if (!childProtectionActive(config) && !config.ageAssuranceRequired) return true;
  if (!state) return false;
  const current = expireState(state, now);
  if (["unknown", "expired", "failed", "age_restricted"].includes(current.ageStatus)) {
    return false;
  }
  if (["minor", "child", "guardian_required"].includes(current.ageStatus)) {
    return current.guardianStatus === "verified";
  }
  if (current.guardianRequired && current.guardianStatus !== "verified") {
    return false;
  }
  if (current.ageStatus === "asserted") {
    return config.minimumAssurance === "self_declaration";
  }
  if (current.ageStatus === "assured" || current.ageStatus === "guardian_verified") {
    return true;
  }
  return false;
}

export function publicAgeView(input: {
  config: ChildProtectionConfig;
  state: AgeAssuranceState | null;
  now?: Date;
}) {
  const allowed = restrictedProcessingAllowed(input.config, input.state, input.now);
  const current = input.state ? expireState(input.state, input.now) : null;
  return {
    enabled: childProtectionActive(input.config) || input.config.ageAssuranceRequired,
    ageStatus: current?.ageStatus ?? "unknown",
    ageBand: current?.ageBand ?? "unknown",
    assuranceMethod: current?.assuranceMethod ?? null,
    guardianRequired: current?.guardianRequired ?? input.config.guardianConsentRequired,
    guardianStatus: current?.guardianStatus ?? "none",
    restrictedProcessingAllowed: allowed,
    selfDeclarationIsNotVerified: true,
    guardianAuthorityVerified: current?.guardianStatus === "verified",
  };
}
