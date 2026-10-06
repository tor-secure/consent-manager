// Written for plain React: the React Compiler is off for the explainer, whose
// 3D code mutates per-frame state in place, as React Three Fiber intends.
'use no memo'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useChoices } from '../../state/journey'
import { Checkpoint, Flow, Part, Processor, PurposeFrame, Reveal, Stop, Tag, approach, useBend, useColors } from '../kit'

type Vec3 = [number, number, number]

const STREAMS: { id: string; label: string; vendor: string; x: number }[] = [
  { id: 'analytics', label: 'Analytics', vendor: 'analytics vendor', x: -1.75 },
  { id: 'necessary', label: 'Necessary', vendor: 'the service', x: 0 },
  { id: 'advertising', label: 'Advertising', vendor: 'ad vendor', x: 1.75 },
]
const GATE_Y = -1.3
const VENDOR_Y = -2.35

/**
 * 04 Purposes. One stream comes apart into three, each inside its own
 * purpose. What your choice allows runs on to its vendor; what you declined
 * stays drawn and open but stops short, its vendor dark. Clicking a stream
 * answers that purpose, exactly as the switch in the card does.
 */
export function Purposes() {
  return (
    <>
      <Reveal order={1}>
        <SharedStem />
      </Reveal>
      {STREAMS.map((s, i) => (
        <Reveal key={s.id} order={2 + i}>
          <Stream {...s} />
        </Reveal>
      ))}
    </>
  )
}

function SharedStem() {
  const c = useColors()
  return <Flow points={[[0, -0.33, 0], [0, -0.62, 0]]} color={c.inkSoft} width={3} />
}

function Stream({ id, label, vendor, x }: { id: string; label: string; vendor: string; x: number }) {
  const c = useColors()
  const on = useChoices((s) => s.purposes[id])
  const level = useRef(on ? 1 : 0)
  const stop = useRef(on ? 0 : 1)
  useFrame((_, dt) => {
    approach(level, on ? 1 : 0, dt)
    approach(stop, on ? 0 : 1, dt, 9)
  })
  const tone = id === 'necessary' ? c.ink : c.grant
  const to = useBend([0, -0.62, 0], [x, -0.75, 0.1], [x, GATE_Y + 0.27, 0])
  const onward: Vec3[] = [[x, GATE_Y - 0.27, 0], [x, VENDOR_Y + 0.3, 0]]

  return (
    <Part id={id} label={label} choose={id} tagged>
      <Flow points={to} color={on ? tone : c.inkMuted} width={on ? 3.2 : 2} flowing={on} dashed={!on} levelRef={level} />
      <group position={[x, GATE_Y, 0]}>
        <PurposeFrame size={0.78} />
        <Checkpoint color={on ? tone : c.inkMuted} radius={0.24} />
        <Tag position={[0, 0.58, 0]} strong tone={on && id !== 'necessary' ? 'grant' : undefined}>
          {label}
        </Tag>
      </group>
      {/* Declined is still drawn, open, and stops before the vendor. */}
      <Flow points={onward} color={on ? tone : c.inkMuted} width={on ? 3.2 : 1.5} flowing={on} dashed={!on} levelRef={level} />
      <Stop position={[x, (GATE_Y + VENDOR_Y) / 2 - 0.05, 0.05]} visibleRef={stop} />
      <Processor position={[x, VENDOR_Y, 0]} size={0.5} lit={on ? tone : undefined} dark={!on} />
      <Tag position={[x, VENDOR_Y - 0.48, 0]}>{vendor}</Tag>
    </Part>
  )
}
