"use client";

import { useEffect, useLayoutEffect, useReducer, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { DPDP_CONSENT_POINTS, DPDP_NOTICE_POINTS, DPDP_RIGHTS, DPDP_DUTIES } from "@/content/dpdp-act";
import { createLearningDemo, currentDemoPurposes, inspectedDemoEvent, learningDemoReducer, type DemoPurposes } from "@/lib/privacy-learning-demo";
import { DirectionIcon } from "@/components/ui/direction-icon";

import { JourneyObjectControls, journeyObjectInfo } from "./journey-object-controls";
import { PrivacyStage } from "./privacy-stage";
import { PrivacyInfoWindow } from "./privacy-info-window";


const subscribeReady = () => () => {};
const compactQuery="(max-height: 700px), (max-width: 767px)";
const subscribeShort = (callback: () => void) => { const query=window.matchMedia(compactQuery); query.addEventListener("change",callback); return()=>query.removeEventListener("change",callback); };
const getShort = () => window.matchMedia(compactQuery).matches;
const scenes = [
  { id: "Purpose", title: "Every journey", accent: "needs a purpose.", body: "Follow an illustrative piece of personal data. Processing needs consent or a legitimate use specifically listed by the Act; its scope should match the purpose.", reference: "what-is-the-dpdp-act", diagram: "purpose" },
  { id: "Notice", title: "First,", accent: "make it clear.", body: "Before the choice, explain the data and the purpose. Show how to withdraw, exercise rights, and make a complaint. At the end of this journey, explore how the notice, choice, and record connect.", reference: "notice", diagram: "notice" },
  { id: "Consent", title: "Your data.", accent: "Your decision.", body: "Try a purpose-level choice. Draft selections do not open a path: record the demonstration choice to see its effect. Nothing here changes your actual consent.", reference: "consent", diagram: "choice" },
  { id: "Withdrawal", title: "A choice can", accent: "change course.", body: "Withdraw the demonstration choice. The optional paths close, while its earlier record stays in the example history. Drag the timeline to inspect that earlier state.", reference: "rights", diagram: "rights" },
  { id: "Children", title: "Some journeys need", accent: "another safeguard.", body: "The Act provides special protection for children’s data. This example illustrates a guardian checkpoint; a visual checkpoint is not real age or guardian verification.", reference: "children", diagram: "notice" },
  { id: "Responsibility", title: "Beyond the choice,", accent: "responsibility stays.", body: "Security, processors, retention, and rights requests still matter. An organisation’s duties do not disappear when a visitor clicks a button or when a vendor processes the data.", reference: "duties", diagram: "record" },
  { id: "Evidence", title: "Remember the choice.", accent: "Respect the person.", body: "Explore your demonstration record: the example notice, decision, and time. This illustrates traceability; it is not a signed receipt or proof of legal compliance.", reference: "lifecycle", diagram: "record" },
] as const;
const explanations = {
  Notice: "The notice explains what is requested and why, before a consent decision.",
  Choice: "Only an explicit recorded demo decision opens its selected optional paths. Draft changes stay drafts.",
  Record: "The example history preserves earlier decisions when the current demo choice is withdrawn.",
};

function JourneyChapter({id,index,active,staticReading,children}:{id:string;index:number;active:number;staticReading:boolean;children:ReactNode}) {
  const marker=useRef<HTMLDivElement>(null);
  const {scrollYProgress}=useScroll({target:marker,offset:["start 160px","start -640px"]});
  const progress=useSpring(scrollYProgress,{stiffness:180,damping:36});
  const scale=useTransform(progress,[0,.35,1],[1,1,.92]);
  const rotateX=useTransform(progress,[0,.35,1],[0,0,-2]);
  const style={"--stack-index":index} as CSSProperties;
  return <><div ref={marker} className="journey-scroll-marker" id={`${id}-anchor`} style={style} aria-hidden="true"/><article className="journey-scene" id={id} data-index={index} style={style} inert={!staticReading && index<active}><motion.div className="journey-scene-inner" style={staticReading ? undefined : {scale,rotateX}}>{children}</motion.div></article></>;
}

export function PrivacyJourney() {
  const root = useRef<HTMLElement>(null);

  const reduce = useReducedMotion();
  const ready = useSyncExternalStore(subscribeReady,()=>true,()=>false);
  const short = useSyncExternalStore(subscribeShort,getShort,()=>false);
  const [stackFits,setStackFits]=useState(true);
  const fallbackTarget=useRef<string|null>(null);
  const baseReading=!ready || Boolean(reduce) || short;
  const staticReading = baseReading || !stackFits;
  const [active,setActive] = useState(0);
  const [demo,dispatch] = useReducer(learningDemoReducer,undefined,createLearningDemo);
  const [hotspot,setHotspot] = useState<keyof typeof explanations>("Notice");
  const [childExample,setChildExample] = useState(true);
  const [inspectedObject,setInspectedObject]=useState<string|null>(null);
  const [detail,setDetail]=useState<string|null>(null);
  useLayoutEffect(()=>{
    if(stackFits || !fallbackTarget.current)return;
    const tile=document.getElementById(fallbackTarget.current);
    if(tile)window.scrollTo({top:window.scrollY+tile.getBoundingClientRect().top-140,behavior:'instant'});
    fallbackTarget.current=null;
  },[stackFits]);
  useEffect(()=>{
    // Zoom, translated copy and expanded history must never trap content below a sticky tile.
    const reset=()=>setStackFits(true);
    window.addEventListener('resize',reset);
    if(baseReading || !stackFits)return()=>window.removeEventListener('resize',reset);
    const measure=()=>{
      const oversized=[...(root.current?.querySelectorAll<HTMLElement>('.journey-scene') ?? [])].some(tile=>tile.offsetHeight+parseFloat(getComputedStyle(tile).top)>innerHeight-16);
      if(oversized){const current=root.current?.querySelector('.journey-progression [aria-current]')?.textContent?.trim();fallbackTarget.current=current ? 'journey-'+current : null;setStackFits(false);}
    };
    const observer=new ResizeObserver(measure);
    root.current?.querySelectorAll('.journey-scene-inner').forEach(tile=>observer.observe(tile));measure();
    return()=>{observer.disconnect();window.removeEventListener('resize',reset);};
  },[baseReading,stackFits]);
  useEffect(()=>{
    let frame=0;
    const measure=()=>{frame=0;let current=0;root.current?.querySelectorAll<HTMLElement>('.journey-scroll-marker').forEach((marker,index)=>{const tile=document.getElementById(marker.id.replace('-anchor',''));if(!tile)return;const top=staticReading ? innerHeight*.45 : parseFloat(getComputedStyle(tile).top);if((staticReading ? tile : marker).getBoundingClientRect().top<=top+2)current=index;});setActive(current);};
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(measure);};
    window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);measure();
    return()=>{cancelAnimationFrame(frame);window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);};
  },[staticReading]);
  const current=currentDemoPurposes(demo);
  const inspected=inspectedDemoEvent(demo);
  const historical=demo.inspecting !== null && demo.inspecting !== demo.history.at(-1)?.sequence;
  const visiblePurposes: DemoPurposes = historical ? inspected?.purposes ?? {analytics:false,advertising:false} : current;
  const scene=scenes[active];
  const ageGate=scene.id === "Children" && childExample;
  function inspectObject(id:string|null) { setInspectedObject(id); setDetail(null); }
  function go(index:number) {
    const tile=document.getElementById(`journey-${scenes[index].id}`);
    const marker=document.getElementById(`journey-${scenes[index].id}-anchor`);
    if(!tile || !marker)return;
    const top=staticReading ? 140 : parseFloat(getComputedStyle(tile).top);
    window.scrollTo({top:window.scrollY+(staticReading ? tile : marker).getBoundingClientRect().top-top,behavior:staticReading ? "auto" : "smooth"});
  }
  function controls(id:typeof scene.id) {
    if(id === "Consent") return <div className="journey-demo-choice">
      <fieldset><legend>Try a choice · demonstration only</legend>{(["analytics","advertising"] as const).map(purpose=><label key={purpose}><input type="checkbox" checked={demo.draft[purpose]} onChange={event=>dispatch({type:"draft",purpose,value:event.target.checked})} /><span>{purpose === "analytics" ? "Analytics" : "Advertising"}</span><span>Optional</span></label>)}</fieldset>
      <div className="journey-demo-actions"><button type="button" onClick={()=>dispatch({type:"record",timestamp:new Date().toISOString()})}>Record demo choice<DirectionIcon /></button><button type="button" onClick={()=>dispatch({type:"reset"})}>Reset demo</button></div>
      <p className="journey-demo-state" role="status">{demo.status === "unrecorded" ? "No demo decision recorded. Optional paths are closed." : `Current demo: ${demo.status}. Analytics ${current.analytics ? "on" : "off"}; advertising ${current.advertising ? "on" : "off"}.`}</p>
    </div>;
    if(id === "Withdrawal") return <div className="journey-withdrawal"><button type="button" disabled={demo.status !== "recorded"} onClick={()=>dispatch({type:"withdraw",timestamp:new Date().toISOString()})}>Withdraw demo consent<DirectionIcon direction="left" /></button>{!demo.history.length && <p>Record a choice in the Consent scene first.</p>}<p role="status">Current demo state: {demo.status}. {historical ? "Viewing earlier history does not reactivate the current choice." : ""}</p>{historyControl()}</div>;
    if(id === "Children") return <div className="journey-guardian"><div role="group" aria-label="Explore a guardian checkpoint"><button type="button" aria-pressed={childExample} onClick={()=>setChildExample(true)}>Child example</button><button type="button" aria-pressed={!childExample} onClick={()=>setChildExample(false)}>Adult example</button></div><p>{childExample ? "Guardian verification would be required here. Optional paths remain closed in this illustrative child example." : "An adult example still needs a lawful basis and an appropriate choice; selecting this example does not grant consent."}</p></div>;
    if(id === "Evidence") return <div className="journey-receipt"><h4>Illustrative record · not a cryptographic receipt</h4>{inspected ? <dl><div><dt>Example notice</dt><dd>Learning notice v1</dd></div><div><dt>Event</dt><dd>{inspected.kind === "decision" ? "Demo choice recorded" : "Demo choice withdrawn"}</dd></div><div><dt>Recorded time</dt><dd><time dateTime={inspected.recordedAt}>{new Date(inspected.recordedAt).toLocaleTimeString()}</time></dd></div><div><dt>Purposes at that event</dt><dd>Analytics {inspected.purposes.analytics ? "on" : "off"} · Advertising {inspected.purposes.advertising ? "on" : "off"}</dd></div></dl> : <p>Your example record appears after recording a demo choice.</p>}{historyControl()}</div>;
    return null;
  }
  function historyControl() {
    if(!demo.history.length) return null;
    const selected=Math.max(0,demo.history.findIndex(event=>event.sequence === inspected?.sequence));
    return <div className="journey-history"><label>Review demo history<input aria-label="Review demo history" type="range" min="0" max={Math.max(0,demo.history.length-1)} step="1" disabled={demo.history.length<2} value={selected} onChange={event=>dispatch({type:"inspect",sequence:demo.history[Number(event.target.value)].sequence})} /></label><div aria-live="polite"><span>{selected+1} / {demo.history.length} · {inspected?.kind === "withdrawal" ? "Withdrawal" : "Decision"}</span><button type="button" onClick={()=>dispatch({type:"inspect",sequence:null})}>Return to current state</button></div></div>;
  }
  const chapterNotes: Record<string, readonly {title:string;body:string}[]> = {
    Purpose: [DPDP_DUTIES[0], DPDP_CONSENT_POINTS[1]],
    Notice: [DPDP_NOTICE_POINTS[0], DPDP_NOTICE_POINTS[1]],
    Consent: [DPDP_CONSENT_POINTS[0], DPDP_CONSENT_POINTS[3]],
    Withdrawal: [DPDP_RIGHTS[1], DPDP_RIGHTS[2]],
    Responsibility: [DPDP_DUTIES[1], DPDP_DUTIES[4]],
  };
  const object=journeyObjectInfo(inspectedObject);
  const selectedScene=scenes.find(item=>item.id===detail);
  const captions:Record<string,string>={Purpose:'Start with a reason. Keep the data within its scope.',Notice:'Explain the data and the purpose before asking.',Consent:'Choose optional purposes. Record your example decision.',Withdrawal:'Close the paths. Keep the earlier decision traceable.',Children:'Explore the extra safeguard for a child’s data.',Responsibility:'A decision does not end an organisation’s duties.',Evidence:'Connect what was explained, decided, and recorded.'};
  return <section ref={root} className={'privacy-journey privacy-experience '+(staticReading ? 'journey-static' : 'journey-ready')} aria-label="Interactive privacy journey">
    <div className="journey-heading"><div><h2>Understand the choice.<em> Explore its consequences.</em></h2></div><span>Seven connected ideas<DirectionIcon direction="down" /></span></div>
    <nav className="journey-progression" aria-label="Journey progression">{scenes.map((item,index)=><button type="button" key={item.id} aria-current={active === index ? 'step' : undefined} onClick={()=>go(index)}><span aria-hidden="true" />{item.id}</button>)}</nav>
    <div className="privacy-scene-gallery">
      {scenes.map((item,index)=><JourneyChapter id={'journey-'+item.id} key={item.id} index={index} active={active} staticReading={staticReading}>
        <div className="privacy-scene-visual">
          <span className="privacy-scene-number">0{index+1} / {item.id}</span>
          <PrivacyStage chapter={item.id} diagram={item.diagram} enabled={staticReading || index===active || index===active+1} purposes={item.id==='Children' && childExample ? {analytics:false,advertising:false} : visiblePurposes} historical={historical} selected={inspectedObject} guardianRequired={item.id==='Children' && childExample} onInspect={inspectObject}/>
          <JourneyObjectControls chapter={item.id} selected={inspectedObject} onInspect={inspectObject}/>
        </div>
        <div className="journey-chapter-copy">
          <h3>{item.title}<em>{item.accent}</em></h3><p>{captions[item.id]}</p>
          {item.id !== 'Evidence' && controls(item.id)}
          <button type="button" className="privacy-scene-more" onClick={()=>{setInspectedObject(null);setDetail(item.id);}}> {item.id==='Evidence' ? 'Inspect demo record' : 'Explore '+item.id.toLowerCase()}<DirectionIcon direction="diagonal"/></button>
          <a href={'#'+item.reference} className="journey-explanation-link">Read the full explanation<DirectionIcon direction="diagonal" /></a>
        </div>
      </JourneyChapter>)}
    </div>
    <div className="journey-demo-summary"><span>{historical ? 'Historical demo preview' : 'Live demonstration'}</span><div className="journey-flow-map" aria-label="Illustrative optional paths"><span>Personal data</span><span className="journey-flow-stem" /><div><span data-open={!ageGate && visiblePurposes.analytics}>Analytics {!ageGate && visiblePurposes.analytics ? 'open' : 'closed'}</span><span data-open={!ageGate && visiblePurposes.advertising}>Advertising {!ageGate && visiblePurposes.advertising ? 'open' : 'closed'}</span></div></div><div className="journey-hotspots" role="group" aria-label="Explore the data journey">{(Object.keys(explanations) as (keyof typeof explanations)[]).map(point=><button key={point} type="button" aria-pressed={hotspot === point} onClick={()=>setHotspot(point)}>{point}<span aria-hidden="true" /></button>)}</div><p className="journey-hotspot-explanation" aria-live="polite">{explanations[hotspot]}</p><p className="journey-stage-footnote">Educational demonstration. Choices stay in page memory and are never sent to a consent API.</p></div>
    <PrivacyInfoWindow open={Boolean(object || selectedScene)} title={object?.title ?? (selectedScene ? selectedScene.title+' '+selectedScene.accent : 'Learning notes')} onClose={()=>{setInspectedObject(null);setDetail(null);}}>
      {object ? <p>{object.body}</p> : selectedScene && <><p>{selectedScene.body}</p>{chapterNotes[selectedScene.id] && <dl className="privacy-window-notes">{chapterNotes[selectedScene.id].map(note=><div key={note.title}><dt>{note.title}</dt><dd>{note.body}</dd></div>)}</dl>}{selectedScene.id==='Evidence' && controls('Evidence')}<a href={'#'+selectedScene.reference} onClick={()=>setDetail(null)}>Read the full explanation<DirectionIcon direction="diagonal"/></a></>}
    </PrivacyInfoWindow>
  </section>;
}
