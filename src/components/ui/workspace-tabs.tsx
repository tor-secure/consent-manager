"use client";

import { useId, useRef, useState, type ReactNode } from "react";

export function WorkspaceTabs({ tabs, label }: { tabs: { title: string; content: ReactNode }[]; label: string }) {
  const [active, setActive] = useState(0);
  const id = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  function go(next: number) { const index = (next + tabs.length) % tabs.length; setActive(index); buttons.current[index]?.focus(); }
  return <div className="workspace-view-tabs">
    <div role="tablist" aria-label={label} className="workspace-view-tablist">{tabs.map((tab, index) => <button key={tab.title} id={`${id}-tab-${index}`} ref={node => { buttons.current[index] = node; }} role="tab" type="button" aria-selected={active === index} aria-controls={`${id}-panel-${index}`} tabIndex={active === index ? 0 : -1} onClick={() => setActive(index)} onKeyDown={event => { if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return; event.preventDefault(); go(event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : active + (event.key === "ArrowRight" ? 1 : -1)); }}>{tab.title}</button>)}</div>
    {tabs.map((tab, index) => <div key={tab.title} role="tabpanel" id={`${id}-panel-${index}`} aria-labelledby={`${id}-tab-${index}`} hidden={active !== index} className="workspace-view-panel space-y-6" tabIndex={0}>{tab.content}</div>)}
  </div>;
}
