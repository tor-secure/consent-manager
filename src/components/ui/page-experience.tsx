"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { animate } from "motion";

/** Progressive enhancement. Content is visible before JavaScript and on reduced motion. */
export function PageExperience() {
  const pathname = usePathname();
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const seen = new WeakSet<Element>();
    const animations = new Set<ReturnType<typeof animate>>();
    let frame = 0;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        if (preference.matches) return;
        const node = entry.target as HTMLElement;
        if (node.closest("[hidden]") || node.getBoundingClientRect().height > window.innerHeight * 2) return;
        const animation = animate(node, { opacity: [0.8, 1], y: [16, 0] }, { duration: 0.5, ease: [0.22, 1, 0.36, 1] });
        animations.add(animation);
        void animation.then(() => animations.delete(animation));
      });
    }, { threshold: 0.04, rootMargin: "0px 0px -24px 0px" });
    const discover = () => {
      frame = 0;
      document.querySelectorAll(".public-page main > section, .public-page main > div > section, .dashboard-workspace .page-wrap > :not(header), [data-enter]").forEach(node => {
        if (seen.has(node) || node.tagName === "SCRIPT" || node.matches("[hidden]")) return;
        seen.add(node);
        observer.observe(node);
      });
    };
    const mutations = new MutationObserver(() => { if (!frame) frame = requestAnimationFrame(discover); });
    mutations.observe(document.body, { childList: true, subtree: true });
    const stopMotion = () => { if (preference.matches) animations.forEach(animation => animation.complete()); };
    preference.addEventListener("change", stopMotion);
    discover();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); mutations.disconnect(); animations.forEach(animation => animation.complete()); preference.removeEventListener("change", stopMotion); };
  }, [pathname]);
  return null;
}
