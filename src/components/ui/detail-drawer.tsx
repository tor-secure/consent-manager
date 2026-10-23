"use client";

import { useEffect, useId, useRef } from "react";
import { m, useReducedMotion } from "motion/react";

/** Native dialog provides focus containment, Escape, and inert background content. */
export function DetailDrawer({ title, subtitle, open, onClose, children }: { title: string; subtitle?: string; open: boolean; onClose: () => void; children: React.ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const reduce = useReducedMotion();
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);
  return <dialog ref={dialog} className="detail-drawer" aria-labelledby={titleId} onCancel={onClose} onClose={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    {open && <m.div className="detail-drawer-panel" initial={{ x: reduce ? 0 : 24, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
      <header className="flex items-start justify-between gap-4 border-b border-[var(--border)] p-6">
        <div className="min-w-0"><h2 id={titleId} className="text-lg font-semibold break-words">{title}</h2>{subtitle && <p className="mt-1 text-sm text-[var(--muted-foreground)]">{subtitle}</p>}</div>
        <button type="button" className="btn btn-ghost btn-icon shrink-0" onClick={onClose} aria-label="Close details"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button>
      </header>
      <div className="space-y-6 p-6">{children}</div>
    </m.div>}
  </dialog>;
}
