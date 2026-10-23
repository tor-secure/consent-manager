"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { DirectionIcon } from "@/components/ui/direction-icon";
import { PrivacyJourney } from "./privacy-journey";
import { PrivacyHero } from "./privacy-hero";

export function DpdpGuide({ chapters }: { chapters: { id: string; label: string; content: ReactNode }[] }) {
  const reference = useRef<HTMLDivElement>(null);
  const [allOpen, setAllOpen] = useState(false);
  useEffect(() => {
    const reveal = () => {
      const id = window.location.hash.slice(1);
      const section = reference.current?.querySelector<HTMLElement>(`article[id="${CSS.escape(id)}"]`);
      if (section) { const guide=section.closest("details"); if(guide) guide.open=true; requestAnimationFrame(() => section.scrollIntoView({ block: "start" })); }
    };
    window.addEventListener("hashchange", reveal);
    const frame = requestAnimationFrame(reveal);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("hashchange", reveal); };
  }, []);
  function toggleAll() {
    const guide=reference.current?.querySelector<HTMLDetailsElement>("details"); if(guide) guide.open=!allOpen;
    setAllOpen(!allOpen);
  }
  return <div className="dpdp-editorial" onClick={event => {
    const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href^="#"]') : null;
    if (!link) return;
    const section = reference.current?.querySelector<HTMLElement>(`article[id="${CSS.escape(link.hash.slice(1))}"]`);
    const guide=section?.closest("details"); if(guide) guide.open=true;
  }}>
    <PrivacyHero />
    <div id="privacy-story" className="dpdp-story-anchor"><PrivacyJourney /></div>
    <section className="act-reference" id="act-reference">
      <div className="act-reference-heading"><div><h2>The detail,<br /><em>when you need it.</em></h2><p>Explore the complete guide. Each explanation stays here, alongside the interactive experience.</p></div><button type="button" onClick={toggleAll}>{allOpen ? "Close the complete guide" : "Read the complete guide"}<DirectionIcon direction={allOpen ? "right" : "down"} /></button></div>
      <div ref={reference} className="act-reference-list"><details className="act-complete-guide" onToggle={event=>setAllOpen(event.currentTarget.open)}><summary>Continuous reading mode <span>All 13 chapters, in one place</span><DirectionIcon direction="down" /></summary><div>{chapters.map(chapter=><article className="act-reference-chapter" id={chapter.id} key={chapter.id}><h3>{chapter.label}</h3><div className="act-reference-content">{chapter.content}</div></article>)}</div></details></div>
    </section>
    <section className="dpdp-editorial-close"><h2>From understanding<br /><em>to everyday practice.</em></h2><div><p>Bring your notice, the choice, and its record together.</p><Link href="/e-learning">Continue learning<DirectionIcon direction="diagonal" /></Link><Link href="/sign-up">Create a workspace<DirectionIcon direction="diagonal" /></Link></div></section>
  </div>;
}
