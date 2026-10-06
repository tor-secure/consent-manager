// Written for plain React: the React Compiler is off for the explainer, whose
// 3D code mutates per-frame state in place, as React Three Fiber intends.
'use no memo'

import { CatmullRomCurve3, Vector3 } from 'three'
import type { StationId } from '../content/stations'

/**
 * Where everything is. The eight stations stand on a descending helix around
 * one vertical axis: each faces outward, the camera sits outside the helix and
 * looks in, and the journey from one station to the next is an orbit around
 * that axis — down and round, never through a model.
 *
 * A station's model is built in its own local frame around the data, which
 * always sits at the local origin. Its views say what to frame: a centre and
 * a radius, fitted by the rig to the measured stage window, so a model lines
 * up with the page on every screen rather than being placed for one.
 */

export const HELIX_RADIUS = 14
export const HELIX_STEP = 0.9
export const HELIX_DROP = 8

export interface View {
  /** Local centre of what to frame. */
  center: [number, number, number]
  /** Radius of the sphere that must fit inside the stage window. */
  radius: number
  /** Local direction from the centre to the camera. */
  dir: [number, number, number]
}

export interface Placement {
  id: StationId
  angle: number
  position: Vector3
  /** The y the station's plate sits at, locally. */
  floor: number
  views: Record<string, View>
  /**
   * Views for the phone's narrow stage, where they differ: more room for
   * labels that reach past the model's sphere.
   */
  narrowViews?: Record<string, View>
  /** Selection key whose value picks the view, if the view can change. */
  viewFrom?: StationId
}

const views: Record<StationId, { floor: number; views: Record<string, View>; narrowViews?: Record<string, View>; viewFrom?: StationId }> = {
  people: {
    floor: -1.75,
    views: { main: { center: [0, 0.05, 0], radius: 2.55, dir: [0, 0.22, 1] } },
    // The fiduciary's labels reach furthest, to the right: room for them.
    narrowViews: { main: { center: [0.3, 0.05, 0], radius: 2.75, dir: [0, 0.22, 1] } },
  },
  reason: { floor: -3.2, views: { main: { center: [0, -1.05, 0], radius: 2.55, dir: [0, 0.3, 1] } } },
  consent: { floor: -1.0, views: { main: { center: [-0.55, 1.05, 0], radius: 2.55, dir: [0.12, 0.18, 1] } } },
  purposes: { floor: -3.0, views: { main: { center: [0, -1.05, 0], radius: 2.55, dir: [0, 0.34, 1] } } },
  withdrawal: { floor: -2.9, views: { main: { center: [0, -0.35, 0], radius: 2.65, dir: [-0.08, 0.26, 1] } } },
  rights: {
    floor: -2.2,
    viewFrom: 'rights',
    views: {
      rights: { center: [-1.35, 0, 0], radius: 2.45, dir: [-0.2, 0.2, 1] },
      duties: { center: [1.6, -0.5, 0], radius: 2.7, dir: [0.2, 0.2, 1] },
    },
  },
  stricter: {
    floor: -1.7,
    viewFrom: 'stricter',
    views: {
      children: { center: [0, 0.35, 0], radius: 2.35, dir: [-0.15, 0.22, 1] },
      manager: { center: [5.2, 0.25, 0], radius: 2.6, dir: [0.15, 0.22, 1] },
    },
  },
  system: { floor: -1.6, views: { main: { center: [0, 0.2, 0], radius: 3.0, dir: [0, 0.42, 1] } } },
}

const order: StationId[] = ['people', 'reason', 'consent', 'purposes', 'withdrawal', 'rights', 'stricter', 'system']

export const placements: Placement[] = order.map((id, i) => {
  const angle = i * HELIX_STEP
  return {
    id,
    angle,
    position: new Vector3(Math.sin(angle) * HELIX_RADIUS, -i * HELIX_DROP, Math.cos(angle) * HELIX_RADIUS),
    ...views[id],
  }
})

/** The view a station shows for the reader's current pick, on this layout. */
export function viewOf(p: Placement, selection: Partial<Record<StationId, string | null>>, narrow: boolean): View {
  const key = p.viewFrom ? selection[p.viewFrom] ?? Object.keys(p.views)[0] : 'main'
  const set = narrow && p.narrowViews ? p.narrowViews : p.views
  return set[key] ?? Object.values(set)[0]
}

/**
 * The hero: your data alone and large, where the thread begins. The token is
 * scaled up rather than the camera moved in, so the camera stands where
 * station 01 is seen from, outside its model, and the trip down to it is
 * short and clear of every part. The radius is the scaled token with room for
 * its swivel and float. The rest of the route is hidden until the reader sets
 * off.
 */
export const hero = {
  scale: 6,
  radius: 2.7,
  dir: [-0.22, 0.16, 1] as [number, number, number],
}

/** Local → world for a station, without allocating. */
export function toWorld(p: Placement, x: number, y: number, z: number, out: Vector3) {
  const c = Math.cos(p.angle)
  const s = Math.sin(p.angle)
  return out.set(p.position.x + x * c + z * s, p.position.y + y, p.position.z - x * s + z * c)
}

/**
 * The thread your data travels on: through the data's place in every station,
 * swinging behind the models between them so it never cuts across a model in
 * front of the camera.
 */
function threadPoints() {
  const pts: Vector3[] = []
  // It begins above the first station, where the data leaves you.
  pts.push(toWorld(placements[0], -1.6, 3.4, -2.4, new Vector3()))
  placements.forEach((p, i) => {
    // In from behind and out to behind: seen from the camera, the thread
    // meets the data head-on and never crosses the model in front of it.
    pts.push(toWorld(p, -0.15, 0.2, -2.4, new Vector3()))
    pts.push(toWorld(p, 0, 0, 0, new Vector3()))
    const next = placements[i + 1]
    if (!next) return
    pts.push(toWorld(p, 0.15, -0.2, -2.4, new Vector3()))
    const angle = (p.angle + next.angle) / 2
    const r = HELIX_RADIUS - 4
    pts.push(new Vector3(Math.sin(angle) * r, (p.position.y + next.position.y) / 2, Math.cos(angle) * r))
  })
  return pts
}

export const thread = new CatmullRomCurve3(threadPoints(), false, 'centripetal')
const threadCount = thread.points.length

/** The thread's parameter at a story position: the data's place at each station. */
export function threadT(position: number) {
  // Point 0 is the start above station 0; station i sits at point 2 + 4i.
  const index = position < 0 ? 2 * (1 + position) : 2 + position * 4
  return Math.max(0, Math.min(1, index / (threadCount - 1)))
}
