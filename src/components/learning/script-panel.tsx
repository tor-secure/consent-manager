"use client";

import { useState } from "react";

export function ScriptPanel({ script, title }: { script: string; title: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(script);
    setCopied(true);
  }

  function download() {
    const blob = new Blob([script], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-script.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="space-y-3 rounded-xl border border-[var(--border)] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Video script</h2>
        <div className="flex gap-2">
          <button type="button" className="rounded-lg border px-3 py-2 text-sm" onClick={copy}>
            {copied ? "Copied" : "Copy script"}
          </button>
          <button type="button" className="rounded-lg border px-3 py-2 text-sm" onClick={download}>
            Download script
          </button>
        </div>
      </div>
      <pre className="max-h-80 overflow-auto whitespace-pre-wrap text-sm">{script}</pre>
    </section>
  );
}
