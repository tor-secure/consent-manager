"use client";

import { LazyMotion, domMax, MotionConfig } from "motion/react";

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <LazyMotion features={domMax}><MotionConfig reducedMotion="user" transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}>{children}</MotionConfig></LazyMotion>;
}
