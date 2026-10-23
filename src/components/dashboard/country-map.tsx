"use client";

import { useRef, useState, type MouseEvent } from "react";

import { CountryFlag } from "@/components/dashboard/country-flag";
import { WORLD_PATHS, WORLD_VIEWBOX } from "@/components/dashboard/world-map-paths";

type MapCountry = {
  code: string;
  name: string;
  total: number;
  accepted: number;
  rejected: number;
  partial: number;
  withdrawn: number;
};

export function CountryMap({ countries }: { countries: MapCountry[] }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [hover, setHover] = useState<{ country: MapCountry; x: number; y: number } | null>(null);
  const highlighted = new Map(countries.map((country) => [country.code.toLowerCase(), country]));
  const [, , width, height] = WORLD_VIEWBOX.split(" ").map(Number);
  const viewWidth = width / zoom;
  const viewHeight = height / zoom;
  const viewBox = `${(width - viewWidth) / 2} ${(height - viewHeight) / 2} ${viewWidth} ${viewHeight}`;
  const shareTotal = countries.reduce((sum, country) => sum + country.total, 0);

  function show(event: MouseEvent<SVGPathElement>, country: MapCountry) {
    const frame = frameRef.current?.getBoundingClientRect();
    if (!frame) return;
    const tipWidth = 208;
    const tipHeight = 168;
    const x = Math.min(Math.max(8, event.clientX - frame.left + 14), frame.width - tipWidth - 8);
    const y = Math.min(Math.max(8, event.clientY - frame.top - 12), frame.height - tipHeight - 8);
    setHover({ country, x, y });
  }

  const share = hover && shareTotal > 0 ? Math.round((hover.country.total / shareTotal) * 100) : 0;

  return (
    <div ref={frameRef} className="relative mb-5 overflow-hidden rounded-xl bg-[var(--muted)]/40">
      <svg viewBox={viewBox} className="block h-auto w-full" role="img" aria-label="Map of consent records by country" onMouseLeave={() => setHover(null)}>
        {WORLD_PATHS.map(([id, path]) => {
          const hit = highlighted.get(id);
          const active = hover?.country.code.toLowerCase() === id;
          return (
            <path
              key={id}
              d={path}
              fill={hit ? (active ? "color-mix(in srgb, var(--purple) 78%, black)" : "var(--purple)") : "var(--secondary)"}
              stroke="var(--card)"
              strokeWidth={active ? 1.4 : 0.8}
              className={hit ? "cursor-pointer" : undefined}
              onMouseEnter={hit ? (event) => show(event, hit) : undefined}
              onMouseMove={hit ? (event) => show(event, hit) : undefined}
            />
          );
        })}
      </svg>
      {hover ? (
        <div
          className="pointer-events-none absolute z-20 w-52 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 shadow-md"
          style={{ left: hover.x, top: hover.y }}
        >
          <p className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
            <CountryFlag code={hover.country.code} />
            <span className="truncate">{hover.country.name}</span>
          </p>
          <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
            {hover.country.total.toLocaleString()} records · {share}% of mapped countries
          </p>
          <dl className="mt-2 space-y-1 text-xs">
            {[
              ["Accepted", hover.country.accepted],
              ["Granular", hover.country.partial],
              ["Rejected", hover.country.rejected],
              ["Withdrawn", hover.country.withdrawn],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex items-center justify-between gap-3">
                <dt className="text-[var(--muted-foreground)]">{label}</dt>
                <dd className="font-semibold tabular-nums text-[var(--foreground)]">{Number(value).toLocaleString()}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
      <div className="absolute bottom-3 right-3 z-10 flex flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)]">
        <button
          type="button"
          className="h-8 w-8 text-base leading-none text-[var(--foreground)]"
          onClick={() => setZoom((value) => Math.min(3, Math.round((value + 0.4) * 10) / 10))}
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          className="h-8 w-8 border-t border-[var(--border)] text-base leading-none text-[var(--foreground)]"
          onClick={() => setZoom((value) => Math.max(1, Math.round((value - 0.4) * 10) / 10))}
          aria-label="Zoom out"
        >
          −
        </button>
      </div>
    </div>
  );
}
