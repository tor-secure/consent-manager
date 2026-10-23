// Written for plain React: the React Compiler is off for the explainer, whose
// 3D code mutates per-frame state in place, as React Three Fiber intends.
'use no memo'

import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line, RoundedBox } from '@react-three/drei'
import { DoubleSide, type Group } from 'three'
import type { StricterScene } from '../../content/law'
import { useChoices } from '../../state/journey'
import { useLaw, useSelected } from '../../state/law'
import { clamp01 } from '../../utils/math'
import { Bead, Board, Checkpoint, Fiduciary, Flow, Focus, Part, Person, Reveal, Slip, Stop, Tag, approach, useColors } from '../kit'
import { stage } from '../presence'

type Vec3 = [number, number, number]

/** Where reaches come at the wall from: upper left, lower left, upper right, lower right. */
const REACHES: { from: Vec3; to: Vec3 }[] = [
  { from: [-1.85, 0.85, 0], to: [-0.98, 0.35, 0] },
  { from: [-1.9, -0.55, 0], to: [-1.0, -0.25, 0] },
  { from: [1.85, 0.85, 0], to: [0.98, 0.35, 0] },
  { from: [1.9, -0.55, 0], to: [1.0, -0.25, 0] },
]
/** Which of those a law's two, three or four reaches use, kept balanced. */
const SPREAD: Record<number, number[]> = { 1: [0], 2: [0, 2], 3: [0, 2, 1], 4: [0, 1, 2, 3] }

/** The second scene sits beside the first. */
const M = 5.2

/**
 * 07 Where the rules tighten: two scenes side by side, one per option, and
 * the camera turns to the one the reader picks (on a phone, only the picked
 * one is shown: see `Focus`). Each is either
 *
 * - a room: protected data (in the DPDP Act, a child's) behind a double wall;
 *   one way in, through one check, and other reaches stopped at the wall; or
 * - two holders that look alike, told apart: a registered Consent Manager on
 *   your side, accountable to you; a platform inside the organisation, whose
 *   line to the Board is stopped.
 */
export function Stricter() {
  const law = useLaw()
  const options = law.stations[6].control.options
  return (
    <>
      {law.scene.stricter.map((scene, k) => {
        const option = options[k]?.id ?? String(k)
        const x = k * M
        return (
          <Focus key={option} view={option} at={[x, scene.kind === 'room' ? 0.35 : 0.25, 0]}>
            {scene.kind === 'room' ? (
              <group position={[x, 0, 0]}>
                <Room scene={scene} option={option} order={k * 3} />
              </group>
            ) : (
              <Holders scene={scene} option={option} />
            )}
          </Focus>
        )
      })}
    </>
  )
}

function Room({ scene, option, order }: { scene: Extract<StricterScene, { kind: 'room' }>; option: string; order: number }) {
  const c = useColors()
  const view = useSelected('stricter')
  const pulse = useChoices((s) => s.pulse.stricter)
  const at = useRef(-10)
  const bead = useRef<Group>(null)
  const stops = useRef(0)

  useEffect(() => {
    at.current = stage.elapsed
  }, [pulse])

  useFrame((_, dt) => {
    approach(stops, view === option ? 1 : 0.4, dt)
    const b = bead.current
    if (!b) return
    const t = stage.still ? 99 : (stage.elapsed - at.current) % 3.2
    b.visible = view === option && !stage.still
    b.position.y = 2.0 - clamp01(t / 1.6) * 1.6
  })

  return (
    <>
      <Reveal order={order + 1}>
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
        <Tag position={[0, -0.98, 0]} tone="refuse" strong>{scene.subject}</Tag>
        {scene.contents ? <Contents items={scene.contents} option={option} /> : null}
        {scene.ages ? <Ages {...scene.ages} /> : null}
      </Reveal>

      <Reveal order={order + 2}>
        {scene.second ? (
          <>
            {/* Two ways in, both through the same check. */}
            {[
              { x: -0.55, label: scene.gatekeeper, hover: scene.gatekeeperHover, shape: scene.gatekeeperShape, id: 'gatekeeper' },
              { x: 0.55, label: scene.second.label, hover: scene.second.hover, shape: scene.second.shape, id: 'second' },
            ].map((g) => (
              <group key={g.id}>
                <Part id={`${option}-${g.id}`} label={g.hover} position={[g.x, 2.3, 0]}>
                  {g.shape === 'organisation' ? <Fiduciary size={0.38} /> : <Person scale={0.7} />}
                </Part>
                <Tag position={[g.x, 2.75, 0]}>{g.label}</Tag>
                <Flow points={[[g.x, 2.02, 0], [0, 1.42, 0]]} color={c.grant} width={2} flowing={view === option} />
              </group>
            ))}
            <Flow points={[[0, 1.0, 0], [0, 0.4, 0]]} color={c.grant} width={2} flowing={view === option} />
          </>
        ) : (
          <>
            <Part id={`${option}-gatekeeper`} label={scene.gatekeeperHover} position={[0, 2.3, 0]}>
              {scene.gatekeeperShape === 'organisation' ? <Fiduciary size={0.42} /> : <Person scale={0.8} />}
            </Part>
            <Tag position={[0, 2.78, 0]}>{scene.gatekeeper}</Tag>
            <Flow points={[[0, 2.0, 0], [0, 0.4, 0]]} color={c.grant} width={2} flowing={view === option} />
          </>
        )}
        <Part id={`${option}-check`} label={scene.checkHover} position={[0, 1.2, 0]}>
          <Checkpoint color={c.grant} radius={0.2} />
        </Part>
        <Tag position={[0.85, 1.2, 0]}>{scene.check}</Tag>
        <group ref={bead} position={[0, 2, 0]} visible={false}>
          <Bead color={c.grant} radius={0.07} />
        </group>
      </Reveal>

      <Reveal order={order + 3}>
        {scene.reaches.slice(0, 4).map((label, k) => {
          const r = REACHES[SPREAD[Math.min(scene.reaches.length, 4)][k]]
          return (
            <group key={label}>
              <Flow points={[r.from, r.to]} color={c.inkMuted} width={1.6} dashed />
              <mesh position={r.from}>
                <sphereGeometry args={[0.08, 16, 8]} />
                <meshStandardMaterial color={c.inkSoft} />
              </mesh>
              <Stop position={r.to} rotation={Math.atan2(r.to[1] - r.from[1], r.to[0] - r.from[0]) + Math.PI / 2} visibleRef={stops} />
              <Tag position={[r.from[0], r.from[1] - 0.26, 0]}>{label}</Tag>
            </group>
          )
        })}
      </Reveal>
    </>
  )
}

