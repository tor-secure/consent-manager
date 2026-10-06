// Written for plain React: the React Compiler is off for the explainer, whose
// 3D code mutates per-frame state in place, as React Three Fiber intends.
'use no memo'

import { createContext, useContext, useRef, useState, type ReactNode } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Edges, Html, Line, RoundedBox } from '@react-three/drei'
import type { Group, Mesh } from 'three'
import type { Line2 } from 'three-stdlib'
import type { StationId } from '../content/stations'
import { useNarrow } from '../hooks/useNarrow'
import type { StageColors } from '../hooks/useStageColors'
import { useChoices } from '../state/journey'
import { damp } from '../utils/math'
import { reveal, stage } from './presence'

/**
 * The mark vocabulary in three dimensions. Every model on the stage is built
 * from these, so the shapes a reader learns in one station mean the same
 * thing in the next (see `content/vocabulary.ts`).
 */

export const ColorsContext = createContext<StageColors | null>(null)
export function useColors() {
  const colors = useContext(ColorsContext)
  if (!colors) throw new Error('Stage colours are missing')
  return colors
}

/** The station a model belongs to, so parts can reveal and report hovers. */
export const StationContext = createContext<{ index: number; id: StationId }>({ index: 0, id: 'people' })
export const useStation = () => useContext(StationContext)

/** False inside a scene a phone has set aside (see `Focus`): its tags hide. */
const FocusContext = createContext(true)

/**
 * One of a station's side-by-side scenes, shown when its view is picked. A
 * desktop shows every scene and turns the camera between them; a phone's
 * stage is too narrow for the one beside, which would only be cut off at the
 * edge, so there the scene not picked shrinks away and the picked one grows
 * in, in the same place the camera already frames.
 */
export function Focus({ view, at, children }: { view: string; at: Vec3; children: ReactNode }) {
  const { id } = useStation()
  const narrow = useNarrow()
  const picked = useChoices((s) => s.selection[id] === view)
  const shown = !narrow || picked
  const ref = useRef<Group>(null)
  const size = useRef(shown ? 1 : 0)
  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    const s = approach(size, shown ? 1 : 0, dt, 7)
    g.scale.setScalar(Math.max(0.0001, s))
    g.visible = s > 0.002
  })
  return (
    <FocusContext.Provider value={shown}>
      <group position={at}>
        <group ref={ref}>
          <group position={[-at[0], -at[1], -at[2]]}>{children}</group>
        </group>
      </group>
    </FocusContext.Provider>
  )
}

type Vec3 = [number, number, number]

/** Scales its children in as the station is reached, `order` steps after the first. */
export function Reveal({ order = 0, children, position }: { order?: number; children: ReactNode; position?: Vec3 }) {
  const ref = useRef<Group>(null)
  const { index } = useStation()
  useFrame(() => {
    const g = ref.current
    if (!g) return
    const s = reveal(index, order)
    g.scale.setScalar(Math.max(0.0001, s))
    g.visible = s > 0.002
  })
  return (
    <group ref={ref} position={position}>
      {children}
    </group>
  )
}

/**
 * A part of a model the reader can point at and pick. Hovering names it;
 * picking it makes the same choice as the matching button in the card.
 */
export function Part({
  id,
  label,
  choose,
  children,
  position,
  tagged,
}: {
  id: string
  label: string
  /** The part already carries a permanent tag; hovering only lifts it. */
  tagged?: boolean
  /** Option id to choose when clicked. Omit for parts that only name themselves. */
  choose?: string
  children: ReactNode
  position?: Vec3
}) {
  const ref = useRef<Group>(null)
  const station = useStation()
  const hovered = useChoices((s) => s.hover?.station === station.id && s.hover.part === id)
  const active = useChoices((s) => s.active === station.index)
  const setHover = useChoices((s) => s.setHover)
  const pick = useChoices((s) => s.choose)

  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    const goal = hovered ? 1.1 : 1
    g.scale.setScalar(stage.still ? goal : damp(g.scale.x, goal, 12, dt))
  })

  const over = (e: ThreeEvent<PointerEvent>) => {
    if (!active) return
    e.stopPropagation()
    setHover({ station: station.id, part: id })
    document.body.style.cursor = choose ? 'pointer' : 'help'
  }
  const out = () => {
    if (useChoices.getState().hover?.part === id) setHover(null)
    document.body.style.cursor = ''
  }
  const click = (e: ThreeEvent<MouseEvent>) => {
    if (!active || !choose) return
    e.stopPropagation()
    pick(station.id, choose)
  }

  return (
    <group ref={ref} position={position} onPointerOver={over} onPointerOut={out} onClick={click}>
      {children}
      {hovered && !tagged ? <Tag position={[0, 0.62, 0]} strong>{label}</Tag> : null}
    </group>
  )
}

