export const CORRECTABLE_REQUEST_FIELDS = [
  "requesterName",
  "requesterPhone",
  "description",
  "consentId",
] as const;

export type CorrectableRequestField = (typeof CORRECTABLE_REQUEST_FIELDS)[number];

export function filterCorrectionPatch(
  input: Record<string, unknown>,
): { ok: true; patch: Partial<Record<CorrectableRequestField, string | null>> } | { ok: false; reason: string } {
  const unknown = Object.keys(input).filter(
    (key) => !(CORRECTABLE_REQUEST_FIELDS as readonly string[]).includes(key),
  );
  if (unknown.length > 0) {
    return { ok: false, reason: `unsupported_fields:${unknown.join(",")}` };
  }

  const patch: Partial<Record<CorrectableRequestField, string | null>> = {};
  if (typeof input.requesterName === "string") {
    const value = input.requesterName.trim().slice(0, 255);
    if (!value) return { ok: false, reason: "requesterName_required" };
    patch.requesterName = value;
  }
  if (input.requesterPhone === null) patch.requesterPhone = null;
  if (typeof input.requesterPhone === "string") {
    patch.requesterPhone = input.requesterPhone.trim().slice(0, 50) || null;
  }
  if (typeof input.description === "string") {
    const value = input.description.trim().slice(0, 5000);
    if (!value) return { ok: false, reason: "description_required" };
    patch.description = value;
  }
  if (input.consentId === null) patch.consentId = null;
  if (typeof input.consentId === "string") {
    patch.consentId = input.consentId.trim().slice(0, 255) || null;
  }

  if (Object.keys(patch).length === 0) {
    return { ok: false, reason: "empty_patch" };
  }
  return { ok: true, patch };
}
