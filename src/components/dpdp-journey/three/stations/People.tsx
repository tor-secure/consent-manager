// Written for plain React: the React Compiler is off for the explainer, whose
// 3D code mutates per-frame state in place, as React Three Fiber intends.
'use no memo'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useChoices } from '../../state/journey'
import { Fiduciary, Flow, Halo, Part, Person, Processor, Reveal, Tag, approach, useBend, useColors } from '../kit'

const YOU: [number, number, number] = [-1.9, 0.75, 0]
const FIDUCIARY: [number, number, number] = [1.75, 0.75, 0]
const PROCESSOR: [number, number, number] = [1.75, -1.05, 0]

/**
 * 01 People. You, your data on its thread, the organisation that decides
 * about it, and the vendor working for that organisation. The fiduciary's
 * line runs on to the processor: responsibility stays where it was.
 */
export function People() {
  const c = useColors()
  const selected = useChoices((s) => s.selection.people)
  const level = useRef(0)
  useFrame((_, dt) => {
    approach(level, selected === 'processor' ? 1 : 0.35, dt)
  })

  const pointing = useBend(YOU, [-1.0, 0.75, 0.2], [-0.32, 0.05, 0])
  const decides = useBend([0.32, 0.05, 0], [1.0, 0.7, 0.1], [1.4, 0.75, 0])
  const onBehalf = useBend([0.25, -0.2, 0], [0.9, -1.05, 0.1], [1.45, -1.05, 0])

  return (
    <>
      <Reveal order={1}>
        <Flow points={pointing} color={c.data} width={2.5} flowing />
        <Part id="principal" label="You: the Data Principal" choose="principal" position={YOU} tagged>
          <Person />
          <Tag position={[0, -0.62, 0]} strong>You · Data Principal</Tag>
        </Part>
      </Reveal>

      <Reveal order={2}>
        <Flow points={decides} color={c.inkSoft} width={2} />
        <Part id="fiduciary" label="Data Fiduciary" choose="fiduciary" position={FIDUCIARY} tagged>
          <Fiduciary />
          <Tag position={[0, 0.6, 0]} strong>Data Fiduciary</Tag>
        </Part>
      </Reveal>

      <Reveal order={3}>
        <Flow points={onBehalf} color={c.inkMuted} width={1.6} dashed />
        {/* Responsibility: from the fiduciary down to its processor, and it stays. */}
        <Flow points={[[1.75, 0.38, 0], [1.75, -0.72, 0]]} color={c.ink} width={3} flowing={selected === 'processor'} levelRef={level} />
        <Part id="processor" label="Data Processor" choose="processor" position={PROCESSOR} tagged>
          <Processor />
          <Tag position={[0, -0.58, 0]} strong>Data Processor</Tag>
        </Part>
        <Tag position={[2.45, -0.15, 0]}>responsibility stays</Tag>
      </Reveal>

      <Tag position={[0, -0.55, 0]} tone="data">your data</Tag>

      <Halo
        selected={selected}
        color={c.data}
        targets={{ principal: YOU, fiduciary: FIDUCIARY, processor: PROCESSOR }}
      />
    </>
  )
}
