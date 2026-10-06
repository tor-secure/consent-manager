// Written for plain React: the React Compiler is off for the explainer, whose
// 3D code mutates per-frame state in place, as React Three Fiber intends.
'use no memo'

import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line, RoundedBox } from '@react-three/drei'
import { DoubleSide, type Group } from 'three'
import { useChoices } from '../../state/journey'
import { clamp01 } from '../../utils/math'
import { Bead, Board, Checkpoint, Fiduciary, Flow, Focus, Part, Person, Reveal, Slip, Stop, Tag, approach, useColors } from '../kit'
import { stage } from '../presence'

type Vec3 = [number, number, number]

const REACHES: { label: string; from: Vec3; to: Vec3 }[] = [
  { label: 'tracking', from: [-1.85, 0.85, 0], to: [-0.98, 0.35, 0] },
  { label: 'monitoring', from: [-1.9, -0.55, 0], to: [-1.0, -0.25, 0] },
  { label: 'targeted ads', from: [1.85, 0.85, 0], to: [0.98, 0.35, 0] },
  { label: 'detrimental use', from: [1.9, -0.55, 0], to: [1.0, -0.25, 0] },
]

/** The Consent Manager scene sits beside the children's room. */
const M = 5.2

/**
 * 07 Where the rules tighten. Left: a child's data in a double-walled room;
 * a guardian's consent comes through one prescribed check, and tracking,
 * monitoring, targeted ads and detrimental processing are stopped at the wall.
 * Right: two holders that look alike, told apart: a registered Consent Manager
 * on your side, accountable to you; a platform inside the organisation, whose
 * line to the Board is stopped. The camera turns to the one the reader picks
 * (on a phone, only the picked one is shown: see `Focus`).
 */
export function Stricter() {
  return (
    <>
      <Focus view="children" at={[0, 0.35, 0]}>
        <Children />
      </Focus>
      <Focus view="manager" at={[M, 0.25, 0]}>
        <Manager />
      </Focus>
    </>
  )
}

