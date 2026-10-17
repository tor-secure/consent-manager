import type { ReactNode } from "react";

import { LearningClerkProvider } from "@/components/learning/learning-clerk-provider";
import { NOINDEX_ROBOTS } from "@/lib/site-metadata";

export const metadata = {
  robots: NOINDEX_ROBOTS,
  title: "E-learning sign in",
};

/** Always use the Learning Clerk app here — independent of root layout header detection. */
export default function LearningSignInLayout({ children }: { children: ReactNode }) {
  return <LearningClerkProvider>{children}</LearningClerkProvider>;
}
