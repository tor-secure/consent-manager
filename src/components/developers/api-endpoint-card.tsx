"use client";

import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "@/components/sdk/copy-snippet";

export type ApiEndpointCardProps = {
  method: "GET" | "POST" | "DELETE" | "PUT" | "PATCH";
  path: string;
  title: string;
  description: string;
  auth: string;
  scopes?: string[];
  example?: string;
  notes?: string[];
};

const METHOD_STYLES: Record<ApiEndpointCardProps["method"], string> = {
  GET: "bg-[var(--info-soft)] text-[var(--info)]",
  POST: "bg-[var(--success-soft)] text-[var(--success)]",
  DELETE: "bg-[var(--danger-soft)] text-[var(--danger)]",
  PUT: "bg-[var(--warning-soft)] text-[var(--warning)]",
  PATCH: "bg-[var(--warning-soft)] text-[var(--warning)]",
};

export function ApiEndpointCard({
  method,
  path,
  title,
  description,
  auth,
  scopes = [],
  example,
  notes = [],
}: ApiEndpointCardProps) {
  return (
    <article className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
      <div className="flex flex-wrap items-start gap-3 border-b border-[var(--border)] px-5 py-4">
        <span
          className={[
            "inline-flex min-w-16 items-center justify-center rounded-lg px-2.5 py-1 font-mono text-xs font-bold tracking-wide",
            METHOD_STYLES[method],
          ].join(" ")}
        >
          {method}
        </span>
        <div className="min-w-0 flex-1">
          <code className="break-all font-mono text-sm font-semibold text-[var(--foreground)]">
            {path}
          </code>
          <p className="mt-1 text-sm font-medium text-[var(--foreground)]">{title}</p>
          <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">{description}</p>
        </div>
      </div>

      <div className="space-y-4 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted-foreground)]">
          <span className="font-semibold uppercase tracking-wider">Auth</span>
          <span>{auth}</span>
          {scopes.map((scope) => (
            <Badge key={scope} variant="neutral" size="sm">
              {scope}
            </Badge>
          ))}
        </div>

        {notes.length > 0 ? (
          <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--muted-foreground)]">
            {notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        ) : null}

        {example ? <CodeBlock code={example} language="bash" label="example" /> : null}
      </div>
    </article>
  );
}
