import { createHash } from "node:crypto";

export const OFFICIAL_GVL_URL = "https://vendor-list.consensu.org/v3/vendor-list.json";
export const GVL_MAX_BYTES = 8 * 1024 * 1024;
export const GVL_TIMEOUT_MS = 10_000;

export type ValidatedGvl = {
  vendorListVersion: number;
  gvlSpecificationVersion: number;
  tcfPolicyVersion: number;
  vendors: Record<string, Record<string, unknown>>;
  payload: Record<string, unknown>;
  sha256: string;
};

function positiveInteger(value: unknown, label: string): number {
  if (!Number.isInteger(value) || Number(value) <= 0) throw new Error(`Invalid GVL ${label}`);
  return Number(value);
}

export function validateGvlPayload(value: unknown): ValidatedGvl {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid GVL object");
  const payload = value as Record<string, unknown>;
  const vendors = payload.vendors;
  if (!vendors || typeof vendors !== "object" || Array.isArray(vendors)) throw new Error("Invalid GVL vendors");
  const vendorMap = vendors as Record<string, Record<string, unknown>>;
  for (const [key, vendor] of Object.entries(vendorMap)) {
    if (!/^[1-9]\d*$/.test(key) || !vendor || typeof vendor !== "object" || Number(vendor.id) !== Number(key)) {
      throw new Error("Invalid GVL vendor entry");
    }
  }
  const canonical = JSON.stringify(payload);
  return {
    vendorListVersion: positiveInteger(payload.vendorListVersion, "vendorListVersion"),
    gvlSpecificationVersion: positiveInteger(payload.gvlSpecificationVersion, "gvlSpecificationVersion"),
    tcfPolicyVersion: positiveInteger(payload.tcfPolicyVersion, "tcfPolicyVersion"),
    vendors: vendorMap,
    payload,
    sha256: createHash("sha256").update(canonical).digest("hex"),
  };
}

export async function fetchOfficialGvl(fetcher: typeof fetch = fetch): Promise<ValidatedGvl> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GVL_TIMEOUT_MS);
  try {
    const response = await fetcher(OFFICIAL_GVL_URL, {
      signal: controller.signal,
      redirect: "error",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`GVL fetch failed (${response.status})`);
    const declared = Number(response.headers.get("content-length") || 0);
    if (declared > GVL_MAX_BYTES) throw new Error("GVL response too large");
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > GVL_MAX_BYTES) throw new Error("GVL response too large");
    return validateGvlPayload(JSON.parse(new TextDecoder().decode(bytes)));
  } finally {
    clearTimeout(timeout);
  }
}
