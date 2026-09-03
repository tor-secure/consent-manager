"use client";

import { useEffect } from "react";

const anchorTargets: Record<string, string> = {
  product: "product",
  features: "features",
  solutions: "solutions",
  resources: "resources",
  pricing: "pricing",
  company: "company",
  legal: "legal",
  security: "security",
};

function getScrollOffset() {
  const header = document.querySelector("header");
  return (header?.getBoundingClientRect().height ?? 72) + 16;
}

export function HomeInteractions() {
  useEffect(() => {
    document.documentElement.classList.add("home-smooth-scroll");

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

      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>(
        'a[href^="#"], a[data-smooth-anchor]',
      );
      if (!link) {
        return;
      }

      const href = link.getAttribute("href");
      if (!href || href === "#" || !href.startsWith("#")) {
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
      document.documentElement.classList.remove("home-smooth-scroll");
    };
  }, []);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>(".home-section"),
    );
    const revealItems = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".public-reveal, .public-scale-reveal, .public-float-card, .home-fade-item",
      ),
    );

    if (reducedMotion.matches || !("IntersectionObserver" in window)) {
      sections.forEach((item) => item.classList.add("is-inview"));
      revealItems.forEach((item) => {
        item.classList.add("is-visible");
        item.classList.add("is-inview");
      });
      return;
    }

    document.documentElement.classList.add("public-io-ready");

    // Mark already-visible content before enabling fade styles to avoid a blank flash.
    const markIfVisible = (el: HTMLElement) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.92 && rect.bottom > window.innerHeight * 0.08) {
        el.classList.add("is-inview");
        el.classList.add("is-visible");
        el.classList.remove("is-outview");
      }
    };
    sections.forEach(markIfVisible);
    revealItems.forEach(markIfVisible);

    document.documentElement.classList.add("home-io-ready");

    const groupedParents = new Map<Element, number>();
    revealItems.forEach((item) => {
      const parent = item.parentElement ?? document.body;
      const index = groupedParents.get(parent) ?? 0;
      groupedParents.set(parent, index + 1);
      item.style.setProperty("--public-stagger", `${Math.min(index * 70, 360)}ms`);
    });

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-inview");
            entry.target.classList.remove("is-outview");
          } else {
            entry.target.classList.remove("is-inview");
            entry.target.classList.add("is-outview");
          }
        });
      },
      {
        rootMargin: "-8% 0px -8% 0px",
        threshold: [0.12, 0.28],
      },
    );

    const itemObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            entry.target.classList.add("is-inview");
            entry.target.classList.remove("is-outview");
          } else {
            entry.target.classList.remove("is-visible");
            entry.target.classList.remove("is-inview");
            entry.target.classList.add("is-outview");
          }
        });
      },
      {
        rootMargin: "0px 0px -10% 0px",
        threshold: 0.12,
      },
    );

    sections.forEach((item) => sectionObserver.observe(item));
    revealItems.forEach((item) => itemObserver.observe(item));

    return () => {
      sectionObserver.disconnect();
      itemObserver.disconnect();
      document.documentElement.classList.remove("public-io-ready");
      document.documentElement.classList.remove("home-io-ready");
    };
  }, []);

  return null;
}
