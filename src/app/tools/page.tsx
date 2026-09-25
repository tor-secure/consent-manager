import type { Metadata } from "next";

import { ToolsHome } from "@/components/tools/tools-home";
import { INDEXABLE_ROBOTS, pageAlternates, socialMetadata } from "@/lib/site-metadata";

const title = "DPDP compliance tools";
const description = "Preliminary DPDP assessments for penalty exposure, readiness, notices, a roadmap, and Significant Data Fiduciary screening. Not legal advice or an official determination.";

export const metadata: Metadata = {
  title,
  description,
  robots: INDEXABLE_ROBOTS,
  alternates: pageAlternates("/tools"),
  ...socialMetadata({ title: `${title} — Consent Guru`, description, path: "/tools" }),
};

export default function ToolsPage() {
  return <ToolsHome />;
}
