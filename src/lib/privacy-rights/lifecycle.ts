import {
  isTerminalRightsStatus,
  type RightsRequestStatus,
  type VerificationStatus,
} from "./types";

const ADMIN_TRANSITIONS: Record<string, readonly string[]> = {
  received: ["acknowledged", "verification_pending", "cancelled", "rejected"],
  verification_pending: ["cancelled", "rejected", "expired"],
  verified: ["in_review", "cancelled", "rejected"],
  in_review: ["in_progress", "cancelled", "rejected"],
  acknowledged: ["in_progress", "in_review", "cancelled", "rejected"],
  in_progress: ["completed", "cancelled", "rejected"],
};

const SYSTEM_TRANSITIONS: Record<string, readonly string[]> = {
  received: ["verification_pending", "verified"],
  verification_pending: ["verified", "expired", "failed"],
  verified: ["in_review"],
};

export function canAdminTransition(
  from: string,
  to: string,
  options?: { verificationStatus?: VerificationStatus; requesterKind?: string },
): { ok: boolean; reason?: string } {
  if (from === to) return { ok: true };
  if (isTerminalRightsStatus(from)) {
    return { ok: false, reason: "terminal_status" };
  }
  if (to === "verified") {
    return { ok: false, reason: "verification_required" };
  }
  const allowed = ADMIN_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    return { ok: false, reason: "invalid_transition" };
  }
  if (
    (to === "in_review" || to === "in_progress" || to === "completed") &&
    from !== "acknowledged" &&
    from !== "in_progress" &&
    from !== "in_review" &&
    options?.verificationStatus !== "verified" &&
    from !== "received"
  ) {
    if (from === "verified" && to === "in_review") return { ok: true };
    if (from === "verification_pending") {
      return { ok: false, reason: "not_verified" };
    }
  }
  if (
    to === "completed" &&
    options?.requesterKind === "authorized_agent" &&
    options.verificationStatus !== "verified"
  ) {
    return { ok: false, reason: "agent_not_authorized" };
  }
  return { ok: true };
}

export function canSystemTransition(from: string, to: string): boolean {
  if (from === to) return true;
  if (isTerminalRightsStatus(from)) return false;
  return (SYSTEM_TRANSITIONS[from] ?? []).includes(to);
}

export function statusAfterVerification(current: string): RightsRequestStatus {
  if (current === "received" || current === "verification_pending") return "verified";
  return current as RightsRequestStatus;
}

export function requesterCannotSetStatus(status: string): boolean {
  return status === "completed" || status === "verified" || status === "in_progress";
}

export function verificationAllowedForRequest(status: string): boolean {
  return status !== "cancelled" && status !== "rejected" && status !== "expired";
}
