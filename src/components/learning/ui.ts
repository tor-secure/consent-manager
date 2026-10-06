const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00C4A7] focus-visible:ring-offset-2 focus-visible:ring-offset-white";

export const primaryBtn = `inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#0B2C4A] px-5 text-sm font-semibold text-white motion-safe:transition-colors hover:bg-[#123d63] disabled:cursor-not-allowed disabled:bg-[#0B2C4A]/45 ${focusRing}`;

export const secondaryBtn = `inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#0B2C4A]/25 bg-white px-5 text-sm font-semibold text-[#0B2C4A] motion-safe:transition-colors hover:border-[#0B2C4A] disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;

export const textLink = `rounded text-sm font-semibold text-[#0B2C4A] underline underline-offset-4 hover:text-[#123d63] ${focusRing}`;

export const card = "rounded-xl border border-[#d5e3e0] bg-white";

export const eyebrow = "text-xs font-semibold uppercase tracking-[0.14em] text-[#4d6570]";

export function pad(number: number): string {
  return String(number).padStart(2, "0");
}
