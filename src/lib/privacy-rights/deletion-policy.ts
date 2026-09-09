export type DeletionLayer =
  | "current_operational"
  | "immutable_evidence"
  | "legal_hold"
  | "audit"
  | "rights_request";

export type DeletionDecision = {
  layer: DeletionLayer;
  deletable: boolean;
  reason: string;
};

export function evaluateDeletionLayer(layer: DeletionLayer): DeletionDecision {
  if (layer === "current_operational") {
    return {
      layer,
      deletable: true,
      reason: "Eligible current consent state may be deleted after review and hold checks.",
    };
  }
  if (layer === "legal_hold") {
    return {
      layer,
      deletable: false,
      reason: "Active legal hold blocks deletion of the held resource.",
    };
  }
  if (layer === "immutable_evidence") {
    return {
      layer,
      deletable: false,
      reason: "Historical consent evidence is not deleted through the DSAR path.",
    };
  }
  return {
    layer,
    deletable: false,
    reason: "Operational/audit records are retained independently of consent-state erasure.",
  };
}

export function dsarDeletionMustPreserveEvidence(): boolean {
  return true;
}

export function planDsarDeletion(input: {
  hasCurrentRecord: boolean;
  evidenceCount: number;
  holdOnRecord: boolean;
  holdOnEvidence: boolean;
  holdOnRequest: boolean;
}): {
  canExecute: boolean;
  blockedByHold: boolean;
  deleteCurrentState: boolean;
  preserveEvidence: boolean;
  decisions: DeletionDecision[];
} {
  const decisions: DeletionDecision[] = [];
  if (input.holdOnRequest) {
    decisions.push(evaluateDeletionLayer("legal_hold"));
  }
  if (input.hasCurrentRecord) {
    decisions.push(
      evaluateDeletionLayer(input.holdOnRecord ? "legal_hold" : "current_operational"),
    );
  }
  if (input.evidenceCount > 0) {
    decisions.push(
      evaluateDeletionLayer(input.holdOnEvidence ? "legal_hold" : "immutable_evidence"),
    );
  }
  decisions.push(evaluateDeletionLayer("audit"));
  decisions.push(evaluateDeletionLayer("rights_request"));

  const blockedByHold =
    input.holdOnRequest || input.holdOnRecord || input.holdOnEvidence;
  const deleteCurrentState =
    input.hasCurrentRecord && !input.holdOnRecord && !input.holdOnRequest;

  return {
    canExecute: !input.holdOnRequest,
    blockedByHold,
    deleteCurrentState,
    preserveEvidence: dsarDeletionMustPreserveEvidence(),
    decisions,
  };
}
