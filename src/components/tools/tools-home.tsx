"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { TOOL_CARDS } from "@/config/tools/catalog";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/search-input";
import type { ToolId } from "@/lib/tools/types";

type Saved = { id: string; toolType: string; label: string; updatedAt: string };

function localStatus(tool: ToolId): "report" | "draft" | null {
  if (typeof window === "undefined") return null;
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key?.startsWith("cmp.tools.v1.") || !key.endsWith(`.${tool}`)) continue;
    try {
      const parsed = JSON.parse(window.localStorage.getItem(key) ?? "") as { result?: unknown; answers?: Record<string, string> };
      if (parsed?.result) return "report";
      if (parsed?.answers && Object.keys(parsed.answers).length > 0) return "draft";
    } catch {
      /* ignore broken drafts */
    }
  }
  return null;
}

export function ToolsHome() {
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState<Saved[]>([]);
  const [local, setLocal] = useState<Record<string, "report" | "draft" | null>>({});

  useEffect(() => {
    const next: Record<string, "report" | "draft" | null> = {};
    for (const tool of TOOL_CARDS) next[tool.id] = localStatus(tool.id);
    const timer = window.setTimeout(() => setLocal(next), 0);
    void fetch("/api/tools/assessments")
      .then(async (response) => {
        if (!response.ok) return;
        const body = await response.json() as { assessments?: Saved[] };
        setSaved(body.assessments ?? []);
      })
      .catch(() => undefined);
    return () => window.clearTimeout(timer);
  }, []);

  const cards = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return TOOL_CARDS;
    return TOOL_CARDS.filter((tool) => `${tool.name} ${tool.description}`.toLowerCase().includes(needle));
  }, [query]);

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-8 sm:px-8 sm:py-12">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#00A88F]">DPDP compliance tools</p>
      <h1 className="mt-3 max-w-3xl text-balance text-3xl font-bold tracking-tight text-[#0B2C4A] sm:text-4xl">
        Plan consent work without treating a score as a legal result
      </h1>
      <p className="mt-4 max-w-3xl text-sm leading-6 text-[#4B5563] sm:text-base">
        Six preliminary assessments for penalty exposure, readiness, a DPDP gap review, notices, a roadmap, and Significant Data Fiduciary screening. They use your answers and configured checks. They do not certify compliance.
      </p>
      <div className="mt-6 max-w-md">
        <SearchInput label="Filter tools" placeholder="Filter tools" value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>
      {cards.length === 0 ? <p className="mt-8 text-sm text-[#5D6B73]">No tool matches that filter.</p> : null}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {cards.map((tool) => {
          const server = saved.find((item) => item.toolType === tool.id);
          const state = local[tool.id];
          const gap = tool.id === "dpdp-gap-assessment";
          const href = gap ? tool.href : server ? `${tool.href}?report=${server.id}` : tool.href;
          const action = gap ? "Launch Tool" : server || state === "report" ? "View report" : state === "draft" ? "Continue" : "Start";
          return (
            <Card key={tool.id} hover className="flex flex-col">
              <CardHeader>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#00A88F]">
                  {tool.id === "dpdp-gap-assessment" ? (
                    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M12 3 5 6v6c0 4.2 2.8 7.2 7 8.5 4.2-1.3 7-4.3 7-8.5V6l-7-3Z" />
                      <path d="m8.5 12 2.2 2.2 4.8-4.8" />
                    </svg>
                  ) : null}
                  {tool.minutes}
                </p>
                <CardTitle>{tool.name}</CardTitle>
                <CardDescription>{tool.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm leading-6 text-[var(--muted-foreground)]">{tool.purpose}</p>
                <p className="mt-3 text-xs text-[var(--muted-foreground)]">
                  {server ? `Last workspace result: ${server.label || "Saved"}` : state === "draft" ? "Draft on this device" : state === "report" ? "Result on this device" : "Not started on this device"}
                </p>
              </CardContent>
              <CardFooter>
                <Link href={href} className="btn btn-primary">{action}</Link>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
