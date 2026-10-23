"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "motion/react";
import { DirectionIcon } from "@/components/ui/direction-icon";

export type PrivacyStory = { id: string; title: string; accent: string; body: string; reference: string; diagram: "purpose" | "notice" | "choice" | "rights" | "record" };
const subscribe = () => () => {};
const compactQuery = "(max-height: 650px)";
const subscribeCompact = (callback: () => void) => { const query = window.matchMedia(compactQuery); query.addEventListener("change", callback); return () => query.removeEventListener("change", callback); };
const getCompact = () => window.matchMedia(compactQuery).matches;

/** Geometric diagrams explain relationships; these are illustrations, not measured results. */
export function PrivacyDiagram({ kind }: { kind: PrivacyStory["diagram"] }) {
  const descriptions = { purpose: "Illustration: personal data is connected to a specific processing purpose.", notice: "Illustration: the notice is read before a decision.", choice: "Illustration: accepting and rejecting are both available, with neither preselected.", rights: "Illustration: consent can be given, reviewed, and withdrawn.", record: "Illustration: a consent record connects policy, decision, and time." };
  return <div className={`privacy-diagram privacy-diagram-${kind}`} role="img" aria-label={descriptions[kind]}>
    <svg viewBox="0 0 440 440" fill="none" aria-hidden="true">
      <circle cx="220" cy="220" r="193" stroke="currentColor" strokeOpacity=".16" />
      <circle cx="220" cy="220" r="156" stroke="currentColor" strokeOpacity=".12" />
      {kind === "purpose" && <><path d="M74 220h113m66 0h113" stroke="currentColor" strokeWidth="1.5" /><circle cx="220" cy="220" r="65" fill="currentColor" fillOpacity=".07" /><circle cx="74" cy="220" r="7" fill="currentColor" /><circle cx="366" cy="220" r="7" fill="currentColor" /><path d="m354 212 12 8-12 8" stroke="currentColor" strokeWidth="1.5" /></>}
      {kind === "notice" && <><rect x="110" y="90" width="220" height="260" rx="24" fill="var(--story-paper)" /><path d="M147 156h146M147 180h111M147 239h146M147 263h94" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><circle cx="294" cy="315" r="27" fill="var(--story-accent)" /><path d="m285 315 6 6 13-13" stroke="var(--story-ink)" strokeWidth="2" strokeLinecap="round" /></>}
      {kind === "choice" && <><path d="M220 78v115m0 0L118 277m102-84 102 84" stroke="currentColor" strokeWidth="1.5" /><circle cx="220" cy="78" r="7" fill="currentColor" /><rect x="50" y="276" width="138" height="60" rx="30" fill="var(--story-paper)" /><rect x="252" y="276" width="138" height="60" rx="30" fill="var(--story-paper)" /><text x="119" y="312" textAnchor="middle" fill="currentColor">Accept</text><text x="321" y="312" textAnchor="middle" fill="currentColor">Reject</text></>}
      {kind === "rights" && <><path d="M330 142a146 146 0 1 1-169-55" stroke="currentColor" strokeWidth="1.5" /><path d="m146 79 16 8-9 17" stroke="currentColor" strokeWidth="1.5" /><circle cx="220" cy="220" r="68" fill="var(--story-paper)" /><path d="M197 221h46m-22-23v46" stroke="currentColor" strokeWidth="1.5" /></>}
      {kind === "record" && <><rect x="115" y="77" width="210" height="286" rx="22" fill="var(--story-paper)" /><path d="M148 153h144M148 218h144M148 283h144" stroke="currentColor" strokeOpacity=".2" /><text x="148" y="135" fill="currentColor">Policy</text><text x="148" y="200" fill="currentColor">Decision</text><text x="148" y="265" fill="currentColor">Time</text><path d="m258 320 9 9 18-18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></>}
    </svg>
    {kind === "purpose" && <><span className="diagram-core">A specific<br />purpose.</span><span className="diagram-top">Personal data</span><span className="diagram-bottom">Collect only what is necessary</span></>}
    {kind === "notice" && <span className="diagram-bottom">Understand before you decide</span>}
    {kind === "choice" && <><span className="diagram-core diagram-choice-label">Your choice.</span><span className="diagram-bottom">Illustration · neither choice is preselected</span></>}
    {kind === "rights" && <><span className="diagram-top">Give · review · withdraw</span><span className="diagram-bottom">Control continues after the decision</span></>}
    {kind === "record" && <span className="diagram-bottom">A record of the choice, not a claim of compliance</span>}
  </div>;
}

export function ScrollStory({ stories }: { stories: readonly PrivacyStory[] }) {
  const root = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  const compact = useSyncExternalStore(subscribeCompact, getCompact, () => false);
  const staticReading = !ready || Boolean(reduce) || compact;
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: root, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, [0, 1], ["0%", `-${((stories.length - 1) / stories.length) * 100}%`]);
  useMotionValueEvent(scrollYProgress, "change", progress => setActive(Math.round(progress * (stories.length - 1))));
  function go(index: number) {
    if (!root.current) return;
    if (staticReading) { document.getElementById(`story-${stories[index].id}`)?.scrollIntoView(); return; }
    const start = root.current.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: start + index / (stories.length - 1) * (root.current.offsetHeight - window.innerHeight), behavior: "smooth" });
  }
  return <section ref={root} className={`scroll-story ${staticReading ? "story-static" : "story-ready"}`} aria-label="DPDP scroll story" style={{ "--story-count": stories.length } as React.CSSProperties}>
    <div className="scroll-story-pin">
      <div className="scroll-story-heading"><h2>The Act, <em>in practice.</em></h2><span>{staticReading ? "Read at your pace" : "Scroll to move through the story"}<DirectionIcon direction="down" /></span></div>
      <div className="scroll-story-window">
        <motion.div className="scroll-story-track" style={{ x: staticReading ? 0 : x, width: staticReading ? "100%" : `${stories.length * 100}%` }}>
          {stories.map((story, index) => <article className={`scroll-story-slide story-tone-${index}`} key={story.id} id={`story-${story.id}`} aria-hidden={!staticReading && active !== index} style={{ width: staticReading ? "100%" : `${100 / stories.length}%` }}>
            <div className="scroll-story-copy"><span className="story-position">{index + 1} / {stories.length}</span><h3>{story.title}<br /><em>{story.accent}</em></h3><p>{story.body}</p><a href={`#${story.reference}`} tabIndex={staticReading || active === index ? 0 : -1}>Read the full explanation<DirectionIcon direction="diagonal" /></a></div>
            <PrivacyDiagram kind={story.diagram} />
          </article>)}
        </motion.div>
      </div>
      <nav className="scroll-story-navigation" aria-label="Story progression">{stories.map((story,index) => <button type="button" key={story.id} onClick={() => go(index)} aria-current={!staticReading && active === index ? "step" : undefined}><span className="story-nav-progress" aria-hidden="true"><motion.span style={{ scaleX: staticReading || active > index ? 1 : active === index ? scrollYProgress : 0 }} /></span>{story.id}</button>)}</nav>
    </div>
  </section>;
}
