// Written for plain React: the React Compiler is off for the explainer, whose
// 3D code mutates per-frame state in place, as React Three Fiber intends.
'use no memo'

import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Fog, PerspectiveCamera, Vector3 } from 'three'
import { journey, useChoices } from '../state/journey'
import { clamp01, damp, lerp } from '../utils/math'
import { hero, placements, thread, toWorld, viewOf } from './layout'
import { stage } from './presence'

/** The hero looks at your data almost face-on, a little from the left and above. */
const HERO_DIR = new Vector3(...hero.dir).normalize()
const HERO_TARGET = thread.getPoint(0)

interface Pose {
  pos: Vector3
  target: Vector3
  dist: number
}

const makePose = (): Pose => ({ pos: new Vector3(), target: new Vector3(), dist: 1 })

/**
 * The camera. Each station's view says what must be visible (a centre and a
 * radius); the rig fits that sphere into the stage window the page measured,
 * and shifts the projection so the sphere's centre lands in the window's
 * centre. The page decides where the words go; the camera frames the model in
 * the space that is left, at every size, so the two always line up.
 *
 * Between stations the camera orbits the helix axis (cylindrical blend), so
 * it swings round to the next station instead of cutting through models.
 *
 * The hero has its own window: the free space above (phone) or beside
 * (desktop) the title, which scrolls with the page until it reaches the top
 * of the stage window and holds there. Leaving the hero, the window slides
 * from there to the stage window as the camera travels, all on screen.
 *
 * In a phone showcase the window grows to the whole screen below the header
 * and the camera comes a little closer, so the model moves to the middle,
 * larger, while the words fade back.
 */
