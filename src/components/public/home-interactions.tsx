"use client";

import { useEffect } from "react";

const anchorTargets: Record<string, string> = {
  product: "product",
  features: "features",
  solutions: "how-it-works",
  resources: "site-footer",
  pricing: "pricing",
  company: "site-footer",
  legal: "site-footer",
  "how-it-works": "how-it-works",
};

function getScrollOffset() {
  const header = document.querySelector("header");
  return (header?.getBoundingClientRect().height ?? 64) + 18;
}

export function HomeInteractions() {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    function scrollToHash(hash: string) {
      const cleanHash = hash.replace("#", "");
      const targetId = anchorTargets[cleanHash] ?? cleanHash;
      const target = document.getElementById(targetId);

      if (!target) {
        return false;
      }

      const top = target.getBoundingClientRect().top + window.scrollY - getScrollOffset();

      window.scrollTo({
        top: Math.max(0, top),
        behavior: reducedMotion.matches ? "auto" : "smooth",
      });

      window.history.pushState(null, "", `#${cleanHash}`);

      if (target instanceof HTMLElement) {
        target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      }

      return true;
    }

    function handleAnchorClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
      if (!link) {
        return;
      }

      const href = link.getAttribute("href");
      if (!href || href === "#") {
        return;
      }

      if (scrollToHash(href)) {
        event.preventDefault();
      }
    }

    document.addEventListener("click", handleAnchorClick);

    if (window.location.hash) {
      window.requestAnimationFrame(() => {
        scrollToHash(window.location.hash);
      });
    }

    return () => {
      document.removeEventListener("click", handleAnchorClick);
    };
  }, []);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const revealItems = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".public-reveal, .public-scale-reveal, .public-float-card",
      ),
    );

    if (reducedMotion.matches || !("IntersectionObserver" in window)) {
      revealItems.forEach((item) => item.classList.add("is-visible"));
      return;
    }

    document.documentElement.classList.add("public-io-ready");

    const groupedParents = new Map<Element, number>();
    revealItems.forEach((item) => {
      const parent = item.parentElement ?? document.body;
      const index = groupedParents.get(parent) ?? 0;
      groupedParents.set(parent, index + 1);
      item.style.setProperty("--public-stagger", `${Math.min(index * 55, 280)}ms`);
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: "0px 0px -12% 0px",
        threshold: 0.14,
      },
    );

    revealItems.forEach((item) => observer.observe(item));

    return () => {
      observer.disconnect();
      document.documentElement.classList.remove("public-io-ready");
    };
  }, []);

  return null;
}
