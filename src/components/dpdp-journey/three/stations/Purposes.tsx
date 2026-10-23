// Written for plain React: the React Compiler is off for the explainer, whose
// 3D code mutates per-frame state in place, as React Three Fiber intends.
'use no memo'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Edges, RoundedBox } from '@react-three/drei'
import type { Mesh } from 'three'
import type { SceneText } from '../../content/law'
import { useChoices } from '../../state/journey'
import { useLaw, usePurpose, usePurposes } from '../../state/law'
import { Checkpoint, Flow, Part, Processor, PurposeFrame, Reveal, Stop, Tag, approach, useBend, useColors } from '../kit'
import { stage } from '../presence'

type Vec3 = [number, number, number]

const SIDES = [-1.75, 1.75]
const GATE_Y = -1.3
const VENDOR_Y = -2.35

/**
 * 04 Purposes. One stream comes apart into three, each inside its own
 * purpose. What your choice allows runs on to its vendor; what you declined
 * stays drawn and open but stops short, its vendor dark. Clicking a stream
 * answers that purpose, exactly as the switch in the card does.
 */
export function Purposes() {
  const law = useLaw()
  const { control } = law.stations[3]
  const extras = law.scene.purposes
  // What cannot be switched off runs down the middle; the optional purposes
  // run either side of it, in the order the card lists them.
  const locked = new Set(control.locked?.map((l) => l.id))
  const optional = control.options.filter((o) => !locked.has(o.id))
  const streams = [
    ...control.options.filter((o) => locked.has(o.id)).map((o) => ({ ...o, x: 0, base: true })),
    ...optional.slice(0, SIDES.length).map((o, i) => ({ ...o, x: SIDES[i], base: false })),
  ].sort((a, b) => a.x - b.x)
  return (
    <>
      <Reveal order={1}>
        <SharedStem />
      </Reveal>
      {streams.map((s, i) => (
        <Reveal key={s.id} order={2 + i}>
          <Stream id={s.id} label={s.label} vendor={s.vendor ?? ''} x={s.x} base={s.base} />
        </Reveal>
      ))}
      {extras?.choice ? <Choice t={extras.choice} /> : null}
      {extras?.optOut ? <OptOut t={extras.optOut} /> : null}
    </>
  )
}

function SharedStem() {
  const c = useColors()
  return <Flow points={[[0, -0.33, 0], [0, -0.62, 0]]} color={c.inkSoft} width={3} />
}

