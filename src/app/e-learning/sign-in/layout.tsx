import type { ReactNode } from "react";

import { EnsureLearningClerk } from "@/components/learning/ensure-learning-clerk";
import { NOINDEX_ROBOTS } from "@/lib/site-metadata";

export const metadata = {
  robots: NOINDEX_ROBOTS,
  title: "E-learning sign in",
};

/** Root layout already mounts LearningClerkProvider for this path. */
export default function LearningSignInLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <EnsureLearningClerk />
      {children}
    </>
  );
}
