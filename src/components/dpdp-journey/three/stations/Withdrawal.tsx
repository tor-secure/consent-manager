// Written for plain React: the React Compiler is off for the explainer, whose
// 3D code mutates per-frame state in place, as React Three Fiber intends.
'use no memo'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Edges, Line, RoundedBox } from '@react-three/drei'
import type { Group, Mesh, MeshStandardMaterial } from 'three'
import type { SceneText } from '../../content/law'
import { useChoices } from '../../state/journey'
import { useLaw, useSelected } from '../../state/law'
import { clamp01 } from '../../utils/math'
import { Bead, Flow, Part, Person, Processor, Reveal, Slip, Stop, Tag, approach, useBend, useColors } from '../kit'
import { stage } from '../presence'

const SYSTEMS: [number, number, number][] = [
  [-1.85, -1.45, 0],
  [-1.15, -2.05, 0],
  [-0.3, -2.45, 0],
]

/**
 * 05 Record and withdrawal. Beside the data, the record: a slip that points
 * at the notice version you saw, which is kept. Withdraw, and a bead comes
 * down the same thread your yes did; a new slip is filed over the old one,
 * which stays; the systems that relied on consent are told and go dark one
 * after another, while the necessary stream runs on.
 */
export function Withdrawal() {
  const c = useColors()
  const t = useLaw().scene.withdrawal
  const withdrawn = useSelected('withdrawal') === 'withdrawn'
  const pulse = useChoices((s) => s.pulse.withdrawal)
  const at = useRef(-10)
  const bead = useRef<Group>(null)
  const newSlip = useRef<Group>(null)
  const levels = [useRef(1), useRef(1), useRef(1)]
  const stops = [useRef(0), useRef(0), useRef(0)]
  const analytics = useRef(1)
  // Where the law sets a deadline, the systems stop once it has run, not at once.
  const delay = t.timing ? 1.0 : 0

  useEffect(() => {
    if (pulse > 0 && withdrawn) at.current = stage.elapsed
  }, [pulse, withdrawn])

  useFrame((_, dt) => {
    const t = stage.still ? 99 : stage.elapsed - at.current
    const b = bead.current
    if (b) {
      b.visible = withdrawn && t < 0.9
      b.position.y = 1.8 - clamp01(t / 0.8) * 1.5
    }
    const s = newSlip.current
    if (s) {
      const drop = withdrawn ? clamp01((t - 0.8) / 0.45) : 0
      s.visible = drop > 0
      s.position.y = 0.15 + (1 - drop) * 0.9
      s.scale.setScalar(Math.max(0.0001, drop))
    }
    approach(analytics, withdrawn && t > 1.1 + delay ? 0 : 1, dt)
    SYSTEMS.forEach((_, k) => {
      const dark = withdrawn && t > 1.3 + delay + k * 0.45
      approach(levels[k], dark ? 0 : 1, dt, 8)
      approach(stops[k], dark ? 1 : 0, dt, 10)
    })
  })

  const chain = useBend([-0.3, -0.25, 0], [-1.7, -0.5, 0.1], [-1.85, -1.17, 0])
  const necessary = useBend([0.3, -0.25, 0], [1.5, -0.6, 0.1], [1.6, -1.72, 0])

  return (
    <>
      <Reveal order={1}>
        <group position={[0, 2.05, 0]}>
          <Person scale={0.75} />
        </group>
        <Flow points={[[0, 1.8, 0], [0, 0.32, 0]]} color={c.data} width={2} />
        <group ref={bead} position={[0, 1.8, 0]} visible={false}>
          <Bead color={c.withdraw} />
        </group>
        <Tag position={[-1.05, 1.2, 0]}>{t.past}</Tag>
      </Reveal>

      <Reveal order={2} position={[1.75, 0, 0]}>
        <Part id="record" label={t.record}>
          <group position={[0.08, 0.1, -0.1]}>
            <Slip edge={c.grant} />
          </group>
          <group ref={newSlip} position={[0, 0.15, 0.05]} visible={false}>
            <Slip edge={c.withdraw} />
          </group>
        </Part>
        <Tag position={[0, -0.7, 0]} strong>{t.record}</Tag>
        {t.timing ? (
          <Kept count={t.timing.keptCount} label={t.timing.kept} />
        ) : (
          <>
            {/* Notice versions: the earlier one kept, and the record still points at it. */}
            <group position={[0, 1.45, -0.2]} scale={0.42}>
              <Slip position={[-0.62, 0, 0]} rows={4} />
              <Slip position={[0.62, 0, 0]} rows={4} edge={c.data} />
            </group>
            <Tag position={[0, 2.0, 0]}>{t.versions}</Tag>
          </>
        )}
        <Flow points={[[0.05, 0.75, 0], [0.26, 1.2, -0.2]]} color={c.data} width={1.4} dashed />
      </Reveal>

      {t.symmetry ? <Symmetry t={t.symmetry} withdrawn={withdrawn} /> : null}
      {t.erasure ? <Erasure label={t.erasure} withdrawn={withdrawn} /> : null}
      {t.timing ? <Timing t={t.timing} withdrawn={withdrawn} at={at} /> : null}

      <Reveal order={3}>
        <Flow points={necessary} color={c.ink} width={3} flowing />
        <Processor position={[1.6, -2.0, 0]} size={0.48} lit={c.ink} />
        <Tag position={[1.6, -2.48, 0]}>{t.necessary}</Tag>
      </Reveal>

      <Reveal order={4}>
        <Flow points={chain} color={c.grant} width={3} flowing={!withdrawn} levelRef={analytics} />
        {SYSTEMS.map((p, k) => (
          <group key={k}>
            {k > 0 ? <Flow points={[SYSTEMS[k - 1], p]} color={c.grant} width={2.4} flowing={!withdrawn} levelRef={levels[k]} /> : null}
            <SystemNode position={p} level={levels[k]} />
            <Stop position={[p[0], p[1] + 0.36, 0.1]} visibleRef={stops[k]} />
          </group>
        ))}
        <Tag position={[-1.0, -2.85, 0]}>{t.told}</Tag>
      </Reveal>
    </>
  )
}

