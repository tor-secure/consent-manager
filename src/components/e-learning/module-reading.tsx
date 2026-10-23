"use client";

import { DirectionIcon } from "@/components/ui/direction-icon";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

export function ModuleReading({ paragraphs }: { paragraphs: readonly string[] }) {
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();
  return <div className="module-reading"><div className="module-reading-position"><span>Read at your pace</span><span>{active + 1} / {paragraphs.length}</span></div><AnimatePresence mode="wait" initial={false}><motion.p key={active} initial={{ opacity: .65, x: reduce ? 0 : 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: .65 }} transition={{ duration: reduce ? 0 : .2 }}>{paragraphs[active]}</motion.p></AnimatePresence><nav aria-label="Module reading"><button type="button" disabled={active === 0} onClick={() => setActive(active - 1)}><DirectionIcon direction="left" /> Previous</button><div aria-hidden="true">{paragraphs.map((_, index) => <span key={index} data-current={index === active} />)}</div><button type="button" disabled={active === paragraphs.length - 1} onClick={() => setActive(active + 1)}>Continue <DirectionIcon /></button></nav><details><summary>Read the complete module</summary>{paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</details></div>;
}