/**
 * A label pinned to a point of the model. It is a copy of words already in
 * the card, so it is hidden from assistive technology; only the active
 * station mounts its labels.
 */
export function Tag({ children, position, strong, tone }: { children: ReactNode; position: Vec3; strong?: boolean; tone?: 'grant' | 'refuse' | 'data' | 'purpose' }) {
  const { index } = useStation()
  const active = useChoices((s) => s.active === index)
  const focused = useContext(FocusContext)
  if (!active || !focused) return null
  return (
    <Html position={position} center zIndexRange={[5, 0]} className="tag-anchor" pointerEvents="none">
      <span className="tag" data-strong={strong || undefined} data-tone={tone} aria-hidden="true">
        {children}
      </span>
    </Html>
  )
}

/** You, the Data Principal: a point with a ring. */
export function Person({ position, scale = 1, tone }: { position?: Vec3; scale?: number; tone?: string }) {
  const c = useColors()
  const ring = useRef<Mesh>(null)
  useFrame((_, dt) => {
    if (ring.current && !stage.still) ring.current.rotation.y += dt * 0.6
  })
  return (
    <group position={position} scale={scale}>
      <mesh castShadow>
        <sphereGeometry args={[0.17, 32, 16]} />
        <meshStandardMaterial color={tone ?? c.ink} roughness={0.35} />
      </mesh>
      <mesh ref={ring}>
        <torusGeometry args={[0.36, 0.018, 12, 64]} />
        <meshStandardMaterial color={c.inkMuted} roughness={0.5} />
      </mesh>
    </group>
  )
}

/** The Data Fiduciary: a solid block, the one that decides. */
export function Fiduciary({ position, size = 0.62, glow = 0 }: { position?: Vec3; size?: number; glow?: number }) {
  const c = useColors()
  return (
    <RoundedBox args={[size, size, size]} radius={0.06} smoothness={3} position={position}>
      <meshStandardMaterial color={c.ink} roughness={0.32} metalness={0.15} emissive={c.data} emissiveIntensity={glow} />
    </RoundedBox>
  )
}

/** A Data Processor or vendor: the same block, hollow, acting for someone else. */
export function Processor({ position, size = 0.56, lit, dark }: { position?: Vec3; size?: number; lit?: string; dark?: boolean }) {
  const c = useColors()
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[size, size, size]} />
        <meshStandardMaterial
          color={dark ? c.ink : lit ?? c.paperRaised}
          transparent
          opacity={dark ? 0.85 : lit ? 0.5 : 0.35}
          roughness={0.6}
          depthWrite={false}
        />
        <Edges color={lit ?? c.ink} />
      </mesh>
    </group>
  )
}

