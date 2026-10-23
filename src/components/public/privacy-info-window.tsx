"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

/** Native modal: focus containment, Escape, and focus restoration are browser managed. */
export function PrivacyInfoWindow({open,title,children,onClose}:{open:boolean;title:string;children:ReactNode;onClose:()=>void}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const titleId=useId();
  const reduced=useReducedMotion();
  useEffect(()=>{
    const element=dialog.current;
    if(!element || !open)return;
    const previous=document.activeElement;
    const overflow=document.body.style.overflow;
    element.showModal();document.body.style.overflow="hidden";
    return()=>{element.close();document.body.style.overflow=overflow;if(previous instanceof HTMLElement && previous.isConnected)previous.focus({preventScroll:true});};
  },[open]);
  return <dialog ref={dialog} className="privacy-info-window" aria-labelledby={titleId} onCancel={onClose} onClose={()=>{if(open)onClose();}} onClick={event=>{if(event.target===event.currentTarget){const bounds=event.currentTarget.getBoundingClientRect();if(event.clientX<bounds.left || event.clientX>bounds.right || event.clientY<bounds.top || event.clientY>bounds.bottom)onClose();}}}>
    <motion.div key={open ? title : "closed"} initial={reduced ? false : {y:18,scale:.97}} animate={{y:0,scale:1}} transition={{type:"spring",stiffness:260,damping:28}}>
      <header><button type="button" aria-label="Close explanation" onClick={onClose}>×</button></header>
      <h2 id={titleId}>{title}</h2><div className="privacy-window-content">{children}</div>
    </motion.div>
  </dialog>;
}
