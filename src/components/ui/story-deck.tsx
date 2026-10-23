"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

export type StoryItem = { title: string; body: string; label?: string };

/** A user-controlled carousel; every item also remains available as a transcript. */
export function StoryDeck({ items, label, sequential = false }: { items: readonly StoryItem[]; label: string; sequential?: boolean }) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const reduce = useReducedMotion();
  const id = useId();
  if (!items.length) return null;
  const selected = items[index] ?? items[0];
  function move(next: number) {
    if (next < 0 || next >= items.length || next === index) return;
    setDirection(next > index ? 1 : -1);
    setIndex(next);
  }
  return <div className={`story-deck ${sequential ? "story-deck-sequence" : ""}`} role="region" aria-roledescription="carousel" aria-label={label}>
    <div className="story-deck-index" aria-label={`${label} topics`}>
      {items.map((item, i) => <button key={item.title} type="button" aria-pressed={i === index} aria-controls={id} onClick={() => move(i)}>
        {sequential && <span className="story-step-number" aria-hidden="true">{i + 1}</span>}
        <span>{item.title}</span><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
      </button>)}
    </div>
    <div className="story-deck-stage">
      <div className="story-deck-position"><span>{label}</span><span>{index + 1} / {items.length}</span></div>
      <div id={id} className="story-deck-window" aria-live="polite" aria-atomic="true">
        <AnimatePresence mode="wait" initial={false}>
          <motion.article key={index} role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${items.length}`} initial={{ opacity: 0.65, x: reduce ? 0 : 24 * direction }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0.65, x: reduce ? 0 : -16 * direction }} transition={{ duration: reduce ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }} onPanEnd={(_, info) => { if (Math.abs(info.offset.x) > 60 && Math.abs(info.offset.x) > Math.abs(info.offset.y) * 1.5) move(index + (info.offset.x < 0 ? 1 : -1)); }} style={{ touchAction: "pan-y" }}>
            <h3>{selected.title}</h3>
            {selected.label && <span className="story-deck-label">{selected.label}</span>}
            <p>{selected.body}</p>
          </motion.article>
        </AnimatePresence>
      </div>
      <div className="story-deck-controls">
        <span className="story-deck-track" aria-hidden="true"><motion.span initial={false} animate={{ width: `${((index + 1) / items.length) * 100}%` }} transition={{ duration: reduce ? 0 : 0.35 }} /></span>
        <button type="button" onClick={() => move(index - 1)} disabled={index === 0} aria-label={`Previous ${label} topic`}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m14 5-7 7 7 7M7 12h14" /></svg></button>
        <button type="button" onClick={() => move(index + 1)} disabled={index === items.length - 1} aria-label={`Next ${label} topic`}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m10 5 7 7-7 7M17 12H3" /></svg></button>
      </div>
    </div>
    <details className="story-deck-transcript"><summary>Read all {items.length} topics<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M5 12h14M12 5v14" /></svg></summary><dl>{items.map(item => <div key={item.title}><dt>{item.title}</dt><dd>{item.label && <strong>{item.label}. </strong>}{item.body}</dd></div>)}</dl></details>
  </div>;
}
