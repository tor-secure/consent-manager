"use client";

import { createContext, useContext, useTransition, type ReactNode, type TransitionStartFunction } from "react";

const ConsentRecordMotionContext = createContext<{
  pending: boolean;
  startTransition: TransitionStartFunction;
} | null>(null);

export function useConsentRecordMotion() {
  return useContext(ConsentRecordMotionContext);
}

export function ConsentRecordMotion({ children }: { children: ReactNode }) {
  const [pending, startTransition] = useTransition();
  return (
    <ConsentRecordMotionContext.Provider value={{ pending, startTransition }}>
      {children}
    </ConsentRecordMotionContext.Provider>
  );
}

export function ConsentRecordFade({ children }: { children: ReactNode }) {
  const motion = useConsentRecordMotion();
  const pending = motion?.pending ?? false;
  return (
    <div
      aria-busy={pending}
      className={`motion-safe:transition-opacity motion-safe:duration-300 motion-safe:ease-out ${pending ? "pointer-events-none opacity-0" : "opacity-100"}`}
    >
      {children}
    </div>
  );
}
