"use client";

import { useEffect } from "react";

import { markReturningLearner } from "@/lib/learning/returning-learner";

/** Persist that this browser has an enrolled / signed-in learner (survives logout). */
export function RememberReturningLearner({ active }: { active: boolean }) {
  useEffect(() => {
    if (active) markReturningLearner();
  }, [active]);
  return null;
}
