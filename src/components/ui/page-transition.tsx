"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { animate } from "motion";

export function PageTransition({ children, workspace = false }: { children: ReactNode; workspace?: boolean }) {
  const scope = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    if (!scope.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const animation = animate(scope.current, { opacity: [.8, 1], y: [8, 0] }, { duration: .35, ease: [.22, 1, .36, 1] });
    return () => animation.complete();
  }, [pathname]);
  return <div ref={scope} className={workspace ? "page-transition workspace-transition" : "page-transition"}>{children}</div>;
}
