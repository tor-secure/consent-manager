"use client";

import { lazy, Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useReducedMotion, useScroll, useSpring } from "motion/react";
import type { DemoPurposes } from "@/lib/privacy-learning-demo";
import { PrivacyDiagram } from "./scroll-story";

const Canvas=lazy(()=>import("./privacy-journey-canvas"));
const subscribe=()=>()=>{};

function PrivacyOverviewDiagram() {
  return <svg className="privacy-overview-diagram" viewBox="0 0 440 320" fill="none" role="img" aria-label="Illustration: notice leads to a choice, continuing safeguards, and connected evidence.">
    <path d="M115 95h60m90 0h60m35 50v67H245" stroke="#9cb88b" strokeWidth="1.5"/>
    <path d="m168 89 7 6-7 6m150-12 7 6-7 6m-73 106-7 6 7 6" stroke="#c9dbb2" strokeWidth="1.5"/>
    <g stroke="#c9dbb2" strokeWidth="1.5"><rect x="49" y="59" width="61" height="78" rx="8" fill="#3b5b41"/><path d="M64 79h30m-30 16h30m-30 16h21"/></g>
    <g><rect x="181" y="65" width="79" height="61" rx="25" fill="#b8d49a"/><path d="m203 96 10 10 23-24" stroke="#294333" strokeWidth="2"/></g>
    <path d="m360 51 34 15-5 43c-3 13-15 24-29 31-14-7-26-18-29-31l-5-43 34-15Z" stroke="#c9dbb2" strokeWidth="1.5" fill="#3b5b41"/>
    <path d="m346 93 10 10 18-21" stroke="#c9dbb2" strokeWidth="2"/>
    <g><rect x="135" y="192" width="68" height="44" rx="9" fill="#708e66"/><rect x="167" y="207" width="68" height="44" rx="9" fill="#b8d49a"/><path d="M181 224h38m-38 12h27" stroke="#294333" strokeWidth="1.5"/></g>
    <g fill="#e6eddb" fontSize="20" textAnchor="middle"><text x="80" y="166">Notice</text><text x="220" y="166">Choice</text><text x="360" y="166">Safeguards</text><text x="185" y="281">Evidence</text></g>
  </svg>;
}

/** Only scenes near the viewport own a GPU context; leaving releases all resources. */
export function PrivacyStage({chapter,diagram,enabled=true,purposes={analytics:false,advertising:false},historical=false,selected=null,guardianRequired=false,onInspect}:{chapter:string;diagram:"purpose"|"notice"|"choice"|"rights"|"record";enabled?:boolean;purposes?:DemoPurposes;historical?:boolean;selected?:string|null;guardianRequired?:boolean;onInspect:(id:string|null)=>void}) {
  const host=useRef<HTMLDivElement>(null);
  const ready=useSyncExternalStore(subscribe,()=>true,()=>false);
  const reduced=useReducedMotion();
  const [visible,setVisible]=useState(false);
  const {scrollYProgress}=useScroll({target:host,offset:["start end","end start"]});
  const progress=useSpring(scrollYProgress,{stiffness:110,damping:28});
  useEffect(()=>{if(!host.current)return;const observer=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting),{rootMargin:"80px"});observer.observe(host.current);return()=>observer.disconnect();},[]);
  const live=ready && !reduced && visible && enabled;
  return <div ref={host} className="privacy-stage" data-scene={chapter}>
    <div className="privacy-stage-diagram">{chapter === "Overview" ? <PrivacyOverviewDiagram/> : <PrivacyDiagram kind={diagram}/>}</div>
    {live && <Suspense fallback={null}><Canvas progress={progress} purposes={purposes} historical={historical} chapter={chapter} inspectedObject={selected} guardianRequired={guardianRequired} onInspect={onInspect}/></Suspense>}
    <span className="privacy-stage-caption">{chapter === "Overview" ? "Notice → choice → safeguards → evidence" : "Illustrative model · explore the controls below"}</span>
  </div>;
}
