import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { toolCard, toolIds } from "@/config/tools/catalog";
import { ToolRunner } from "@/components/tools/tool-runner";
import { INDEXABLE_ROBOTS, pageAlternates, socialMetadata } from "@/lib/site-metadata";
import { isToolId } from "@/lib/tools/types";

export function generateStaticParams() {
  return toolIds().map((tool) => ({ tool }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tool: string }>;
}): Promise<Metadata> {
  const { tool } = await params;
  const card = toolCard(tool);
  if (!card) return { title: "Tool not found" };
  return {
    title: card.name,
    description: card.description,
    robots: INDEXABLE_ROBOTS,
    alternates: pageAlternates(card.href),
    ...socialMetadata({
      title: `${card.name} — Consent Guru`,
      description: card.description,
      path: card.href,
    }),
  };
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ tool: string }>;
}) {
  const { tool } = await params;
  if (!isToolId(tool)) notFound();
  return (
    <Suspense fallback={<p className="mx-auto max-w-[800px] px-5 py-10 text-sm text-[#5D6B73]">Loading the tool…</p>}>
      <ToolRunner tool={tool} />
    </Suspense>
  );
}
