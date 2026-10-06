// Written for plain React: the React Compiler is off for the explainer, whose
// 3D code mutates per-frame state in place, as React Three Fiber intends.
'use no memo'

import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { useChoices } from '../../state/journey'
import { clamp01 } from '../../utils/math'
import { Bead, Fiduciary, Flow, Part, PurposeFrame, Reveal, Stop, Tag, approach, useBend, useColors, useStation } from '../kit'
import { reveal, stage } from '../presence'

/**
 * 02 Reason. A bar across the data's way down: holding it is not a reason.
 * Two ways round it, consent and a legitimate use the Act lists; a straight
 * shortcut dressed up as a legitimate use is refused at the bar. Around the
 * data, the purpose closes in until it fits.
 */
export function Reason() {
  const c = useColors()
  const { index } = useStation()
  const selected = useChoices((s) => s.selection.reason)
  const pulse = useChoices((s) => s.pulse.reason)
  const consent = useRef(0)
  const legit = useRef(0)
  const shortcut = useRef(0)
  const fit = useRef(0)
  const refused = useRef(0)
  const bead = useRef<Group>(null)
  const shotAt = useRef(-10)

  useEffect(() => {
    if (pulse > 0 && selected === 'shortcut') shotAt.current = stage.elapsed
  }, [pulse, selected])

  useFrame((_, dt) => {
    approach(consent, selected === 'consent' ? 1 : 0.15, dt)
    approach(legit, selected === 'legitimate' ? 1 : 0.15, dt)
    approach(shortcut, selected === 'shortcut' ? 1 : 0.1, dt)
    approach(refused, selected === 'shortcut' ? 1 : 0, dt, 8)
    fit.current = reveal(index, 5)

    // The shortcut's bead runs down, hits the bar, and is thrown back.
    const b = bead.current
    if (!b) return
    const t = stage.elapsed - shotAt.current
    const live = selected === 'shortcut' && t < 1.6 && !stage.still
    b.visible = live
    if (!live) return
    const down = clamp01(t / 0.55)
    const back = clamp01((t - 0.55) / 0.6)
    b.position.y = -0.4 - 0.6 * down * down + 0.45 * Math.sin(back * Math.PI * 0.5)
    b.scale.setScalar(1 - back)
  })

  const left = useBend([-0.15, -0.38, 0], [-1.75, -1.15, 0.15], [-0.32, -2.2, 0])
  const right = useBend([0.15, -0.38, 0], [1.75, -1.15, 0.15], [0.32, -2.2, 0])

  return (
    <>
      <PurposeFrame size={1.05} fitRef={fit} />
      <Tag position={[0.78, 0.5, 0]} tone="purpose">purpose</Tag>

      <Reveal order={1} position={[0, -1.15, 0]}>
        <Part id="bar" label="Holding it is not a reason">
          <mesh>
            <boxGeometry args={[1.3, 0.13, 0.13]} />
            <meshStandardMaterial color={c.ink} roughness={0.35} />
          </mesh>
        </Part>
        <Stop position={[0, 0.16, 0.1]} visibleRef={refused} />
      </Reveal>

      <Reveal order={2}>
        <Part id="consent" label="Consent" choose="consent" tagged>
          <Flow points={left} color={c.grant} width={4} flowing={selected === 'consent'} levelRef={consent} />
        </Part>
        <Tag position={[-1.55, -1.05, 0]} tone="grant" strong>Consent</Tag>
      </Reveal>

      <Reveal order={3}>
        <Part id="legitimate" label="Legitimate use" choose="legitimate" tagged>
          <Flow points={right} color={c.ink} width={4} flowing={selected === 'legitimate'} levelRef={legit} />
        </Part>
        <Tag position={[1.55, -1.05, 0]} strong>Legitimate use</Tag>
      </Reveal>

      <Reveal order={4}>
        <Part id="shortcut" label="A relabelled shortcut" choose="shortcut" tagged>
          <Flow points={[[0, -0.4, 0], [0, -1.02, 0]]} color={c.withdraw} width={3} dashed levelRef={shortcut} />
        </Part>
        <group ref={bead} position={[0, -0.4, 0]} visible={false}>
          <Bead color={c.withdraw} />
        </group>
        <Tag position={[0, -1.55, 0]} tone="refuse">“legitimate” shortcut</Tag>
      </Reveal>

      <Reveal order={5} position={[0, -2.5, 0]}>
        <Fiduciary size={0.5} />
        <Tag position={[0, -0.48, 0]}>processing</Tag>
      </Reveal>
    </>
  )
}
