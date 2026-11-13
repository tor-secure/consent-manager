"use client";

import type { ReactNode } from "react";

/**
 * Sends the learner through /e-learning/sign-out so Learning Clerk actually
 * signs out, the cg_learning cookie is cleared, and they land on the public
 * enroll / course home (no sidebar dashboard).
 */
export function LearningSignOutButton({
  className,
  children,
  title,
}: {
  className?: string;
  children: ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      className={className}
      title={title}
      onClick={() => {
        window.location.assign("/e-learning/sign-out");
      }}
    >
      {children}
    </button>
  );
}