/** A connected system: lit while it may run, dark once told to stop. */
function SystemNode({ position, level }: { position: [number, number, number]; level: { current: number } }) {
  const c = useColors()
  const lit = useRef<Group>(null)
  const dark = useRef<Group>(null)
  useFrame(() => {
    if (!lit.current || !dark.current) return
    lit.current.visible = level.current > 0.5
    dark.current.visible = level.current <= 0.5
    lit.current.scale.setScalar(0.8 + 0.2 * level.current)
  })
  return (
    <group position={position}>
      <group ref={lit}>
        <Processor size={0.4} lit={c.grant} />
      </group>
      <group ref={dark} visible={false}>
        <Processor size={0.34} dark />
      </group>
    </group>
  )
}

type Timings = NonNullable<SceneText['withdrawal']['timing']>

/** How long the record is kept: one cell per month, in rows of twelve. */
function Kept({ count, label }: { count: number; label: string }) {
  const c = useColors()
  const rows = Math.ceil(count / 12)
  return (
    <group position={[0, 1.45, -0.2]}>
      {Array.from({ length: count }, (_, i) => (
        <mesh key={i} position={[-0.55 + (i % 12) * 0.1, 0.1 * (rows - 1) / 2 - Math.floor(i / 12) * 0.14, 0]}>
          <boxGeometry args={[0.07, 0.1, 0.04]} />
          <meshStandardMaterial color={c.data} emissive={c.data} emissiveIntensity={0.35} />
        </mesh>
      ))}
      <Tag position={[0, 0.48, 0.2]}>{label}</Tag>
    </group>
  )
}

