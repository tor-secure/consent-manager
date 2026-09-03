export type AbVariantStat = {
  variantId: string;
  total: number;
  acceptAll: number;
  rejectAll: number;
  granular: number;
  acceptRate: number;
};

export function summarizeAbChoices(
  rows: Array<{ variantId: string | null; choice: string | null; count: number }>,
): AbVariantStat[] {
  const byId = new Map<string, AbVariantStat>();
  for (const row of rows) {
    const variantId = (row.variantId ?? "").trim() || "unassigned";
    const current = byId.get(variantId) ?? {
      variantId,
      total: 0,
      acceptAll: 0,
      rejectAll: 0,
      granular: 0,
      acceptRate: 0,
    };
    const count = Math.max(0, Number(row.count) || 0);
    current.total += count;
    if (row.choice === "accept-all") current.acceptAll += count;
    else if (row.choice === "reject-all") current.rejectAll += count;
    else if (row.choice === "granular") current.granular += count;
    byId.set(variantId, current);
  }
  return [...byId.values()]
    .map((row) => ({
      ...row,
      acceptRate: row.total > 0 ? Math.round((row.acceptAll / row.total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.total - a.total);
}
