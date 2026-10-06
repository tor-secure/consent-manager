// Written for plain React: the React Compiler is off for the explainer, whose
// 3D code mutates per-frame state in place, as React Three Fiber intends.
'use no memo'

/** Pure numeric helpers shared by the scroll driver and the 3D stage. */

export const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n)

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/**
 * A smoothstep-eased 0 → 1 ramp between two positions on the story timeline.
 * This is how a chapter says "come in over my first half, then hold".
 */
export function span(position: number, from: number, to: number) {
  const t = clamp01((position - from) / (to - from || 1))
  return t * t * (3 - 2 * t)
}

/**
 * Frame-rate independent approach toward a target. Prefer this over a fixed
 * `lerp(current, target, 0.1)` so motion is identical at 60Hz and 120Hz.
 * `dt` is clamped so a backgrounded tab cannot produce a jump on return.
 */
export function damp(current: number, target: number, lambda: number, dt: number) {
  return lerp(current, target, 1 - Math.exp(-lambda * Math.min(dt, 0.1)))
}

/** A position on the story timeline, as used by keyframe tables. */
export interface Keyed {
  at: number
}

/**
 * Finds where `position` falls in a sorted keyframe table and writes the two
 * neighbouring indices and the eased 0 → 1 blend between them into `out`.
 * Writing into `out` rather than returning an object keeps per-frame callers
 * allocation-free.
 */
export function locate(
  keys: readonly Keyed[],
  position: number,
  out: { a: number; b: number; t: number },
) {
  const last = keys.length - 1
  if (position <= keys[0].at) {
    out.a = out.b = 0
    out.t = 0
    return out
  }
  for (let i = 1; i <= last; i++) {
    if (position < keys[i].at) {
      out.a = i - 1
      out.b = i
      out.t = span(position, keys[i - 1].at, keys[i].at)
      return out
    }
  }
  out.a = out.b = last
  out.t = 0
  return out
}

/**
 * 0 → 1 → 0 around a moment at `at` on the timeline, for chapters told in
 * moments `spacing` apart: in as the moment arrives, out as the next one does.
 */
export function around(position: number, at: number, spacing: number) {
  return (
    span(position, at - 0.5 * spacing, at - 0.12 * spacing) *
    (1 - span(position, at + 0.45 * spacing, at + 0.85 * spacing))
  )
}
