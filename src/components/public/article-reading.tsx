"use client";

import { useEffect, useRef, useState } from "react";
import type { BlogSection } from "@/content/blogs";

export function ArticleReading({ sections }: { sections: BlogSection[] }) {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (!root.current || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a,b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActive(Number((visible[0].target as HTMLElement).dataset.section));
    }, { rootMargin: "-100px 0px -55% 0px", threshold: 0 });
    root.current.querySelectorAll("[data-section]").forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, [sections]);
  return <div className="article-reading" ref={root}><nav aria-label="Article sections"><span>In this article</span>{sections.map((section,index) => section.heading ? <a key={index} href={`#article-section-${index}`} aria-current={active === index ? "location" : undefined}>{section.heading}</a> : null)}</nav><div>{sections.map((section,index) => <section key={index} id={`article-section-${index}`} data-section={index}>{section.heading && <h2>{section.heading}</h2>}{section.paragraphs.map((paragraph,i) => <p key={i}>{paragraph}</p>)}</section>)}<p className="article-reading-note">Educational overview only — not legal advice. Confirm requirements with counsel for your products and markets.</p></div></div>;
}