export function Rig({ reducedMotion }: { reducedMotion: boolean }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const scene = useThree((s) => s.scene)
  const invalidate = useThree((s) => s.invalidate)
  const scratch = useRef({
    a: makePose(),
    b: makePose(),
    goal: makePose(),
    dir: new Vector3(),
    view: { x: -1, y: -1, w: -1, h: -1, W: -1, H: -1 },
    win: { x: 0, y: 0, width: 1, height: 1 },
    look: new Vector3(),
    first: true,
    px: 0,
    py: 0,
  })

  /** The phone layout: the stage is the screen's width above the card. */
  const narrow = () => journey.viewport.width < 768

  /** Distance at which a sphere of `radius` fills the stage window. */
  const fit = (radius: number) => {
    const win = scratch.current.win
    const { viewport } = journey
    const tanHalf = Math.tan((camera.fov * Math.PI) / 360)
    const tanFit = tanHalf * (Math.min(win.height, win.width) / viewport.height)
    // A showcase brings the camera a little closer than a plain fit.
    const showK = stage.show * stage.show * (3 - 2 * stage.show)
    // On a phone the stage is the screen's full width, so a model's floor and
    // labels, which reach a little past its sphere, need a margin to stay on
    // screen.
    const margin = narrow() ? 1.15 : 1.04
    return (radius / Math.sin(Math.atan(tanFit))) * margin * (1 - 0.14 * showK)
  }

  const stationPose = (index: number, out: Pose) => {
    const p = placements[index]
    const view = viewOf(p, useChoices.getState().selection, narrow())
    const s = scratch.current
    toWorld(p, view.center[0], view.center[1], view.center[2], out.target)
    // The view direction, rotated into the world like the station is.
    toWorld(p, view.dir[0], view.dir[1], view.dir[2], s.dir).sub(p.position).normalize()
    out.dist = fit(view.radius)
    out.pos.copy(out.target).addScaledVector(s.dir, out.dist)
  }

  const heroPose = (out: Pose) => {
    out.target.copy(HERO_TARGET)
    out.dist = fit(hero.radius)
    out.pos.copy(out.target).addScaledVector(HERO_DIR, out.dist)
  }

  /** The window the subject is fitted to: the hero's, blending to the stage's. */
  const frameWindow = () => {
    const win = scratch.current.win
    const { window: stageWin, hero: heroWin, scrollY } = journey
    if (heroWin.width <= 1) return showcaseWindow(Object.assign(win, stageWin))
    const t = clamp01(stage.pos + 1)
    const k = t * t * (3 - 2 * t)
    win.x = lerp(heroWin.x, stageWin.x, k)
    // The hero's space scrolls with the title but stops at the stage window's
    // top, so your data stays on screen and is seen travelling into station 01.
    win.y = lerp(Math.max(heroWin.y - scrollY, stageWin.y), stageWin.y, k)
    win.width = lerp(heroWin.width, stageWin.width, k)
    win.height = lerp(heroWin.height, stageWin.height, k)
    return showcaseWindow(win)
  }

  /** Blends a window toward the whole screen below the header. */
  const showcaseWindow = (win: { x: number; y: number; width: number; height: number }) => {
    const k = stage.show * stage.show * (3 - 2 * stage.show)
    if (k <= 0) return win
    const { viewport } = journey
    // The stage window's top: just under the header.
    const top = journey.window.y
    win.x = lerp(win.x, 0, k)
    win.y = lerp(win.y, top, k)
    win.width = lerp(win.width, viewport.width, k)
    win.height = lerp(win.height, viewport.height - top - viewport.height * 0.08, k)
    return win
  }

  /** Blend two camera positions around the helix axis, not through it. */
  const orbit = (a: Vector3, b: Vector3, t: number, out: Vector3) => {
    const ta = Math.atan2(a.x, a.z)
    let tb = Math.atan2(b.x, b.z)
    while (tb - ta > Math.PI) tb -= Math.PI * 2
    while (tb - ta < -Math.PI) tb += Math.PI * 2
    const theta = lerp(ta, tb, t)
    const r = lerp(Math.hypot(a.x, a.z), Math.hypot(b.x, b.z), t)
    // A little lift mid-way, so the swing reads as travel.
    const y = lerp(a.y, b.y, t) + Math.sin(t * Math.PI) * 1.2
    return out.set(Math.sin(theta) * r, y, Math.cos(theta) * r)
  }

  // eslint-disable-next-line react-hooks/immutability -- Per-frame scratch values are mutated in place, as R3F intends.
  useFrame((state, dt) => {
    const s = scratch.current
    stage.still = reducedMotion
    stage.elapsed = state.clock.elapsedTime
    const showGoal = useChoices.getState().showcase ? 1 : 0
    stage.show = reducedMotion ? showGoal : damp(stage.show, showGoal, 5, dt)
    if (Math.abs(stage.show - showGoal) < 1e-3) stage.show = showGoal

    // The story position, smoothed (or cut, under reduced motion).
    const goalPos = journey.position
    stage.pos = reducedMotion || s.first ? goalPos : damp(stage.pos, goalPos, 7, dt)
    if (Math.abs(stage.pos - goalPos) < 1e-4) stage.pos = goalPos

    // Shift the projection so the window's centre is the optical centre.
    const win = frameWindow()
    const { viewport } = journey
    const v = s.view
    if (v.x !== win.x || v.y !== win.y || v.w !== win.width || v.h !== win.height || v.W !== viewport.width || v.H !== viewport.height) {
      Object.assign(v, { x: win.x, y: win.y, w: win.width, h: win.height, W: viewport.width, H: viewport.height })
      const cx = win.x + win.width / 2
      const cy = win.y + win.height / 2
      camera.setViewOffset(viewport.width, viewport.height, viewport.width / 2 - cx, viewport.height / 2 - cy, viewport.width, viewport.height)
      camera.updateProjectionMatrix()
    }

    // Two poses either side of the position, and the blend between them.
    const p = Math.max(-1, Math.min(placements.length - 1, stage.pos))
    const i = Math.floor(p)
    const t = p - i
    if (i < 0) heroPose(s.a)
    else stationPose(i, s.a)
    if (t > 0 && i + 1 < placements.length) {
      stationPose(i + 1, s.b)
      orbit(s.a.pos, s.b.pos, t, s.goal.pos)
      s.goal.target.lerpVectors(s.a.target, s.b.target, t)
      s.goal.dist = lerp(s.a.dist, s.b.dist, t)
    } else {
      s.goal.pos.copy(s.a.pos)
      s.goal.target.copy(s.a.target)
      s.goal.dist = s.a.dist
    }

    // Camera follows the goal; a view change inside a station glides.
    const k = reducedMotion || s.first ? 1 : 1 - Math.exp(-9 * Math.min(dt, 0.1))
    camera.position.lerp(s.goal.pos, k)
    s.look.lerp(s.goal.target, k)
    s.first = false

    // A mouse adds a little depth by moving the eye, never the subject.
    s.px = damp(s.px, reducedMotion ? 0 : journey.pointerX, 3, dt)
    s.py = damp(s.py, reducedMotion ? 0 : journey.pointerY, 3, dt)
    camera.lookAt(s.look)
    camera.translateX(s.px * s.goal.dist * 0.03)
    camera.translateY(s.py * s.goal.dist * 0.02)
    camera.lookAt(s.look)

    // Fog starts just behind the subject, so other stations fade into paper.
    const fog = scene.fog as Fog | null
    if (fog) {
      // eslint-disable-next-line react-hooks/immutability -- The scene fog is three.js state, owned by the rig.
      fog.near = s.goal.dist + 2
      fog.far = s.goal.dist + 22
    }

    // On demand: keep drawing until the camera has settled.
    if (camera.position.distanceToSquared(s.goal.pos) > 1e-6 || stage.pos !== goalPos) invalidate()
  }, -10)

  return null
}
