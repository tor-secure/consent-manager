"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { DirectionIcon } from "@/components/ui/direction-icon";
import { PrivacyStage } from "./privacy-stage";
import { PrivacyInfoWindow } from "./privacy-info-window";

const ideas=[
  {id:"notice-data",label:"Notice",title:"Clarity before a choice",body:"A notice explains the personal data requested and its purpose, together with withdrawal, rights, and the complaint route. Explore the notice model below.",chapter:"Notice"},
  {id:"choice",label:"Choice",title:"A choice belongs to the person",body:"Consent is a specific, informed decision. The interactive example lets you record and withdraw optional choices without changing your real consent.",chapter:"Consent"},
  {id:"guardian",label:"Safeguards",title:"Responsibility continues",body:"Organisations still have security, retention, processor, and rights responsibilities. Children’s data needs special safeguards. The checkpoint here is illustrative, not real guardian verification.",chapter:"Children"},
  {id:"evidence-time",label:"Evidence",title:"Connect the notice and decision",body:"A useful record connects what was explained, what was decided, and when. This page’s example is educational; it is not a signed receipt or proof of compliance.",chapter:"Evidence"},
] as const;

export function PrivacyHero() {
  const [selected,setSelected]=useState<string|null>(null);
  const reduced=useReducedMotion();
  const idea=ideas.find(item=>item.id===selected || (item.label==="Notice" && selected?.startsWith("notice-")) || (item.label==="Evidence" && selected?.startsWith("evidence-")));
  return <section className="privacy-world-hero">
    <div className="privacy-hero-copy">
      <nav aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><span>DPDP Act</span></nav>
      <motion.h1 initial={reduced ? false : {y:24}} animate={{y:0}} transition={{duration:.7}}>Personal data.<br/><em>Personal choice.</em></motion.h1>
      <p>India’s Digital Personal Data Protection Act, 2023.<br/>Explore the relationship between data, decisions, and responsibility.</p>
      <a className="privacy-hero-action" href="#privacy-story">Enter the experience<DirectionIcon direction="down"/></a>
      <p className="privacy-hero-note">Informational only. A platform supports a privacy programme; it does not establish legal compliance.</p>
    </div>
    <div className="privacy-hero-world">
      <PrivacyStage chapter="Overview" diagram="purpose" selected={selected} onInspect={setSelected}/>
      <div className="privacy-hero-orientation"><span>One connected privacy story</span><span>Explore the objects or choose a topic.</span></div>
      <div className="privacy-hero-points" role="group" aria-label="Explore the privacy story">{ideas.map(item=><button type="button" key={item.id} onClick={()=>setSelected(item.id)}>{item.label}<DirectionIcon direction="diagonal"/></button>)}</div>
    </div>
    <PrivacyInfoWindow open={Boolean(idea)} title={idea?.title ?? "Privacy story"} onClose={()=>setSelected(null)}><p>{idea?.body}</p><a href={`#journey-${idea?.chapter}`} onClick={()=>setSelected(null)}>Explore this scene<DirectionIcon direction="down"/></a></PrivacyInfoWindow>
  </section>;
}
