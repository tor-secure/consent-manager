import type { Answers } from "./types";

export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function weightedAverage(
  parts: Array<{ weight: number; value: number }>,
): number | null {
  let weight = 0;
  let total = 0;
  for (const part of parts) {
    if (part.weight <= 0) continue;
    weight += part.weight;
    total += part.weight * part.value;
  }
  if (weight === 0) return null;
  return clampScore((total / weight) * 100);
}

export function missingIds(ids: string[], answers: Answers): string[] {
  return ids.filter((id) => {
    const value = answers[id];
    return typeof value !== "string" || value.trim().length === 0;
  });
}

export function bandFor(score: number, bands: Array<{ max: number; label: string }>): string {
  const ordered = [...bands].sort((a, b) => a.max - b.max);
  return ordered.find((band) => score <= band.max)?.label ?? ordered[ordered.length - 1]?.label ?? "Unscored";
}
