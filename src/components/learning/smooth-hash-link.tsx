"use client";

import type { MouseEvent, ReactNode } from "react";

function headerOffset() {
  const header = document.querySelector("header");
  return (header?.getBoundingClientRect().height ?? 72) + 12;
}

export function scrollToHash(hash: string) {
  const id = hash.replace(/^#/, "");
  if (!id) return false;
  const target = document.getElementById(id);
  if (!target) return false;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const top = target.getBoundingClientRect().top + window.scrollY - headerOffset();
  window.scrollTo({ top: Math.max(0, top), behavior: reduced ? "auto" : "smooth" });
  window.history.pushState(null, "", `#${id}`);
  return true;
}

export function SmoothHashLink({
  href,
  className,
  children,
}: {
  href: `#${string}`;
  className?: string;
  children: ReactNode;
}) {
  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    if (scrollToHash(href)) event.preventDefault();
  }

  return (
    <a href={href} className={className} onClick={onClick}>
      {children}
    </a>
  );
}
