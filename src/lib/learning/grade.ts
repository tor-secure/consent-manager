export type CertificateGrade = "A+" | "A" | "B";

/** Final-exam bands. 50 and above is a pass. 80 is A, and 90 is A+. */
export function certificateGrade(scorePercent: number): CertificateGrade {
  if (scorePercent >= 90) return "A+";
  if (scorePercent >= 80) return "A";
  return "B";
}
