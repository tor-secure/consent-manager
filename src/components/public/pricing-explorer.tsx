"use client";

import { DirectionIcon } from "@/components/ui/direction-icon";

import { useId, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

type Plan = { id: string; name: string; badge: string; detail: string; points: readonly string[] };
export function PricingExplorer({ plans }: { plans: readonly Plan[] }) {
  const [active, setActive] = useState(0);
  const id = useId();
  const reduce = useReducedMotion();
  return <div className="pricing-explorer">
    <div className="pricing-plan-navigation" role="tablist" aria-label="Choose a plan to explore">{plans.map((plan, index) => <button key={plan.id} type="button" role="tab" id={`${id}-${plan.id}`} aria-controls={`${id}-panel-${plan.id}`} aria-selected={active === index} tabIndex={active === index ? 0 : -1} onClick={() => setActive(index)} onKeyDown={event => { if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return; event.preventDefault(); const next = event.key === "Home" ? 0 : event.key === "End" ? plans.length - 1 : (active + (event.key === "ArrowRight" ? 1 : -1) + plans.length) % plans.length; setActive(next); document.getElementById(`${id}-${plans[next].id}`)?.focus(); }}><span>{plan.name}</span><span>{plan.badge}</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5" /></svg></button>)}</div>
    {plans.map((plan, index) => <motion.div key={plan.id} id={`${id}-panel-${plan.id}`} role="tabpanel" aria-labelledby={`${id}-${plan.id}`} hidden={active !== index} initial={false} animate={active === index ? { opacity: 1, y: 0 } : { opacity: .65, y: reduce ? 0 : 8 }} transition={{ duration: reduce ? 0 : .28 }} className="pricing-plan-detail" tabIndex={0}><div><h2>{plan.name}</h2><p>{plan.detail}</p><a href={`/pricing?plan=${plan.id}#enquiry`} className="btn btn-primary">Request {plan.name} <DirectionIcon direction="diagonal" /></a><span className="pricing-quote-note">Prices are quoted for your sites and traffic.</span></div><ul>{plan.points.map(point => <li key={point}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m5 12 4 4 10-10" /></svg>{point}</li>)}</ul></motion.div>)}
    <details className="pricing-full-comparison"><summary>Compare all three plans</summary><div>{plans.map(plan => <section key={plan.id}><h3>{plan.name}</h3><ul>{plan.points.map(point => <li key={point}>{point}</li>)}</ul><a href={`/pricing?plan=${plan.id}#enquiry`}>Request {plan.name}</a></section>)}</div></details>
  </div>;
}
