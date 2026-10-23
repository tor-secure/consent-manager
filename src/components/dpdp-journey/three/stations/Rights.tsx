// Written for plain React: the React Compiler is off for the explainer, whose
// 3D code mutates per-frame state in place, as React Three Fiber intends.
'use no memo'

import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { Edges, Line } from '@react-three/drei'
import type { Group } from 'three'
import type { RightTool as Tool } from '../../content/law'
import { useLaw, useSelected } from '../../state/law'
import { Bead, Board, Fiduciary, Flow, Focus, Part, Person, PurposeFrame, Reveal, Slip, Stop, Tag, useColors } from '../kit'
import { stage } from '../presence'

type Vec3 = [number, number, number]

const YOU: Vec3 = [-1.9, 0, 0]
const ORG: Vec3 = [2.1, -0.1, 0]

const around = (centre: Vec3, r: number, k: number, n: number, start = Math.PI / 2): Vec3 => {
  const a = start - (k / n) * Math.PI * 2
  return [centre[0] + Math.cos(a) * r, centre[1] + Math.sin(a) * r, centre[2]]
}

/**
 * 06 Rights and duties: the same structure from its two ends. Around you, a
 * ring of rights, each a thing you can do. Around the organisation, its ring
 * of duties, with the consent duty one node among them, and below it a dashed
 * bracket of extra duties only some organisations carry.
 * The camera turns to whichever end the reader picks. On a phone, each end
 * is shown on its own (see `Focus`): your end runs up to your data, the
 * fiduciary's end runs from it.
 */
export function Rights() {
  const c = useColors()
  const t = useLaw().scene.rights
  const view = useSelected('rights')
  const tools = t.rights.map((r) => r.tool)
  return (
    <>
      <Focus view="rights" at={YOU}>
        <Reveal order={1}>
          <Part id="you" label="You" position={YOU}>
            <Person />
          </Part>
          <Flow points={[[YOU[0] + 0.4, 0, 0], [-0.33, 0, 0]]} color={c.data} width={1.8} />
        </Reveal>

        <Reveal order={2}>
          <Ring centre={YOU} radius={1.15} labels={t.rights.map((r) => r.label)} live={view === 'rights'} tone={c.data}>
            {(k) => <RightTool tool={tools[k]} />}
          </Ring>
        </Reveal>
        {view !== 'duties' ? <Tag position={[YOU[0], YOU[1] - 0.52, 0]} strong>{t.you}</Tag> : null}
        {t.deadline ? <Deadline {...t.deadline} /> : null}
      </Focus>

      <Focus view="duties" at={ORG}>
        <Reveal order={1}>
          <Flow points={[[0.33, 0, 0], [ORG[0] - 0.4, ORG[1], 0]]} color={c.inkSoft} width={1.8} />
        </Reveal>

        <Reveal order={3}>
          <Part id="fiduciary" label={t.holder} position={ORG}>
            <Fiduciary size={0.55} />
          </Part>
          <Ring centre={ORG} radius={1.22} labels={t.duties} live={view === 'duties'} tone={c.ink}>
            {(k) => <DutyNode k={k} />}
          </Ring>
        </Reveal>

        <Reveal order={4} position={[ORG[0], -1.95, 0]}>
          <Line
            points={[[-1.1, 0.35, 0], [-1.1, -0.35, 0], [1.1, -0.35, 0], [1.1, 0.35, 0], [-1.1, 0.35, 0]]}
            color={c.inkMuted}
            lineWidth={1.4}
            dashed
            dashSize={0.08}
            gapSize={0.07}
          />
          {[-0.6, 0, 0.6].map((x) => (
            <mesh key={x} position={[x, 0, 0]}>
              <octahedronGeometry args={[0.11]} />
              <meshStandardMaterial color={c.inkSoft} />
            </mesh>
          ))}
          {view === 'duties' ? <Tag position={[0, -0.62, 0]}>{t.extra}</Tag> : null}
        </Reveal>
        {view === 'duties' ? <Tag position={[ORG[0], ORG[1] - 0.48, 0]} strong>{t.holder}</Tag> : null}
      </Focus>
    </>
  )
}

/** A ring of nodes round a centre; the live ring flows and lights in turn. */
function Ring({ centre, radius, labels, live, tone, children }: { centre: Vec3; radius: number; labels: string[]; live: boolean; tone: string; children: (k: number) => ReactNode }) {
  const nodes = useRef<(Group | null)[]>([])
  useFrame((state) => {
    nodes.current.forEach((node, k) => {
      if (!node) return
      const wave = live && !stage.still ? Math.max(0, Math.sin(state.clock.elapsedTime * 1.6 - k * 0.9)) : 0
      node.scale.setScalar(1 + wave * 0.28)
    })
  })
  return (
    <>
      {labels.map((label, k) => {
        const p = around(centre, radius, k, labels.length)
        const mid: Vec3 = [centre[0] + (p[0] - centre[0]) * 0.32, centre[1] + (p[1] - centre[1]) * 0.32, 0]
        return (
          <group key={label}>
            <Flow points={[mid, p]} color={tone} width={live ? 1.8 : 1} flowing={live} level={live ? 1 : 0.25} />
            <group position={p} ref={(node) => { nodes.current[k] = node }}>
              <Part id={label} label={label} tagged={live}>
                {children(k)}
              </Part>
            </group>
            {live ? <Tag position={[p[0] + (p[0] - centre[0]) * 0.42, p[1] + (p[1] - centre[1]) * 0.42 + 0.02, 0.1]}>{label}</Tag> : null}
          </group>
        )
      })}
    </>
  )
}

