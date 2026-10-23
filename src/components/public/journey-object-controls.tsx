"use client";



const objects = {
  Notice: [
    {id:"notice-data",label:"Example data",title:"What is requested?",body:"This learning notice uses an example page visit. A real notice needs to identify the personal data requested; this demonstration collects no page-visit data."},
    {id:"notice-purpose",label:"Example purpose",title:"Why is it requested?",body:"The example purpose is usage measurement. A real request should specify its purpose and limit the data to what that purpose needs."},
    {id:"notice-rights",label:"Control and rights",title:"What happens after the choice?",body:"Explain withdrawal, Data Principal rights, and the complaint route before asking for consent. You can try withdrawal in the next part of this learning journey."},
  ],
  Children: [
    {id:"guardian",label:"Guardian checkpoint",title:"An illustrative checkpoint",body:"The checkpoint represents a safeguard for a child example. Clicking it does not verify age, authenticate a guardian, or grant consent. The child example keeps optional paths closed."},
  ],
  Evidence: [
    {id:"evidence-notice",label:"Notice",title:"The notice at the time",body:"Learning notice v1 is the example associated with this record. Keeping the notice version connects a choice to what the person was told."},
    {id:"evidence-decision",label:"Decision",title:"The choice at that event",body:"The written record beside this scene shows the purposes selected at the inspected event. Looking at an earlier event never reactivates the current demo choice."},
    {id:"evidence-time",label:"Time",title:"When the example happened",body:"The timestamp comes from recording your demo choice in this page. This is an illustrative record, not a signed consent receipt or cryptographic proof."},
  ],
} as const;

export function journeyObjectInfo(id:string|null) { return Object.values(objects).flat().find(item=>item.id===id); }

export function JourneyObjectControls({chapter,selected,onInspect}:{chapter:string;selected:string|null;onInspect:(id:string|null)=>void}) {
  const items=objects[chapter as keyof typeof objects];
  if(!items)return null;
  return <div className="journey-object-controls">
    <p>{chapter === "Notice" ? "Explore the learning notice" : chapter === "Children" ? "Inspect the checkpoint" : "Inspect the illustrative record"}</p>
    <div role="group" aria-label={`${chapter} scene objects`}>{items.map(item=><button id={`journey-trigger-${item.id}`} type="button" key={item.id} aria-pressed={selected === item.id} onClick={()=>onInspect(item.id)}>{item.label}</button>)}</div>

  </div>;
}