/** A bead: a piece of a message travelling on a line (a consent, a withdrawal). */
export function Bead({ color, radius = 0.09, glow = 1.6, hollow }: { color: string; radius?: number; glow?: number; hollow?: boolean }) {
  return (
    <mesh>
      <sphereGeometry args={[radius, 24, 12]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={hollow ? 0 : glow}
        wireframe={hollow}
        toneMapped={false}
      />
    </mesh>
  )
}

/** A checkpoint ring the thread runs through. */
export function Checkpoint({ color, position, radius = 0.32 }: { color: string; position?: Vec3; radius?: number }) {
  return (
    <mesh position={position}>
      <torusGeometry args={[radius, 0.026, 16, 64]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} roughness={0.35} />
    </mesh>
  )
}

/**
 * The purpose: four corner brackets, the edges of what may happen. `fit`
 * draws it in from loose (0) to fitted (1).
 */
export function PurposeFrame({ size = 1, fitRef, color }: { size?: number; fitRef?: { current: number }; color?: string }) {
  const c = useColors()
  const ref = useRef<Group>(null)
  useFrame(() => {
    if (!ref.current || !fitRef) return
    ref.current.scale.setScalar(1 + (1 - fitRef.current) * 0.65)
  })
  const arm = size * 0.32
  const half = size / 2
  const t = 0.035
  const corners: [number, number][] = [
    [-1, 1],
    [1, 1],
    [-1, -1],
    [1, -1],
  ]
  return (
    <group ref={ref}>
      {corners.map(([sx, sy]) => (
        <group key={`${sx}${sy}`} position={[sx * half, sy * half, 0]}>
          <mesh position={[-sx * arm / 2, 0, 0]}>
            <boxGeometry args={[arm, t, t]} />
            <meshStandardMaterial color={color ?? c.purpose} emissive={color ?? c.purpose} emissiveIntensity={0.45} roughness={0.4} />
          </mesh>
          <mesh position={[0, -sy * arm / 2, 0]}>
            <boxGeometry args={[t, arm, t]} />
            <meshStandardMaterial color={color ?? c.purpose} emissive={color ?? c.purpose} emissiveIntensity={0.45} roughness={0.4} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** A record slip: a sheet with ruled fields. */
export function Slip({ position, rotation, edge, rows = 3 }: { position?: Vec3; rotation?: Vec3; edge?: string; rows?: number }) {
  const c = useColors()
  return (
    <group position={position} rotation={rotation}>
      <RoundedBox args={[0.9, 1.15, 0.04]} radius={0.02} smoothness={2}>
        <meshStandardMaterial color={c.paperRaised} emissive={c.paperRaised} emissiveIntensity={0.55} roughness={0.8} />
      </RoundedBox>
      <mesh position={[0, 0, 0.0]}>
        <boxGeometry args={[0.92, 1.17, 0.03]} />
        <meshBasicMaterial color={edge ?? c.ink} wireframe />
      </mesh>
      {Array.from({ length: rows }, (_, i) => (
        <mesh key={i} position={[-0.06, 0.34 - i * 0.24, 0.026]}>
          <boxGeometry args={[0.6, 0.045, 0.01]} />
          <meshBasicMaterial color={i === 0 && edge ? edge : c.inkMuted} />
        </mesh>
      ))}
    </group>
  )
}

/** The Data Protection Board: a double square. */
export function Board({ position }: { position?: Vec3 }) {
  const c = useColors()
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[0.62, 0.62, 0.08]} />
        <meshStandardMaterial color={c.paperRaised} emissive={c.paperRaised} emissiveIntensity={0.5} roughness={0.6} />
        <Edges color={c.ink} />
      </mesh>
      <mesh position={[0, 0, 0.05]}>
        <boxGeometry args={[0.36, 0.36, 0.04]} />
        <meshStandardMaterial color={c.ink} roughness={0.4} />
      </mesh>
    </group>
  )
}

/** A refusal: a short bar across a line, in the refusal tone. */
export function Stop({ position, rotation = 0, visibleRef }: { position?: Vec3; rotation?: number; visibleRef?: { current: number } }) {
  const c = useColors()
  const ref = useRef<Group>(null)
  useFrame(() => {
    if (!ref.current || !visibleRef) return
    ref.current.scale.setScalar(Math.max(0.0001, visibleRef.current))
  })
  return (
    <group ref={ref} position={position} rotation={[0, 0, rotation]}>
      <mesh>
        <boxGeometry args={[0.42, 0.06, 0.06]} />
        <meshStandardMaterial color={c.withdraw} emissive={c.withdraw} emissiveIntensity={0.6} toneMapped={false} />
      </mesh>
    </group>
  )
}

/**
 * A line that can carry a flow. When `flowing`, its dashes run along it: the
 * processing it stands for is happening. Opacity and colour are set per frame
 * from `levelRef` (0 → dim, 1 → full), so a stream can fade without React.
 */
export function Flow({
  points,
  color,
  width = 2,
  flowing = false,
  dashed = false,
  speed = 0.9,
  levelRef,
  level = 1,
}: {
  points: Vec3[]
  color: string
  width?: number
  flowing?: boolean
  dashed?: boolean
  speed?: number
  levelRef?: { current: number }
  level?: number
}) {
  const ref = useRef<Line2>(null)
  useFrame((_, dt) => {
    const line = ref.current
    if (!line) return
    const m = line.material
    if (flowing && !stage.still) m.dashOffset -= dt * speed
    const goal = levelRef ? levelRef.current : level
    m.opacity = 0.18 + 0.82 * goal
  })
  return (
    <Line
      ref={ref}
      points={points}
      color={color}
      lineWidth={width}
      dashed={flowing || dashed}
      dashSize={flowing ? 0.16 : 0.08}
      gapSize={flowing ? 0.1 : 0.07}
      transparent
      opacity={1}
    />
  )
}

/** Points along a quadratic bend from a to b through c, for curved lines. */
export function bend(a: Vec3, c: Vec3, b: Vec3, n = 24): Vec3[] {
  const out: Vec3[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const u = 1 - t
    out.push([
      u * u * a[0] + 2 * u * t * c[0] + t * t * b[0],
      u * u * a[1] + 2 * u * t * c[1] + t * t * b[1],
      u * u * a[2] + 2 * u * t * c[2] + t * t * b[2],
    ])
  }
  return out
}

/** Memoised bend. Callers pass literal coordinates, so computing once is enough. */
export function useBend(a: Vec3, c: Vec3, b: Vec3, n = 24) {
  // Built once on mount. A lazy state initialiser, not a ref written during
  // render, so the React Compiler can neither skip nor reorder it.
  const [points] = useState(() => bend(a, c, b, n))
  return points
}

/** The drafting plate a station stands on. */
export function Plate({ y, size = 5 }: { y: number; size?: number }) {
  const c = useColors()
  return (
    <Reveal order={0} position={[0, y, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[size / 2, 64]} />
        <meshBasicMaterial color={c.paperRaised} transparent opacity={0.5} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <ringGeometry args={[size / 2 - 0.02, size / 2, 96]} />
        <meshBasicMaterial color={c.hairline} />
      </mesh>
    </Reveal>
  )
}

export function approach(ref: { current: number }, goal: number, dt: number, lambda = 6) {
  ref.current = stage.still ? goal : damp(ref.current, goal, lambda, dt)
  return ref.current
}

/**
 * The selection marker: a ring that glides to whatever is picked, so the
 * reader sees their choice land on the model.
 */
export function Halo({ targets, selected, color, radius = 0.55 }: { targets: Record<string, Vec3>; selected: string | null; color: string; radius?: number }) {
  const ref = useRef<Group>(null)
  const ring = useRef<Mesh>(null)
  const { index } = useStation()
  useFrame((state, dt) => {
    const g = ref.current
    if (!g) return
    const goal = selected ? targets[selected] : undefined
    // It belongs to its station: hidden with it, scaled in as it assembles.
    const shown = reveal(index, 1)
    g.visible = Boolean(goal) && shown > 0.002
    if (!goal) return
    g.scale.setScalar(Math.max(0.0001, shown))
    const k = stage.still ? 1 : 1 - Math.exp(-8 * Math.min(dt, 0.1))
    g.position.x += (goal[0] - g.position.x) * k
    g.position.y += (goal[1] - g.position.y) * k
    g.position.z += (goal[2] - g.position.z) * k
    if (ring.current && !stage.still) ring.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 3) * 0.06)
  })
  return (
    <group ref={ref}>
      <mesh ref={ring}>
        <torusGeometry args={[radius, 0.02, 12, 72]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  )
}
