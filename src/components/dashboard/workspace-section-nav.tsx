"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { dashboardSectionHubs } from "@/config/navigation";

export function WorkspaceSectionNav() {
  const pathname = usePathname();
  const active = dashboardSectionHubs.flatMap(group => group.features).sort((a, b) => b.href.length - a.href.length).find(item => pathname === item.href || pathname.startsWith(`${item.href}/`));
  const group = dashboardSectionHubs.find(group => pathname === group.href || group.features.some(item => item.href === active?.href));
  if (!group || group.features.length < 2) return null;
  return <nav className="workspace-section-nav" aria-label="Related workspace tools">{group.features.map(item => <Link key={item.href} href={item.href} aria-current={active?.href === item.href ? "page" : undefined}>{item.title}</Link>)}</nav>;
}
