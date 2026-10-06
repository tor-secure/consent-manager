import { SITE_URL } from "@/lib/site-metadata";

export const DEMO_CERTIFICATE_CODE = "CG-DPDP-DEMO30";

export const CERTIFICATE_PROGRAM_LINE = "30 Days DPDP Act certified";

export function isDemoCertificateCode(code: string): boolean {
  return code.trim().toUpperCase() === DEMO_CERTIFICATE_CODE;
}

export function certificateVerificationUrl(code: string): string {
  return `${SITE_URL}/learning/verify/${encodeURIComponent(code)}`;
}

export function demoCertificate() {
  const completedAt = new Date("2026-10-02T00:00:00.000Z");
  return {
    certificateCode: DEMO_CERTIFICATE_CODE,
    learnerName: "Sample Learner",
    courseTitle: "DPDP Act 2023 — Complete Data Protection & Privacy Training",
    scorePercent: 92,
    completedAt,
    issuedAt: completedAt,
    durationMinutes: 364,
    kind: "Certificate of Completion",
    programLine: CERTIFICATE_PROGRAM_LINE,
    verificationPath: `/learning/verify/${DEMO_CERTIFICATE_CODE}`,
    verificationUrl: certificateVerificationUrl(DEMO_CERTIFICATE_CODE),
    specimen: true,
  };
}
