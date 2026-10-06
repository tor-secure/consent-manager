// Written for plain React: the React Compiler is off for the explainer, whose
// 3D code mutates per-frame state in place, as React Three Fiber intends.
'use no memo'

import { useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { Edges, Line } from '@react-three/drei'
import type { Group } from 'three'
import { useChoices } from '../../state/journey'
import { Bead, Board, Fiduciary, Flow, Focus, Part, Person, PurposeFrame, Reveal, Slip, Tag, useColors } from '../kit'
import { stage } from '../presence'

type Vec3 = [number, number, number]

const YOU: Vec3 = [-1.9, 0, 0]
const ORG: Vec3 = [2.1, -0.1, 0]

const RIGHTS = ['Access', 'Correction', 'Erasure', 'Grievance', 'Nomination', 'Withdrawal']
const DUTIES = ['Consent handling', 'Lawful processing', 'Security', 'Accuracy', 'Rights & grievances', 'Processor contracts', 'Retention & deletion']

const around = (centre: Vec3, r: number, k: number, n: number, start = Math.PI / 2): Vec3 => {
  const a = start - (k / n) * Math.PI * 2
  return [centre[0] + Math.cos(a) * r, centre[1] + Math.sin(a) * r, centre[2]]
}

/**
 * 06 Rights and duties: the same structure from its two ends. Around you, a
 * ring of six rights, each a thing you can do. Around the fiduciary, its ring
 * of duties, with consent handling one node of seven, and below it a dashed
 * bracket of extra duties only for designated Significant Data Fiduciaries.
 * The camera turns to whichever end the reader picks. On a phone, each end
 * is shown on its own (see `Focus`): your end runs up to your data, the
 * fiduciary's end runs from it.
 */
export function Rights() {
  const c = useColors()
  const view = useChoices((s) => s.selection.rights)
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
          <Ring centre={YOU} radius={1.15} labels={RIGHTS} live={view === 'rights'} tone={c.data}>
            {(k) => <RightTool k={k} />}
          </Ring>
        </Reveal>
        {view !== 'duties' ? <Tag position={[YOU[0], YOU[1] - 0.52, 0]} strong>You</Tag> : null}
      </Focus>

      <Focus view="duties" at={ORG}>
        <Reveal order={1}>
          <Flow points={[[0.33, 0, 0], [ORG[0] - 0.4, ORG[1], 0]]} color={c.inkSoft} width={1.8} />
        </Reveal>

        <Reveal order={3}>
          <Part id="fiduciary" label="Data Fiduciary" position={ORG}>
            <Fiduciary size={0.55} />
          </Part>
          <Ring centre={ORG} radius={1.22} labels={DUTIES} live={view === 'duties'} tone={c.ink}>
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
          {view === 'duties' ? <Tag position={[0, -0.62, 0]}>Significant Data Fiduciaries only</Tag> : null}
        </Reveal>
        {view === 'duties' ? <Tag position={[ORG[0], ORG[1] - 0.48, 0]} strong>Data Fiduciary</Tag> : null}
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
function RightTool({ k }: { k: number }) {
  const c = useColors()
  switch (k) {
    case 0: // Access: a summary comes to you.
      return (
        <group scale={0.3}>
          <Slip rows={3} edge={c.data} />
        </group>
      )
    case 1: // Correction: an edge completed.
      return (
        <mesh scale={0.26}>
          <boxGeometry />
          <meshStandardMaterial color={c.paperRaised} />
          <Edges color={c.data} />
        </mesh>
      )
    case 2: // Erasure: a shape fading inside a bracket.
      return (
        <group scale={0.5}>
          <PurposeFrame size={0.7} color={c.inkMuted} />
          <mesh>
            <boxGeometry args={[0.3, 0.3, 0.3]} />
            <meshStandardMaterial color={c.data} transparent opacity={0.3} />
          </mesh>
        </group>
      )
    case 3: // Grievance: onward to the Board.
      return (
        <group scale={0.5}>
          <Board />
        </group>
      )
    case 4: // Nomination: a second person.
      return <Person scale={0.55} tone={c.inkSoft} />
    default: // Withdrawal: a bead down a short thread.
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
