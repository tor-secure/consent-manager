"use client";

import { useState } from "react";
import { m, useReducedMotion } from "motion/react";
import { MotionProvider } from "@/components/ui/motion-provider";

const stages = [
  { title: "Consent", description: "Give people clear choices, then record their decision against the active policy.", detail: "Policy-linked decisions", items: ["Purpose choices", "Consent session", "Policy version"] },
  { title: "Discovery", description: "Observe browser activity and connect sanitized metadata to its page and destination.", detail: "Browser-observed activity", items: ["Website & page", "Destination", "Runtime observation"] },
  { title: "Evidence", description: "Inspect the source of each finding and distinguish observed behavior from configured intelligence.", detail: "Traceable privacy evidence", items: ["Observed provenance", "Consent proof", "Privacy Graph"] },
];

function Flow() {
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();
  return <div className="privacy-flow-preview">
    <div className="privacy-flow-heading"><span>Consent Guru</span><span>Platform walkthrough</span></div>
    <div className="privacy-flow-switcher" aria-label="Explore the privacy workflow">{stages.map((stage, index) => <button key={stage.title} type="button" aria-pressed={active === index} onClick={() => setActive(index)}>{stage.title}{index < 2 && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6" /></svg>}</button>)}</div>
    <div className="privacy-flow-diagram" aria-hidden="true"><svg viewBox="0 0 440 140" fill="none"><path d="M65 70h310" stroke="#34596b" /><m.path d="M65 70h310" stroke="#8bddc7" strokeWidth="2" initial={false} animate={{ pathLength: (active + 1) / 3 }} transition={{ duration: reduce ? 0 : 0.3 }} />{[65, 220, 375].map((x, index) => <g key={x}><circle cx={x} cy="70" r="27" fill={index <= active ? "#1b524f" : "#173648"} stroke={index === active ? "#a1e6d5" : "#426474"} strokeWidth={index === active ? 2 : 1} /><path d={index === 0 ? `M${x-9} 70l6 6 12-12` : index === 1 ? `M${x-10} 70h5l5-8 5 16 5-8h4` : `M${x-8} 60h16v20h-16zM${x-4} 67h8M${x-4} 73h8`} stroke="#d1f7ec" strokeWidth="1.6" strokeLinejoin="round" /></g>)}</svg></div>
    <div className="privacy-flow-content" aria-live="polite"><h2>{stages[active].detail}</h2><p>{stages[active].description}</p><ul>{stages[active].items.map((item) => <li key={item}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>{item}</li>)}</ul></div>
    <p className="privacy-flow-caption">Illustrative workflow · explore each stage</p>
  </div>;
}

export function PrivacyFlowPreview() { return <MotionProvider><Flow /></MotionProvider>; }
