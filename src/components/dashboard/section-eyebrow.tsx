import type { ReactNode } from "react";
import Link from "next/link";

export function SectionEyebrow({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className="transition-colors hover:text-[var(--foreground)]">
      {children}
    </Link>
  );
}
