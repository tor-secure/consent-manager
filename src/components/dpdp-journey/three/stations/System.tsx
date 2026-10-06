// Written for plain React: the React Compiler is off for the explainer, whose
// 3D code mutates per-frame state in place, as React Three Fiber intends.
'use no memo'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import type { Group, Mesh, MeshStandardMaterial } from 'three'
import { stations } from '../../content/stations'
import { useChoices } from '../../state/journey'
import { Bead, Flow, Halo, Part, Person, Reveal, Tag, useColors } from '../kit'
import { stage } from '../presence'

type Vec3 = [number, number, number]

const R = 1.85
const steps = stations[7].control.options
const at = (k: number, r = R): Vec3 => {
  const a = Math.PI / 2 - (k / steps.length) * Math.PI * 2
  return [Math.cos(a) * r, Math.sin(a) * r, 0]
}

/**
 * 08 The whole system. The consent lifecycle as a closed loop of seven steps
 * around your data, a pulse going round it; outside it, a dashed boundary for
 * the duties the loop never reaches; above, the thread back to the person it
 * was all about.
 */
export function System() {
  const c = useColors()
  const selected = useChoices((s) => s.selection.system)
  const pulse = useRef<Group>(null)
  const rings = useRef<(Mesh | null)[]>([])
  const loop = useMemo(() => Array.from({ length: 97 }, (_, i) => at((i / 96) * steps.length)), [])
  const outer = useMemo(() => Array.from({ length: 129 }, (_, i) => at((i / 128) * steps.length, 2.6)), [])
  const targets = useMemo(() => Object.fromEntries(steps.map((s, k) => [s.id, at(k)])), [])

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
        <Tag position={[0, 3.2, 0]}>a person, throughout</Tag>
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
        <Tag position={[0, -2.82, 0]}>wider duties, beyond the banner</Tag>
      </Reveal>
    </>
  )
}