function Children() {
  const c = useColors()
  const view = useChoices((s) => s.selection.stricter)
  const pulse = useChoices((s) => s.pulse.stricter)
  const at = useRef(-10)
  const bead = useRef<Group>(null)
  const stops = useRef(0)

  useEffect(() => {
    at.current = stage.elapsed
  }, [pulse])

  useFrame((_, dt) => {
    approach(stops, view === 'children' ? 1 : 0.4, dt)
    const b = bead.current
    if (!b) return
    const t = stage.still ? 99 : (stage.elapsed - at.current) % 3.2
    b.visible = view === 'children' && !stage.still
    b.position.y = 2.0 - clamp01(t / 1.6) * 1.6
  })

  return (
    <>
      <Reveal order={1}>
        {/* The double wall: protection, not an alarm. */}
        {[0.72, 0.9].map((r, k) => (
          <mesh key={r} rotation={[0, 0, 0]}>
            <cylinderGeometry args={[r, r, 1.3, 64, 1, true]} />
            <meshStandardMaterial color={c.withdraw} transparent opacity={k === 0 ? 0.12 : 0.08} side={DoubleSide} depthWrite={false} />
          </mesh>
        ))}
        {[0.72, 0.9].map((r) => (
          <group key={`rim${r}`}>
            <mesh position={[0, 0.65, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[r, 0.012, 8, 96]} />
              <meshBasicMaterial color={c.withdraw} />
            </mesh>
            <mesh position={[0, -0.65, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[r, 0.012, 8, 96]} />
              <meshBasicMaterial color={c.withdraw} />
            </mesh>
          </group>
        ))}
        <Tag position={[0, -0.98, 0]} tone="refuse" strong>A child’s data</Tag>
      </Reveal>

      <Reveal order={2}>
        <Part id="guardian" label="A parent or lawful guardian" position={[0, 2.3, 0]}>
          <Person scale={0.8} />
        </Part>
        <Tag position={[0, 2.78, 0]}>parent or guardian</Tag>
        <Flow points={[[0, 2.0, 0], [0, 0.4, 0]]} color={c.grant} width={2} flowing={view === 'children'} />
        <Part id="check" label="Verification, as the Rules prescribe" position={[0, 1.2, 0]}>
          <Checkpoint color={c.grant} radius={0.2} />
        </Part>
        <Tag position={[0.85, 1.2, 0]}>prescribed check</Tag>
        <group ref={bead} position={[0, 2, 0]} visible={false}>
          <Bead color={c.grant} radius={0.07} />
        </group>
      </Reveal>

      <Reveal order={3}>
        {REACHES.map((r) => (
          <group key={r.label}>
            <Flow points={[r.from, r.to]} color={c.inkMuted} width={1.6} dashed />
            <mesh position={r.from}>
              <sphereGeometry args={[0.08, 16, 8]} />
              <meshStandardMaterial color={c.inkSoft} />
            </mesh>
            <Stop position={r.to} rotation={Math.atan2(r.to[1] - r.from[1], r.to[0] - r.from[0]) + Math.PI / 2} visibleRef={stops} />
            <Tag position={[r.from[0], r.from[1] - 0.26, 0]}>{r.label}</Tag>
          </group>
        ))}
      </Reveal>
    </>
  )
}

function Manager() {
  const c = useColors()
  const view = useChoices((s) => s.selection.stricter)
  const apart = useRef(0)
  const left = useRef<Group>(null)
  const right = useRef<Group>(null)
  const divider = useRef<Group>(null)

  useFrame((_, dt) => {
    approach(apart, view === 'manager' ? 1 : 0, dt, 3)
    const a = apart.current
    if (left.current) left.current.position.x = M - 0.35 - a * 1.05
    if (right.current) right.current.position.x = M + 0.35 + a * 1.05
    if (divider.current) divider.current.scale.y = Math.max(0.0001, a)
  })

  return (
    <>
      <Reveal order={4}>
        {/* The divider: related ideas, different worlds. */}
        <group ref={divider} position={[M, 0.2, 0]}>
          <mesh>
            <boxGeometry args={[0.03, 3.4, 0.03]} />
            <meshBasicMaterial color={c.hairline} />
          </mesh>
        </group>

        <group ref={left} position={[M - 0.35, 0.2, 0]}>
          <Part id="manager" label="Consent Manager: registered, accountable to you">
            <Holder />
          </Part>
          <Tag position={[0, -0.72, 0]} strong>Consent Manager</Tag>
          <Flow points={[[0, 0.45, 0], [0, 1.25, 0]]} color={c.ink} width={2} />
          <Flow points={[[-0.35, 0, 0], [-1.05, -0.25, 0]]} color={c.data} width={1.8} />
          <group position={[-1.25, -0.3, 0]}>
            <Person scale={0.55} />
          </group>
          <Tag position={[-1.3, -0.72, 0]}>you</Tag>
        </group>

        <group ref={right} position={[M + 0.35, 0.2, 0]}>
          <Part id="platform" label="A consent management platform: software">
            <Holder />
          </Part>
          <Tag position={[0, -0.72, 0]} strong>Platform (software)</Tag>
          <Flow points={[[0, 0.45, 0], [-0.55, 1.2, 0]]} color={c.inkMuted} width={1.6} dashed />
          <Stop position={[-0.32, 0.82, 0.05]} rotation={-0.95} />
          <group position={[0.95, -0.15, 0]}>
            <Fiduciary size={0.42} />
          </group>
          {/* The organisation's boundary, which the platform sits inside. */}
          <Line
            points={[[-0.55, -1.0, 0], [1.4, -1.0, 0], [1.4, 0.65, 0], [-0.55, 0.65, 0], [-0.55, -1.0, 0]]}
            color={c.inkMuted}
            lineWidth={1.2}
            dashed
            dashSize={0.08}
            gapSize={0.07}
          />
          <Tag position={[0.95, 0.9, 0]}>organisation</Tag>
        </group>

        <group position={[M - 1.4, 1.75, 0]}>
          <Board />
          <Tag position={[0, 0.55, 0]}>Data Protection Board</Tag>
        </group>
      </Reveal>
    </>
  )
}

/** A holder of consent records: the two look identical on purpose. */
function Holder() {
  const c = useColors()
  return (
    <group>
      <RoundedBox args={[0.7, 0.8, 0.4]} radius={0.08} smoothness={3}>
        <meshStandardMaterial color={c.paperRaised} roughness={0.55} />
      </RoundedBox>
      <group position={[0, 0.02, 0.22]} scale={0.42}>
        <Slip rows={3} />
      </group>
    </group>
  )
}
