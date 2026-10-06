// Written for plain React: the React Compiler is off for the explainer, whose
// 3D code mutates per-frame state in place, as React Three Fiber intends.
'use no memo'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Float } from '@react-three/drei'
import { Color, EdgesGeometry, ExtrudeGeometry, Shape, TubeGeometry, Vector3, type Group, type LineBasicMaterial, type Mesh, type MeshBasicMaterial, type MeshPhysicalMaterial } from 'three'
import { dataState, useChoices } from '../state/journey'
import { clamp01, damp, lerp, span } from '../utils/math'
import { useColors } from './kit'
import { hero, thread, threadT } from './layout'
import { stage } from './presence'

const SEGMENTS = 720
const RADIAL = 6

/**
 * The thread: what makes the data personal is that it points back at you, and
 * it goes wherever the data goes. The whole route is drawn faintly; the part
 * already travelled is drawn in the data's tone. In the hero it is not drawn
 * yet: the data stands alone until the reader sets off.
 */
export function Thread() {
  const c = useColors()
  const geometry = useMemo(() => new TubeGeometry(thread, SEGMENTS, 0.014, RADIAL, false), [])
  const travelled = useRef<Mesh>(null)
  const route = useRef<MeshBasicMaterial>(null)

  useFrame(() => {
    if (route.current) {
      route.current.opacity = 0.55 * clamp01((stage.pos + 1) * 1.6)
      route.current.visible = route.current.opacity > 0.002
    }
    const mesh = travelled.current
    if (!mesh) return
    const count = Math.floor(threadT(stage.pos) * SEGMENTS) * RADIAL * 6
    mesh.geometry.setDrawRange(0, count)
  })

  return (
    <group>
      <mesh geometry={geometry}>
        <meshBasicMaterial ref={route} color={c.hairline} transparent opacity={0.55} />
      </mesh>
      <mesh ref={travelled} geometry={geometry} scale={1.0}>
        <meshBasicMaterial color={c.data} />
      </mesh>
    </group>
  )
}

/**
 * Your data: one hexagonal token, the only thing you follow. It rests at the
 * data's place in each station and travels the thread between them. Its
 * material is its state: blue untouched, green once a real consent is attached,
 * hollow once that consent is withdrawn (it keeps its shape: withdrawal is not
 * erasure).
 *
 * In the hero it is the whole picture: large, face-on, swivelling gently
 * rather than spinning. Leaving the hero it settles into its slow spin.
 */
export function DataToken() {
  const c = useColors()
  const group = useRef<Group>(null)
  const solid = useRef<MeshPhysicalMaterial>(null)
  const shell = useRef<LineBasicMaterial>(null)
  const scratch = useMemo(() => ({ p: new Vector3(), color: new Color(), raw: new Color(), grant: new Color(), withdraw: new Color(), fill: 1, spin: 0 }), [])
  const body = useMemo(() => tokenBody(), [])
  const outline = useMemo(() => tokenOutline(), [])

  // eslint-disable-next-line react-hooks/immutability -- Per-frame scratch values are mutated in place, as R3F intends.
  useFrame((state, dt) => {
    const g = group.current
    const m = solid.current
    if (!g || !m) return
    thread.getPoint(threadT(stage.pos), scratch.p)
    g.position.copy(scratch.p)
    // 1 in the hero, 0 from the first station on.
    const heroWeight = clamp01(-stage.pos)
    // Large in the hero; back to its station size within the first half of the
    // trip, before station 01 starts to assemble round it.
    g.scale.setScalar(lerp(hero.scale, 1, span(stage.pos, -1, -0.45)))
    if (!stage.still) {
      // eslint-disable-next-line react-hooks/immutability -- Per-frame scratch values are mutated in place.
      scratch.spin += dt * 0.5 * (1 - heroWeight)
      // Back in the hero, settle face-on (a hexagon reads the same either side).
      if (heroWeight > 0) scratch.spin = damp(scratch.spin, Math.round(scratch.spin / Math.PI) * Math.PI, 3 * heroWeight, dt)
    }
    const t = stage.still ? 0 : state.clock.elapsedTime
    g.rotation.set(
      heroWeight * Math.sin(t * 0.45) * 0.16,
      scratch.spin + heroWeight * Math.sin(t * 0.7) * 0.5,
      heroWeight * Math.sin(t * 0.33 + 1) * 0.06,
    )

    const tone = dataState(useChoices.getState(), stage.pos)
    scratch.raw.set(c.data)
    scratch.grant.set(c.grant)
    scratch.withdraw.set(c.withdraw)
    const target = tone === 'consented' ? scratch.grant : tone === 'withdrawn' ? scratch.withdraw : scratch.raw
    scratch.color.copy(m.color).lerp(target, stage.still ? 1 : 1 - Math.exp(-6 * dt))
    m.color.copy(scratch.color)
    m.emissive.copy(scratch.color)
    // Withdrawn: the solid drains away and the shell remains.
    scratch.fill = stage.still ? (tone === 'withdrawn' ? 0 : 1) : damp(scratch.fill, tone === 'withdrawn' ? 0 : 1, 4, dt)
    m.opacity = scratch.fill
    // Close up in the hero the glow is turned down, so the bevels and the
    // clearcoat give it form instead of one flat blue.
    const glow = 0.25 + 0.35 * scratch.fill + 0.15 * Math.sin(state.clock.elapsedTime * 2.2)
    m.emissiveIntensity = glow * (1 - 0.7 * heroWeight)
    if (shell.current) shell.current.color.copy(scratch.color)
  })

  return (
    <group ref={group}>
      <Float speed={stage.still ? 0 : 2} rotationIntensity={0.15} floatIntensity={0.25} floatingRange={[-0.05, 0.05]}>
        <mesh geometry={body} castShadow>
          <meshPhysicalMaterial ref={solid} color={c.data} emissive={c.data} roughness={0.22} clearcoat={1} clearcoatRoughness={0.15} transparent />
        </mesh>
        <lineSegments geometry={outline}>
          <lineBasicMaterial ref={shell} color={c.data} />
        </lineSegments>
      </Float>
    </group>
  )
}

/** A pointy-topped hexagon of circumradius `r` in the XY plane. */
function hexagon(r: number) {
  const shape = new Shape()
  for (let k = 0; k < 6; k++) {
    const a = Math.PI / 2 + (k * Math.PI) / 3
    if (k === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r)
    else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r)
  }
  shape.closePath()
  return shape
}

/** The solid token: a bevelled hexagonal tile facing +Z, centred on its origin. */
function tokenBody() {
  const bevel = 0.022
  const geometry = new ExtrudeGeometry(hexagon(0.24 - bevel), {
    depth: 0.13 - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 1,
  })
  geometry.center()
  return geometry
}

/** The shell: only the hexagon's edges, a clean outline around the solid. */
function tokenOutline() {
  const prism = new ExtrudeGeometry(hexagon(0.28), { depth: 0.16, bevelEnabled: false, curveSegments: 1 })
  prism.center()
  const edges = new EdgesGeometry(prism, 20)
  prism.dispose()
  return edges
}