/** Each right drawn as the one thing it lets you do. */
function RightTool({ tool }: { tool: Tool }) {
  const c = useColors()
  switch (tool) {
    case 'access': // A summary comes to you.
      return (
        <group scale={0.3}>
          <Slip rows={3} edge={c.data} />
        </group>
      )
    case 'portability': // A copy, in a form you can take elsewhere.
      return (
        <group scale={0.26}>
          <Slip position={[-0.22, 0.1, -0.05]} rows={3} />
          <Slip position={[0.22, -0.1, 0.05]} rows={3} edge={c.data} />
        </group>
      )
    case 'correction': // An edge completed.
      return (
        <mesh scale={0.26}>
          <boxGeometry />
          <meshStandardMaterial color={c.paperRaised} />
          <Edges color={c.data} />
        </mesh>
      )
    case 'erasure': // A shape fading inside a bracket.
      return (
        <group scale={0.5}>
          <PurposeFrame size={0.7} color={c.inkMuted} />
          <mesh>
            <boxGeometry args={[0.3, 0.3, 0.3]} />
            <meshStandardMaterial color={c.data} transparent opacity={0.3} />
          </mesh>
        </group>
      )
    case 'restriction': // Kept, but held inside a tight bracket.
      return (
        <group scale={0.5}>
          <PurposeFrame size={0.5} />
          <mesh>
            <boxGeometry args={[0.26, 0.26, 0.26]} />
            <meshStandardMaterial color={c.data} />
          </mesh>
        </group>
      )
    case 'objection': // A bar across the line.
      return (
        <group scale={0.7}>
          <Bead color={c.inkSoft} radius={0.08} glow={0} />
          <Stop position={[0, -0.16, 0.05]} />
        </group>
      )
    case 'complaint': // Onward to the authority.
      return (
        <group scale={0.5}>
          <Board />
        </group>
      )
    case 'nomination': // A second person.
      return <Person scale={0.55} tone={c.inkSoft} />
    case 'equal': // The same service either way.
      return (
        <group>
          <group position={[-0.1, 0, 0]}>
            <Bead color={c.data} radius={0.07} glow={0.4} />
          </group>
          <group position={[0.1, 0, 0]}>
            <Bead color={c.data} radius={0.07} glow={0.4} />
          </group>
        </group>
      )
    default: // Withdrawal, or an opt-out: a bead down a short thread.
      return <Bead color={c.withdraw} radius={0.1} />
  }
}

function DutyNode({ k }: { k: number }) {
  const c = useColors()
  if (k === 0) {
    return (
      <group>
        <mesh>
          <torusGeometry args={[0.15, 0.025, 12, 40]} />
          <meshStandardMaterial color={c.grant} emissive={c.grant} emissiveIntensity={0.5} />
        </mesh>
        <Bead color={c.grant} radius={0.06} />
      </group>
    )
  }
  return (
    <mesh>
      <octahedronGeometry args={[0.15]} />
      <meshStandardMaterial color={c.ink} roughness={0.35} metalness={0.1} />
    </mesh>
  )
}

/** Points round a clock face from one fraction of the turn to another. */
const arc = (from: number, to: number) =>
  Array.from({ length: 33 }, (_, i): Vec3 => {
    const a = Math.PI / 2 - (from + ((to - from) * i) / 32) * Math.PI * 2
    return [Math.cos(a) * 0.26, Math.sin(a) * 0.26, 0]
  })

/**
 * How long a request may take: a clock whose solid arc is the time allowed,
 * and whose dashed arc is the extension the law permits on top of it.
 */
function Deadline({ base, extension, label }: { base: number; extension: number; label: string }) {
  const c = useColors()
  const split = base / (base + extension)
  const [solid, dashed] = useMemo(() => [arc(0, split), arc(split, 1)], [split])
  return (
    <Reveal order={3} position={[0.2, -1.0, 0]}>
      <Part id="deadline" label={label}>
        <Line points={solid} color={c.data} lineWidth={4} />
        <Line points={dashed} color={c.inkMuted} lineWidth={2} dashed dashSize={0.05} gapSize={0.05} />
        <mesh>
          <sphereGeometry args={[0.04, 12, 8]} />
          <meshStandardMaterial color={c.ink} />
        </mesh>
        <mesh position={[0, 0.1, 0]}>
          <boxGeometry args={[0.02, 0.2, 0.02]} />
          <meshStandardMaterial color={c.ink} />
        </mesh>
      </Part>
      <Tag position={[0.1, -0.42, 0]}>{label}</Tag>
    </Reveal>
  )
}