/** Give and withdraw side by side, the same size: one is as easy as the other. */
function Symmetry({ t, withdrawn }: { t: NonNullable<SceneText['withdrawal']['symmetry']>; withdrawn: boolean }) {
  const c = useColors()
  return (
    <Reveal order={2}>
      {[
        { id: 'given', label: t.give, x: -1.85, tone: c.grant, on: !withdrawn },
        { id: 'withdrawn', label: t.withdraw, x: -1.05, tone: c.withdraw, on: withdrawn },
      ].map((b) => (
        <group key={b.id} position={[b.x, 0.5, 0]}>
          <Part id={`easy-${b.id}`} label={b.label} choose={b.id} tagged>
            <RoundedBox args={[0.7, 0.26, 0.07]} radius={0.04} smoothness={2}>
              <meshStandardMaterial color={b.on ? b.tone : c.paperRaised} emissive={b.on ? b.tone : c.paperRaised} emissiveIntensity={b.on ? 0.5 : 0.3} />
              <Edges color={b.tone} />
            </RoundedBox>
          </Part>
          <Tag position={[0, 0, 0.1]} strong>{b.label}</Tag>
        </group>
      ))}
      <Tag position={[-1.45, 0.12, 0]}>{t.note}</Tag>
    </Reveal>
  )
}

/** Erasure, drawn round the data and left unlit: withdrawing does not set it off. */
function Erasure({ label, withdrawn }: { label: string; withdrawn: boolean }) {
  const c = useColors()
  const h = 0.48
  return (
    <Reveal order={3}>
      <Part id="erasure" label={label}>
        <Line points={[[-h, h, 0], [h, h, 0], [h, -h, 0], [-h, -h, 0], [-h, h, 0]]} color={c.inkMuted} lineWidth={1.2} dashed dashSize={0.06} gapSize={0.06} />
      </Part>
      {withdrawn ? <Tag position={[0.0, -0.66, 0]}>{label}</Tag> : null}
    </Reveal>
  )
}

/**
 * The opt-out's clock. A deadline counted out in business days before the
 * selling stops, and, once opted out, a year's hold before you may be asked
 * to opt back in.
 */
function Timing({ t, withdrawn, at }: { t: Timings; withdrawn: boolean; at: { current: number } }) {
  const c = useColors()
  const days = useRef<(Mesh | null)[]>([])
  const months = useRef<(Mesh | null)[]>([])
  const ring = useMemo(
    () => Array.from({ length: t.holdCount }, (_, k) => {
      const a = Math.PI / 2 - (k / t.holdCount) * Math.PI * 2
      return [Math.cos(a) * 0.24, Math.sin(a) * 0.24, 0] as [number, number, number]
    }),
    [t.holdCount],
  )
  useFrame(() => {
    const s = stage.still ? 99 : stage.elapsed - at.current
    days.current.forEach((d, k) => {
      if (!d) return
      const on = withdrawn && s > 0.9 + (k / t.deadlineCount) * 1.3
      const m = d.material as MeshStandardMaterial
      m.emissiveIntensity = on ? 0.9 : 0.05
      d.scale.y = on ? 1 : 0.6
    })
    months.current.forEach((m, k) => {
      if (!m) return
      const on = withdrawn && s > 2.3 + k * 0.05
      m.scale.setScalar(on ? 1 : 0.55)
      ;(m.material as MeshStandardMaterial).emissiveIntensity = on ? 0.8 : 0.05
    })
  })
  return (
    <Reveal order={4}>
      <Part id="deadline" label={t.deadline}>
        {Array.from({ length: t.deadlineCount }, (_, k) => (
          <mesh key={k} ref={(node) => { days.current[k] = node }} position={[-1.85 + k * (1.2 / (t.deadlineCount - 1)), 0.0, 0]}>
            <boxGeometry args={[0.05, 0.16, 0.04]} />
            <meshStandardMaterial color={c.withdraw} emissive={c.withdraw} emissiveIntensity={0.05} />
          </mesh>
        ))}
      </Part>
      <Tag position={[-1.25, 0.3, 0]}>{t.deadline}</Tag>

      <group position={[0.7, 1.5, 0]}>
        <Part id="hold" label={t.hold}>
          {ring.map((p, k) => (
            <mesh key={k} ref={(node) => { months.current[k] = node }} position={p}>
              <sphereGeometry args={[0.045, 12, 8]} />
              <meshStandardMaterial color={c.withdraw} emissive={c.withdraw} emissiveIntensity={0.05} />
            </mesh>
          ))}
        </Part>
        <Tag position={[0, -0.42, 0]}>{t.hold}</Tag>
      </group>
    </Reveal>
  )
}
