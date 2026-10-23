"use client";

import { useEffect, useState, type ReactNode } from "react";

export function DocumentReader({ sections, children }: { sections: { id: string; title: string; number?: string | number; content: ReactNode }[]; children?: ReactNode }) {
  const [query, setQuery] = useState("");
  const [opened, setOpened] = useState(() => new Set(sections.slice(0, 1).map(section => section.id)));
  const allOpen = sections.every(section => opened.has(section.id));
  useEffect(() => {
    const onHash = () => { const id = location.hash.slice(1); if (sections.some(section => section.id === id)) setOpened(current => new Set(current).add(id)); };
    window.addEventListener("hashchange", onHash);
    const frame = requestAnimationFrame(onHash);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("hashchange", onHash); };
  }, [sections]);
  function toggle(id: string) { setOpened(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }
  const filtered = sections.filter(section => section.title.toLowerCase().includes(query.toLowerCase()));
  return <div className="document-reader">
    <aside className="document-navigation"><h2>In this document</h2><label><span className="sr-only">Find a document section</span><input type="search" placeholder="Find a section…" value={query} onChange={event => setQuery(event.target.value)} /></label><nav aria-label="Document sections">{filtered.map(section => <a href={`#${section.id}`} key={section.id} onClick={() => setOpened(current => new Set(current).add(section.id))}>{section.number && <span>{section.number}</span>}{section.title}</a>)}</nav>{!filtered.length && <p>No matching section. Clear your search to see all topics.</p>}</aside>
    <div className="document-body">{children}<div className="document-reader-toolbar"><span>{sections.length} sections</span><button type="button" onClick={() => setOpened(allOpen ? new Set() : new Set(sections.map(section => section.id)))}>{allOpen ? "Collapse all sections" : "Expand all sections"}</button></div>{sections.map(section => <details className="document-section" id={section.id} key={section.id} open={opened.has(section.id)}><summary onClick={event => { event.preventDefault(); toggle(section.id); }}><h2>{section.number && <span>{section.number}.</span>}{section.title}</h2><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M5 12h14M12 5v14" /></svg></summary><div className="document-section-content">{section.content}</div></details>)}</div>
  </div>;
}
