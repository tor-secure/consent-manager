import type { ReactNode } from "react";

import { EnsureLearningClerk } from "@/components/learning/ensure-learning-clerk";
import { LearningClerkProvider } from "@/components/learning/learning-clerk-provider";
import { NOINDEX_ROBOTS } from "@/lib/site-metadata";

export const metadata = {
  robots: NOINDEX_ROBOTS,
  title: "E-learning sign up",
};

/** Always use the Learning Clerk app here — independent of root layout header detection. */
export default function LearningSignUpLayout({ children }: { children: ReactNode }) {
  return (
    <LearningClerkProvider>
      <EnsureLearningClerk />
      {children}
    </LearningClerkProvider>
  );
}
