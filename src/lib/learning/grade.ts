export type CertificateGrade = "A" | "B" | "C" | "D";

/** Bands sit inside the passing range (80–100) so every issued certificate gets a meaningful letter. */
export function certificateGrade(scorePercent: number): CertificateGrade {
  if (scorePercent >= 95) return "A";
  if (scorePercent >= 90) return "B";
  if (scorePercent >= 85) return "C";
  return "D";
}