function Holders({ scene, option }: { scene: Extract<StricterScene, { kind: 'holders' }>; option: string }) {
  const c = useColors()
  const view = useSelected('stricter')
  const apart = useRef(0)
  const left = useRef<Group>(null)
  const right = useRef<Group>(null)
  const divider = useRef<Group>(null)

  useFrame((_, dt) => {
    approach(apart, view === option ? 1 : 0, dt, 3)
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
          <Part id="manager" label={scene.leftHover}>
            <Holder />
          </Part>
          <Tag position={[0, -0.72, 0]} strong>{scene.left}</Tag>
          <Flow points={[[0, 0.45, 0], [0, 1.25, 0]]} color={c.ink} width={2} />
          <Flow points={[[-0.35, 0, 0], [-1.05, -0.25, 0]]} color={c.data} width={1.8} />
          <group position={[-1.25, -0.3, 0]}>
            <Person scale={0.55} />
          </group>
          <Tag position={[-1.3, -0.72, 0]}>{scene.you}</Tag>
        </group>

        <group ref={right} position={[M + 0.35, 0.2, 0]}>
          <Part id="platform" label={scene.rightHover}>
            <Holder />
          </Part>
          <Tag position={[0, -0.72, 0]} strong>{scene.right}</Tag>
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
          <Tag position={[0.95, 0.9, 0]}>{scene.organisation}</Tag>
        </group>

        <group position={[M - 1.4, 1.75, 0]}>
          <Board />
          <Tag position={[0, 0.55, 0]}>{scene.authority}</Tag>
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

/** What the room protects: a ring of small tiles inside the wall, each named on hover. */
function Contents({ items, option }: { items: string[]; option: string }) {
  const c = useColors()
  return (
    <>
      {items.map((item, k) => {
        const a = Math.PI / 2 - (k / items.length) * Math.PI * 2
        return (
          <Part key={item} id={`${option}-content-${k}`} label={item} position={[Math.cos(a) * 0.46, Math.sin(a) * 0.46 * 0.75, 0]}>
            <mesh rotation={[0.3, 0.5, 0]}>
              <boxGeometry args={[0.1, 0.1, 0.1]} />
              <meshStandardMaterial color={c.withdraw} emissive={c.withdraw} emissiveIntensity={0.35} roughness={0.4} />
            </mesh>
          </Part>
        )
      })}
    </>
  )
}

/** An age scale under the room: its marks, with the span that applies drawn in. */
function Ages({ marks, from, to, label }: { marks: string[]; from: number; to: number; label: string }) {
  const c = useColors()
  const x = (k: number) => -0.66 + (k / Math.max(1, marks.length - 1)) * 1.32
  return (
    <group position={[0, -1.35, 0]}>
      <Line points={[[x(0), 0, 0], [x(marks.length - 1), 0, 0]]} color={c.inkMuted} lineWidth={1.4} />
      <Line points={[[x(from), 0, 0.01], [x(to), 0, 0.01]]} color={c.withdraw} lineWidth={4} />
      {marks.map((m, k) => (
        <group key={m} position={[x(k), 0, 0]}>
          <mesh>
            <boxGeometry args={[0.025, 0.14, 0.025]} />
            <meshStandardMaterial color={k >= from && k <= to ? c.withdraw : c.inkMuted} />
          </mesh>
          <Tag position={[0, -0.2, 0]}>{m}</Tag>
        </group>
      ))}
      <Tag position={[0, -0.46, 0]}>{label}</Tag>
    </group>
  )
}
