import { PUBLIC_STATUS_LABELS, type RightsRequestStatus } from "./types";

export function publicRightsStatus(status: string): string {
  return (
    PUBLIC_STATUS_LABELS[status as RightsRequestStatus] ?? "request received"
  );
}

export function publicStatusPayload(input: {
  requesterReference: string | null;
  requestType: string;
  status: string;
  verificationStatus: string;
  receivedAt: Date;
  dueAt: Date;
  completedAt: Date | null;
}) {
  return {
    requesterReference: input.requesterReference,
    requestType: input.requestType,
    status: publicRightsStatus(input.status),
    verificationStatus:
      input.verificationStatus === "verified" ? "verified" : "verification required",
    receivedAt: input.receivedAt.toISOString(),
    dueAt: input.dueAt.toISOString(),
    completedAt: input.completedAt?.toISOString() ?? null,
  };
}
