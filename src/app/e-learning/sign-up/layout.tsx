import type { ReactNode } from "react";

import { EnsureLearningClerk } from "@/components/learning/ensure-learning-clerk";
import { NOINDEX_ROBOTS } from "@/lib/site-metadata";

export const metadata = {
  robots: NOINDEX_ROBOTS,
  title: "E-learning sign up",
};

/** Root layout already mounts LearningClerkProvider for this path. */
export default function LearningSignUpLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <EnsureLearningClerk />
      {children}
    </>
  );
}
