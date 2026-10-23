// Written for plain React: the React Compiler is off for the explainer, whose
// 3D code mutates per-frame state in place, as React Three Fiber intends.
'use no memo'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Edges, Line } from '@react-three/drei'
import type { Group, Mesh, MeshStandardMaterial } from 'three'
import type { SceneText } from '../../content/law'
import { useLaw, useSelected } from '../../state/law'
import { Bead, Checkpoint, Flow, Halo, Part, Person, Processor, Reveal, Tag, useColors } from '../kit'
import { stage } from '../presence'

type Vec3 = [number, number, number]

const R = 1.85
/** Step `k` of `n` round the loop, starting at the top. */
const around = (n: number) => (k: number, r = R): Vec3 => {
  const a = Math.PI / 2 - (k / n) * Math.PI * 2
  return [Math.cos(a) * r, Math.sin(a) * r, 0]
}

/**
 * 08 The whole system. The consent lifecycle as a closed loop of its steps
 * around your data, a pulse going round it; outside it, a dashed boundary for
 * the duties the loop never reaches; above, the thread back to the person it
 * was all about.
 */
export function System() {
  const c = useColors()
  const law = useLaw()
  const t = law.scene.system
  const steps = law.stations[7].control.options
  const at = useMemo(() => around(steps.length), [steps.length])
  const selected = useSelected('system')
  const pulse = useRef<Group>(null)
  const rings = useRef<(Mesh | null)[]>([])
  const loop = useMemo(() => Array.from({ length: 97 }, (_, i) => at((i / 96) * steps.length)), [at, steps.length])
  const outer = useMemo(() => Array.from({ length: 129 }, (_, i) => at((i / 128) * steps.length, 2.6)), [at, steps.length])
  const targets = useMemo(() => Object.fromEntries(steps.map((s, k) => [s.id, at(k)])), [at, steps])

  useFrame((state) => {
    const t = stage.still ? 0 : state.clock.elapsedTime / 1.1
    const pos = t % steps.length
    if (pulse.current) {
      const p = at(pos)
      pulse.current.position.set(p[0], p[1], p[2])
      pulse.current.visible = !stage.still
    }
    rings.current.forEach((ring, k) => {
      if (!ring) return
      const near = Math.max(0, 1 - Math.min(Math.abs(pos - k), steps.length - Math.abs(pos - k)) * 1.6)
      const m = ring.material as MeshStandardMaterial
      m.emissiveIntensity = 0.2 + near * 1.4
      ring.scale.setScalar(1 + near * 0.18)
    })
  })

  return (
    <>
      <Reveal order={1}>
        <group position={[0, 2.75, 0]}>
          <Person scale={0.7} />
        </group>
        <Flow points={[[0, 2.5, 0], [0, 0.32, 0]]} color={c.data} width={1.6} />
        <Tag position={[0, 3.2, 0]}>{t.person}</Tag>
      </Reveal>

      <Reveal order={2}>
        <Flow points={loop} color={c.data} width={3} flowing />
        {steps.map((s, k) => {
          const p = at(k)
          const label = at(k, R + 0.5)
          return (
            <group key={s.id}>
              <Part id={s.id} label={s.label} choose={s.id} position={p} tagged>
                <mesh ref={(node) => { rings.current[k] = node }}>
                  <torusGeometry args={[0.17, 0.035, 12, 48]} />
                  <meshStandardMaterial color={c.data} emissive={c.data} roughness={0.3} toneMapped={false} />
                </mesh>
              </Part>
              <Tag position={label} strong={selected === s.id} tone={selected === s.id ? 'data' : undefined}>
                {`${k + 1} ${s.label}`}
              </Tag>
            </group>
          )
        })}
        <group ref={pulse}>
          <Bead color={c.grant} radius={0.08} glow={2.4} />
        </group>
        <Halo selected={selected} targets={targets} color={c.grant} radius={0.3} />
      </Reveal>

      <Reveal order={3}>
        <Line points={outer} color={c.inkMuted} lineWidth={1.2} dashed dashSize={0.1} gapSize={0.08} />
        <Tag position={[0, -2.82, 0]}>{t.boundary}</Tag>
      </Reveal>

      {t.crossing ? <Crossing crossing={t.crossing} at={at(t.crossing.step)} /> : null}
    </>
  )
}

/**
 * Something crossing the boundary. A transfer leaves the loop, passes a check
 * on the boundary, and reaches a recipient outside it. A signal starts outside
 * (a browser's opt-out preference) and runs in to the step it sets off.
 */
function Crossing({ crossing, at }: { crossing: NonNullable<SceneText['system']['crossing']>; at: Vec3 }) {
  const c = useColors()
  const bead = useRef<Group>(null)
  const len = Math.hypot(at[0], at[1])
  const dir: Vec3 = [at[0] / len, at[1] / len, 0]
  const transfer = crossing.kind === 'transfer'
  // A transfer runs straight out; a signal comes in from below the step, clear of its label.
  const outside: Vec3 = transfer
    ? [dir[0] * 3.1, dir[1] * 3.1, 0]
    : [Math.cos(Math.atan2(dir[1], dir[0]) - 0.45) * 2.85, Math.sin(Math.atan2(dir[1], dir[0]) - 0.45) * 2.85, 0]
  const gate: Vec3 = transfer ? [dir[0] * 2.6, dir[1] * 2.6, 0] : outside
  const from = transfer ? at : outside
  const to = transfer ? outside : at

  useFrame((state) => {
    const b = bead.current
    if (!b) return
    const k = stage.still ? 0.5 : (state.clock.elapsedTime * 0.45) % 1
    b.position.set(from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k, 0.02)
    b.visible = !stage.still
  })

  return (
    <Reveal order={4}>
      <Part id="crossing" label={crossing.hover}>
        <Flow points={[from, to]} color={transfer ? c.ink : c.withdraw} width={2} dashed={!transfer} flowing={transfer} />
        {transfer ? (
          <>
            <Checkpoint color={c.grant} position={gate} radius={0.18} />
            <Processor position={outside} size={0.36} lit={c.ink} />
          </>
        ) : (
          <group position={outside}>
            {/* The browser that sends the signal. */}
            <mesh>
              <boxGeometry args={[0.46, 0.32, 0.05]} />
              <meshStandardMaterial color={c.paperRaised} emissive={c.paperRaised} emissiveIntensity={0.4} />
              <Edges color={c.ink} />
            </mesh>
            <mesh position={[0, 0.12, 0.03]}>
              <boxGeometry args={[0.46, 0.06, 0.01]} />
              <meshBasicMaterial color={c.ink} />
            </mesh>
          </group>
        )}
      </Part>
      <group ref={bead}>
        <Bead color={transfer ? c.ink : c.withdraw} radius={0.06} glow={transfer ? 0.4 : 1.6} />
      </group>
      <Tag position={transfer ? [outside[0] + 0.3, outside[1] + 0.42, 0] : [outside[0], outside[1] - 0.36, 0]}>{crossing.label}</Tag>
    </Reveal>
  )
}
