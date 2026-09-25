"use client";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AssessmentResult, Severity } from "@/lib/tools/types";

const SEVERITY_VARIANT: Record<Severity | "info", "danger" | "warning" | "neutral" | "primary"> = {
  critical: "danger",
  high: "danger",
  medium: "warning",
  low: "neutral",
  info: "primary",
};

export function ToolReport({
  title,
  organisationName,
  result,
  saving,
  saveMessage,
  onReset,
  onSave,
  onPdf,
  pdfError,
}: {
  title: string;
  organisationName: string;
  result: AssessmentResult;
  saving: boolean;
  saveMessage: string | null;
  onReset: () => void;
  onSave: () => void;
  onPdf: () => void;
  pdfError: string | null;
}) {
  return (
    <article className="tool-report space-y-6">
      <header className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#00A88F]">Preliminary assessment</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-[var(--foreground)]">{title}</h2>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          {organisationName} · {result.methodologyVersion}
          {result.score !== null ? ` · Indicator ${result.score}` : ""}
        </p>
        <p className="mt-4 text-lg font-semibold text-[var(--foreground)]">{result.label}</p>
        <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{result.summary}</p>
        {result.aiNote ? <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">{result.aiNote}</p> : null}
      </header>

      {result.pillars.length > 0 ? (
        <section aria-label="Pillar scores" className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6">
          <h3 className="text-base font-semibold text-[var(--foreground)]">Scores</h3>
          <ul className="mt-4 space-y-3">
            {result.pillars.map((pillar) => (
              <li key={pillar.id}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-[var(--foreground)]">{pillar.label}</span>
                  <span className="tabular-nums text-[var(--muted-foreground)]">{pillar.score}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--muted)]" aria-hidden="true">
                  <div className="h-full rounded-full bg-[#00C4A7]" style={{ width: `${pillar.score}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {result.indicators.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-base font-semibold text-[var(--foreground)]">Indicators identified</h3>
          {result.indicators.map((indicator) => (
            <article key={indicator.id} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
              <h4 className="font-semibold text-[var(--foreground)]">{indicator.title}</h4>
              <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{indicator.why}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">{indicator.obligation}</p>
            </article>
          ))}
        </section>
      ) : null}

      {result.unknowns.length > 0 ? (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
          <h3 className="text-base font-semibold text-[var(--foreground)]">Not enough information</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[var(--muted-foreground)]">
            {result.unknowns.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
      ) : null}

      {result.phases.length > 0 ? (
        <ol className="space-y-4">
          {result.phases.map((phase, index) => (
            <li key={phase.id} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#00A88F]">Phase {index + 1}</p>
              <h3 className="mt-1 text-lg font-semibold text-[var(--foreground)]">{phase.title}</h3>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">{phase.summary}</p>
              <ul className="mt-4 space-y-3">
                {phase.tasks.map((task) => (
                  <li key={task.id} className="border-t border-[var(--border)] pt-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={SEVERITY_VARIANT[task.priority]}>{task.priority}</Badge>
                      <span className="text-xs text-[var(--muted-foreground)]">{task.timeframe} · {task.owner}</span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-[var(--foreground)]">{task.title}</p>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">Evidence: {task.evidence}</p>
                    {task.dependsOn.length > 0 ? (
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">Depends on {task.dependsOn.join(", ")}</p>
                    ) : null}
                    <a className="mt-1 inline-block text-sm font-medium text-[#0B2C4A] underline decoration-[#00C4A7]/50 underline-offset-2" href={task.moduleHref}>
                      {task.moduleLabel}
                    </a>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      ) : null}

      {result.findings.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-base font-semibold text-[var(--foreground)]">Findings</h3>
          {result.findings.map((finding) => (
            <article key={finding.id} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={SEVERITY_VARIANT[finding.severity]}>{finding.severity}</Badge>
                <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">{finding.category}</span>
              </div>
              <h4 className="mt-2 font-semibold text-[var(--foreground)]">{finding.finding}</h4>
              <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{finding.explanation}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">{finding.recommendation}</p>
              {finding.reference ? <p className="mt-2 text-xs leading-5 text-[var(--muted-foreground)]">{finding.reference}</p> : null}
            </article>
          ))}
        </section>
      ) : null}

      <Alert variant="info">{result.disclaimer}</Alert>
      {saveMessage ? <Alert variant={saveMessage.startsWith("Saved") ? "success" : "warning"}>{saveMessage}</Alert> : null}
      {pdfError ? <Alert variant="error" role="alert">{pdfError}</Alert> : null}

      <div className="flex flex-col gap-2 print:hidden sm:flex-row sm:flex-wrap">
        <Button type="button" onClick={onSave} loading={saving}>Save to workspace</Button>
        <Button type="button" variant="outline" onClick={onPdf}>Download PDF</Button>
        <Button type="button" variant="outline" onClick={() => window.print()}>Print</Button>
        <Button type="button" variant="ghost" onClick={onReset}>Start again</Button>
      </div>
    </article>
  );
}
