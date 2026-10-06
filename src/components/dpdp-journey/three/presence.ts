// Written for plain React: the React Compiler is off for the explainer, whose
// 3D code mutates per-frame state in place, as React Three Fiber intends.
'use no memo'

import { clamp01 } from '../utils/math'

/**
 * Per-frame values every part of the scene reads, written once per frame by
 * the rig (mounted first, so its frame callback runs first).
 */
export const stage = {
  /** The journey position, damped: what the camera actually shows. */
  pos: -1,
  elapsed: 0,
  /** Reduced motion: cut between complete states, no idle animation. */
  still: false,
  /** Phone showcase, damped: 1 while the model is forward over the words. */
  show: 0,
}

/**
 * 1 while a station is framed, falling to 0 a station away. In the hero
 * every station is hidden: your data stands alone until the reader sets off.
 */
export function presence(index: number) {
  return clamp01(1 - Math.abs(stage.pos - index) * 1.15)
}

/** An eased reveal for the n-th part of a station, so models assemble in order. */
export function reveal(index: number, order: number) {
  const t = clamp01(presence(index) * 1.9 - order * 0.14)
  return 1 - (1 - t) * (1 - t) * (1 - t)
}

