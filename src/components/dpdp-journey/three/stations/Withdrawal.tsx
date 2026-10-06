// Written for plain React: the React Compiler is off for the explainer, whose
// 3D code mutates per-frame state in place, as React Three Fiber intends.
'use no memo'

import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { useChoices } from '../../state/journey'
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
  const withdrawn = useChoices((s) => s.selection.withdrawal === 'withdrawn')
  const pulse = useChoices((s) => s.pulse.withdrawal)
  const at = useRef(-10)
  const bead = useRef<Group>(null)
  const newSlip = useRef<Group>(null)
  const levels = [useRef(1), useRef(1), useRef(1)]
  const stops = [useRef(0), useRef(0), useRef(0)]
  const analytics = useRef(1)

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
    approach(analytics, withdrawn && t > 1.1 ? 0 : 1, dt)
    SYSTEMS.forEach((_, k) => {
      const dark = withdrawn && t > 1.3 + k * 0.45
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
        <Tag position={[-1.05, 1.2, 0]}>the past stays lawful</Tag>
      </Reveal>

      <Reveal order={2} position={[1.75, 0, 0]}>
        <Part id="record" label="The consent record">
          <group position={[0.08, 0.1, -0.1]}>
            <Slip edge={c.grant} />
          </group>
          <group ref={newSlip} position={[0, 0.15, 0.05]} visible={false}>
            <Slip edge={c.withdraw} />
          </group>
        </Part>
        <Tag position={[0, -0.7, 0]} strong>Consent record</Tag>
        {/* Notice versions: the earlier one kept, and the record still points at it. */}
        <group position={[0, 1.45, -0.2]} scale={0.42}>
          <Slip position={[-0.62, 0, 0]} rows={4} />
          <Slip position={[0.62, 0, 0]} rows={4} edge={c.data} />
        </group>
        <Flow points={[[0.05, 0.75, 0], [0.26, 1.2, -0.2]]} color={c.data} width={1.4} dashed />
        <Tag position={[0, 2.0, 0]}>notice versions, kept</Tag>
      </Reveal>

      <Reveal order={3}>
        <Flow points={necessary} color={c.ink} width={3} flowing />
        <Processor position={[1.6, -2.0, 0]} size={0.48} lit={c.ink} />
        <Tag position={[1.6, -2.48, 0]}>necessary runs on</Tag>
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
        <Tag position={[-1.0, -2.85, 0]}>told in turn</Tag>
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
