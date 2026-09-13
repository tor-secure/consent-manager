import { BRAND } from "@/lib/brand";

const SRC = {
  lockup: {
    "on-light": "/brand/consent-guru-logo.svg",
    "on-dark": "/brand/consent-guru-logo-on-dark.svg",
  },
  mark: {
    "on-light": "/brand/consent-guru-mark.svg",
    "on-dark": "/brand/consent-guru-mark-on-dark.svg",
  },
} as const;

export function BrandLogo({
  tone = "on-light",
  markOnly = false,
  height = 40,
  className = "",
  priority = false,
}: {
  tone?: "on-light" | "on-dark";
  markOnly?: boolean;
  height?: number;
  className?: string;
  priority?: boolean;
}) {
  const src = markOnly ? SRC.mark[tone] : SRC.lockup[tone];
  const width = markOnly ? Math.round(height * (100 / 118)) : Math.round(height * (379 / 130));

  return (
    // SVG lockup is already vector; img keeps navy/teal fills intact on every surface.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={BRAND.name}
      width={width}
      height={height}
      className={`w-auto object-contain object-left ${className}`}
      style={{ height, width: "auto" }}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
    />
  );
}
