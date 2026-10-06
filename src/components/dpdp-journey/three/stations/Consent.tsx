// Written for plain React: the React Compiler is off for the explainer, whose
// 3D code mutates per-frame state in place, as React Three Fiber intends.
'use no memo'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { Color, type Group, type Mesh, type MeshStandardMaterial } from 'three'
import { useChoices } from '../../state/journey'
import { clamp01 } from '../../utils/math'
import { Flow, Part, Person, PurposeFrame, Reveal, Tag, useBend, useColors } from '../kit'
import { stage } from '../presence'

const RINGS = [2.05, 1.52, 0.99]
const START = 2.45
const SPEED = 1.7
/** Which check each attempt fails at; −1 passes all three. */
const FAILS: Record<string, number> = { silence: 0, uninformed: 1, bundled: 2, given: -1 }
const RING_LABELS = ['clear action', 'informed', 'free']

/**
 * 03 Consent. The notice, itemised, beside the question. Three checks on the
 * thread between you and your data; a would-be consent comes down it and
 * stops at the check it fails, or passes all three, and the data changes in
 * place (its colour is set by the token, from the same choice).
 */
export function Consent() {
  const c = useColors()
  const selected = useChoices((s) => s.selection.consent)
  const pulse = useChoices((s) => s.pulse.consent)
  const sentAt = useRef(-10)
  const bead = useRef<Group>(null)
  const ringRefs = useRef<(Mesh | null)[]>([])
  const items = useRef<(Mesh | null)[]>([])
  const colors = useMemo(() => ({ rest: new Color(), grant: new Color(), refuse: new Color(), tmp: new Color() }), [])

  useEffect(() => {
    if (pulse > 0) sentAt.current = stage.elapsed
  }, [pulse])

  useFrame(() => {
    colors.rest.set(c.inkMuted)
    colors.grant.set(c.grant)
    colors.refuse.set(c.withdraw)
    const fail = selected ? FAILS[selected] : -2
    const t = stage.still ? 99 : stage.elapsed - sentAt.current
    const stopY = fail >= 0 ? RINGS[fail] + 0.12 : 0.18
    const travel = (START - stopY) / SPEED
    const y = START - Math.min(t, travel) * SPEED

    const b = bead.current
    if (b) {
      const after = t - travel
      b.visible = selected !== null && !stage.still && after < 1.2
      b.position.y = y
      // A refused consent shakes at the check, then fades; a real yes sinks in.
      b.position.x = fail >= 0 && after > 0 ? Math.sin(after * 40) * 0.05 * Math.max(0, 1 - after * 1.5) : 0
      b.scale.setScalar(after > 0 ? Math.max(0.0001, 1 - clamp01((after - (fail >= 0 ? 0.6 : 0)) / 0.5)) : 1)
    }

    ringRefs.current.forEach((ring, k) => {
      if (!ring) return
      const m = ring.material as MeshStandardMaterial
      const reached = selected !== null && y <= RINGS[k] + 0.13
      let tone = colors.rest
      if (reached && fail === k) tone = colors.refuse
      else if (reached && (fail === -1 || k < fail)) tone = colors.grant
      colors.tmp.copy(tone)
      m.color.copy(colors.tmp)
      m.emissive.copy(colors.tmp)
      m.emissiveIntensity = reached && tone !== colors.rest ? 0.9 : 0.15
    })

    // The notice resolves into its items one after another.
    items.current.forEach((item, k) => {
      if (!item) return
      const on = clamp01((stage.elapsed % 6) * 1.2 - k * 0.6)
      item.scale.x = stage.still ? 1 : 0.35 + 0.65 * on
    })
  })

  const toData = useBend([-1.1, 1.55, 0], [-0.7, 0.6, 0.2], [-0.32, 0.1, 0])
  const toPurpose = useBend([-1.1, 1.25, 0], [-0.9, 0.4, 0.2], [-0.56, -0.35, 0])

  return (
    <>
      <PurposeFrame size={1.05} />

      <Reveal order={1}>
        <Part id="you" label="You" position={[0, 2.85, 0]}>
          <Person scale={0.7} />
        </Part>
        <Flow points={[[0, 2.6, 0], [0, 0.3, 0]]} color={c.data} width={2} />
      </Reveal>

      <Reveal order={2}>
        {RINGS.map((y, k) => (
          <group key={y} position={[0, y, 0]}>
            <mesh ref={(node) => { ringRefs.current[k] = node }}>
              <torusGeometry args={[0.22, 0.026, 16, 64]} />
              <meshStandardMaterial color={c.inkMuted} roughness={0.35} toneMapped={false} />
            </mesh>
            <Tag position={[0.78, 0, 0]}>{`${k + 1} · ${RING_LABELS[k]}`}</Tag>
          </group>
        ))}
      </Reveal>

      <group ref={bead} position={[0, START, 0]} visible={false}>
        <AttemptBead kind={selected} />
      </group>

      <Reveal order={3} position={[-1.75, 1.25, -0.1]}>
        <group rotation={[0, 0.3, 0]}>
          <Part id="notice" label="An itemised notice">
            <RoundedBox args={[1.15, 1.5, 0.05]} radius={0.03} smoothness={2}>
              <meshStandardMaterial color={c.paperRaised} emissive={c.paperRaised} emissiveIntensity={0.55} roughness={0.85} />
            </RoundedBox>
            {[0, 1, 2, 3, 4].map((k) => (
              <mesh key={k} ref={(node) => { items.current[k] = node }} position={[0, 0.5 - k * 0.24, 0.035]}>
                <boxGeometry args={[0.8, 0.07, 0.01]} />
                <meshBasicMaterial color={k === 0 ? c.data : k === 1 ? c.purpose : c.inkMuted} />
              </mesh>
            ))}
          </Part>
          <Tag position={[0, 0.98, 0]} strong>Notice</Tag>
        </group>
      </Reveal>
      <Reveal order={4}>
        <Flow points={toData} color={c.data} width={1.4} dashed />
        <Flow points={toPurpose} color={c.purpose} width={1.4} dashed />
      </Reveal>
    </>
  )
}

/** The would-be consents, each shaped like what it is. */
function AttemptBead({ kind }: { kind: string | null }) {
  const c = useColors()
  if (kind === 'silence') {
    return (
      <mesh>
        <sphereGeometry args={[0.11, 16, 8]} />
        <meshBasicMaterial color={c.inkMuted} wireframe />
      </mesh>
    )
  }
  if (kind === 'uninformed') {
    return (
      <mesh>
        <sphereGeometry args={[0.13, 24, 12]} />
        <meshStandardMaterial color={c.inkMuted} transparent opacity={0.45} roughness={1} />
      </mesh>
    )
  }
  if (kind === 'bundled') {
    return (
      <group>
        <mesh>
          <sphereGeometry args={[0.1, 24, 12]} />
          <meshStandardMaterial color={c.inkSoft} />
        </mesh>
        <mesh position={[0.2, 0.12, 0]}>
          <boxGeometry args={[0.16, 0.16, 0.16]} />
          <meshStandardMaterial color={c.ink} />
        </mesh>
      </group>
    )
  }
  return (
    <mesh>
      <sphereGeometry args={[0.1, 24, 12]} />
      <meshStandardMaterial color={c.grant} emissive={c.grant} emissiveIntensity={1.8} toneMapped={false} />
    </mesh>
  )
}