function Stream({ id, label, vendor, x, base }: { id: string; label: string; vendor: string; x: number; base: boolean }) {
  const c = useColors()
  const on = usePurpose(id)
  const level = useRef(on ? 1 : 0)
  const stop = useRef(on ? 0 : 1)
  useFrame((_, dt) => {
    approach(level, on ? 1 : 0, dt)
    approach(stop, on ? 0 : 1, dt, 9)
  })
  const tone = base ? c.ink : c.grant
  const to = useBend([0, -0.62, 0], [x, -0.75, 0.1], [x, GATE_Y + 0.27, 0])
  const onward: Vec3[] = [[x, GATE_Y - 0.27, 0], [x, VENDOR_Y + 0.3, 0]]

  return (
    <Part id={id} label={label} choose={id} tagged>
      <Flow points={to} color={on ? tone : c.inkMuted} width={on ? 3.2 : 2} flowing={on} dashed={!on} levelRef={level} />
      <group position={[x, GATE_Y, 0]}>
        <PurposeFrame size={0.78} />
        <Checkpoint color={on ? tone : c.inkMuted} radius={0.24} />
        <Tag position={[0, 0.58, 0]} strong tone={on && !base ? 'grant' : undefined}>
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

/** A button-like slab; the pair beside the data are drawn the same size. */
function Slab({ position, label, hover, tone, onPick, id }: { position: Vec3; label: string; hover: string; tone: string; onPick: () => void; id: string }) {
  const c = useColors()
  return (
    <group position={position}>
      <Part id={id} label={hover} onPick={onPick} tagged>
        <RoundedBox args={[1.0, 0.32, 0.08]} radius={0.04} smoothness={2}>
          <meshStandardMaterial color={c.paperRaised} emissive={c.paperRaised} emissiveIntensity={0.4} roughness={0.6} />
          <Edges color={tone} />
        </RoundedBox>
      </Part>
      <Tag position={[0, 0, 0.1]} strong>{label}</Tag>
    </group>
  )
}

/**
 * Accept all and reject all, side by side and the same size: saying no takes
 * no more than saying yes. Each sets every optional purpose at once.
 */
function Choice({ t }: { t: NonNullable<NonNullable<SceneText['purposes']>['choice']> }) {
  const c = useColors()
  const setPurposes = useChoices((s) => s.setPurposes)
  return (
    <Reveal order={5}>
      <Slab id="accept-all" position={[-1.45, 0.2, 0]} label={t.accept} hover={t.accept} tone={c.grant} onPick={() => setPurposes(true)} />
      <Slab id="reject-all" position={[1.45, 0.2, 0]} label={t.reject} hover={t.reject} tone={c.ink} onPick={() => setPurposes(false)} />
      <Tag position={[0, 0.72, 0]}>{t.note}</Tag>
    </Reveal>
  )
}

/**
 * Two ways to opt out of selling and sharing at once: the link on the page,
 * and a signal the browser sends by itself (Global Privacy Control), drawn as
 * a window sending out rings. Either switches both streams off.
 */
function OptOut({ t }: { t: NonNullable<NonNullable<SceneText['purposes']>['optOut']> }) {
  const c = useColors()
  const setPurposes = useChoices((s) => s.setPurposes)
  const purposes = usePurposes()
  const { control } = useLaw().stations[3]
  const locked = new Set(control.locked?.map((l) => l.id))
  const optedOut = control.options.some((o) => !locked.has(o.id) && !purposes[o.id])
  const rings = useRef<(Mesh | null)[]>([])
  useFrame(() => {
    rings.current.forEach((ring, k) => {
      if (!ring) return
      const phase = stage.still ? 0.5 : ((stage.elapsed * 0.7 + k / 3) % 1)
      ring.scale.setScalar(0.4 + phase * 1.1)
      const m = ring.material as { opacity: number }
      m.opacity = (optedOut ? 0.9 : 0.35) * (1 - phase)
    })
  })
  return (
    <Reveal order={5}>
      <group position={[-1.5, 0.2, 0]}>
        <Part id="signal" label={t.signalHover} onPick={() => setPurposes(false)} tagged>
          {/* A browser window: frame, and its bar along the top. */}
          <RoundedBox args={[0.62, 0.44, 0.06]} radius={0.03} smoothness={2}>
            <meshStandardMaterial color={c.paperRaised} emissive={c.paperRaised} emissiveIntensity={0.4} />
            <Edges color={c.ink} />
          </RoundedBox>
          <mesh position={[0, 0.16, 0.04]}>
            <boxGeometry args={[0.6, 0.07, 0.01]} />
            <meshBasicMaterial color={c.ink} />
          </mesh>
          {[0, 1, 2].map((k) => (
            <mesh key={k} ref={(node) => { rings.current[k] = node }} position={[0.05, -0.04, 0.05]}>
              <torusGeometry args={[0.16, 0.012, 8, 48]} />
              <meshBasicMaterial color={c.withdraw} transparent opacity={0.5} toneMapped={false} />
            </mesh>
          ))}
        </Part>
        <Tag position={[0, 0.42, 0]} strong>{t.signal}</Tag>
      </group>
      <Slab id="link" position={[1.45, 0.2, 0]} label={t.link} hover={t.linkHover} tone={c.withdraw} onPick={() => setPurposes(false)} />
    </Reveal>
  )
}
