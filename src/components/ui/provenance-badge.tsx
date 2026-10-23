const labels: Record<string, string> = { observed: "Observed", configured: "Configured", inferred: "Inferred", enforced: "Enforced", unknown: "Unknown" };

export function ProvenanceBadge({ value }: { value: string }) {
  const key = value.toLowerCase();
  return <span className="provenance-badge" data-provenance={labels[key] ? key : "unknown"}><span aria-hidden="true" />{labels[key] ?? "Unknown"}</span>;
}
