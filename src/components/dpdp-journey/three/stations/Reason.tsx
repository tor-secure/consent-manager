// Written for plain React: the React Compiler is off for the explainer, whose
// 3D code mutates per-frame state in place, as React Three Fiber intends.
'use no memo'

import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import type { SceneText } from '../../content/law'
import { useNarrow } from '../../hooks/useNarrow'
import { useChoices } from '../../state/journey'
import { useLaw, useSelected } from '../../state/law'
import { clamp01 } from '../../utils/math'
import { Bead, Checkpoint, Fiduciary, Flow, Part, PurposeFrame, Reveal, Slip, Stop, Tag, approach, bend, useBend, useColors, useStation } from '../kit'
import { reveal, stage } from '../presence'

type Vec3 = [number, number, number]

const TOP: Vec3 = [0, -0.38, 0]
const BOTTOM: Vec3 = [0, -2.2, 0]
/** The other bases fan out on the right; the last, legitimate interests, bends furthest. */
const FAN: Vec3[] = [
  [0.75, -1.6, 0.15],
  [1.0, -1.5, 0.15],
  [1.25, -1.4, 0.15],
  [1.5, -1.3, 0.15],
  [1.75, -1.15, 0.15],
]
/** The refused swap: from the consent route across to legitimate interests. */
const JUMP = bend([-0.945, -1.04, 0.05], [0, -0.45, 0.1], [0.945, -1.04, 0.05], 32)

/**
 * 02 Reason. Around the data, the purpose closes in until it fits; below it,
 * the ways processing may come about, as the law draws them:
 *
 * - a bar across the data's way down (holding it is not a reason), with two
 *   ways round it (in the DPDP Act, consent and a legitimate use it lists)
 *   and a straight shortcut past the law's grounds refused at the bar;
 * - `bases`: the same bar with one way round for consent and one per other
 *   lawful basis, and the refused route a jump from consent, once refused or
 *   withdrawn, across to legitimate interests;
 * - `notice`: no bar, because no grounds are listed. A notice at collection
 *   sets the purposes, a wider frame holds the compatible ones, and anything
 *   outside both meets a closed gate: consent first.
 */
export function Reason() {
  const c = useColors()
  const { index } = useStation()
  const t = useLaw().scene.reason
  const kind = t.kind ?? 'bar'
  const selected = useSelected('reason')
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
    approach(consent, selected === 'consent' ? 1 : selected === 'shortcut' && kind === 'bases' ? 0.35 : 0.15, dt)
    approach(legit, selected === 'legitimate' ? 1 : 0.15, dt)
    approach(shortcut, selected === 'shortcut' ? 1 : 0.1, dt)
    approach(refused, selected === 'shortcut' ? 1 : 0, dt, 8)
    fit.current = reveal(index, 5)

    // The refused bead runs at what stops it and is thrown back.
    const b = bead.current
    if (!b) return
    const s = stage.elapsed - shotAt.current
    const live = selected === 'shortcut' && s < 1.6 && !stage.still
    b.visible = live
    if (!live) return
    const go = clamp01(s / 0.55)
    const back = clamp01((s - 0.55) / 0.6)
    if (kind === 'bases') {
      // Along the jump to its middle, where the swap is stopped.
      const i = Math.round((go * go * 0.5 - back * 0.25) * (JUMP.length - 1))
      const p = JUMP[Math.max(0, i)]
      b.position.set(p[0], p[1], p[2])
    } else {
      const stopAt = kind === 'notice' ? -0.66 : -0.6
      b.position.set(0, -0.4 + stopAt * go * go + 0.45 * Math.sin(back * Math.PI * 0.5), 0)
    }
    b.scale.setScalar(1 - back)
  })

  const left = useBend([-0.15, -0.38, 0], [-1.75, -1.15, 0.15], [-0.32, -2.2, 0])
  const right = useBend([0.15, -0.38, 0], [1.75, -1.15, 0.15], [0.32, -2.2, 0])

  return (
    <>
      <PurposeFrame size={1.05} fitRef={fit} />
      <Tag position={[0.78, 0.5, 0]} tone="purpose">{t.purpose}</Tag>

      {kind === 'notice' && t.notice ? <Notice t={t} /> : (
        <Reveal order={1} position={[0, -1.15, 0]}>
          <Part id="bar" label={t.bar}>
            <mesh>
              <boxGeometry args={[1.3, 0.13, 0.13]} />
              <meshStandardMaterial color={c.ink} roughness={0.35} />
            </mesh>
          </Part>
          {kind === 'bar' ? <Stop position={[0, 0.16, 0.1]} visibleRef={refused} /> : null}
        </Reveal>
      )}

      <Reveal order={2}>
        <Part id="consent" label={t.consent} choose="consent" tagged>
          <Flow points={left} color={c.grant} width={4} flowing={selected === 'consent'} levelRef={consent} />
        </Part>
        <Tag position={[-1.55, -1.05, 0]} tone="grant" strong>{t.consent}</Tag>
      </Reveal>

      <Reveal order={3}>
        {kind === 'bases' && t.others ? (
          <Bases others={t.others} label={t.legitimate} selected={selected} level={legit} />
        ) : (
          <>
            <Part id="legitimate" label={t.legitimate} choose="legitimate" tagged>
              <Flow points={right} color={c.ink} width={4} flowing={selected === 'legitimate'} levelRef={legit} />
            </Part>
            <Tag position={[1.55, -1.05, 0]} strong>{t.legitimate}</Tag>
          </>
        )}
      </Reveal>

      <Reveal order={4}>
        {kind === 'bases' ? (
          <>
            <Part id="shortcut" label={t.shortcutHover} choose="shortcut" tagged>
              <Flow points={JUMP} color={c.withdraw} width={3} dashed levelRef={shortcut} />
            </Part>
            {/* Consent refused or withdrawn: its route is cut, and the swap is stopped halfway. */}
            <Stop position={[-0.99, -1.31, 0.1]} visibleRef={refused} />
            <Stop position={[0, -0.75, 0.12]} rotation={Math.PI / 2} visibleRef={refused} />
            <Tag position={[0, -1.52, 0]} tone="refuse">{t.shortcut}</Tag>
          </>
        ) : (
          <>
            <Part id="shortcut" label={t.shortcutHover} choose="shortcut" tagged>
              <Flow points={[[0, -0.4, 0], [0, kind === 'notice' ? -1.08 : -1.02, 0]]} color={c.withdraw} width={3} dashed levelRef={shortcut} />
            </Part>
            <Tag position={kind === 'notice' ? [0, -0.72, 0] : [0, -1.55, 0]} tone="refuse">{t.shortcut}</Tag>
          </>
        )}
        <group ref={bead} position={[0, -0.4, 0]} visible={false}>
          <Bead color={c.withdraw} />
        </group>
        {kind === 'notice' ? <Stop position={[0, -1.02, 0.1]} visibleRef={refused} /> : null}
      </Reveal>

      <Reveal order={5} position={[0, -2.5, 0]}>
        <Fiduciary size={0.5} />
        <Tag position={[0, -0.48, 0]}>{t.processing}</Tag>
      </Reveal>
    </>
  )
}

/**
 * One way round the bar per other lawful basis; named when that route is
 * picked. A phone's stage has no room for the column of names, which the card
 * lists anyway, so there the routes keep their one label.
 */
function Bases({ others, label, selected, level }: { others: string[]; label: string; selected: string | null; level: { current: number } }) {
  const c = useColors()
  const narrow = useNarrow()
  const routes = FAN.slice(-others.length).map((mid) => bend([0.15, TOP[1], 0], mid, [0.32, BOTTOM[1], 0]))
  const picked = selected === 'legitimate'
  return (
    <>
      <Part id="legitimate" label={label} choose="legitimate" tagged>
        {routes.map((points, k) => (
          <Flow key={others[k]} points={points} color={c.ink} width={2.2} flowing={picked} levelRef={level} />
        ))}
      </Part>
      {picked && !narrow ? (
        others.map((name, k) => (
          <Tag key={name} position={[2.0, -0.45 - k * 0.3, 0]}>{name}</Tag>
        ))
      ) : (
        <Tag position={[1.6, -1.05, 0]} strong>{label}</Tag>
      )}
    </>
  )
}

/**
 * No grounds to list, so no bar: the notice at collection says what the data
 * is for. The fitted frame is the disclosed purpose; a wider one holds what is
 * compatible with it; outside both, a closed gate.
 */
function Notice({ t }: { t: SceneText['reason'] }) {
  const c = useColors()
  const n = t.notice!
  const told = useBend([-1.35, 0.3, 0], [-0.8, 0.45, 0.1], [-0.4, 0.15, 0])
  return (
    <>
      <Reveal order={1} position={[-1.8, 0.35, -0.1]}>
        <group rotation={[0, 0.3, 0]}>
          <Part id="notice" label={n.slipHover}>
            <group scale={0.55}>
              <Slip rows={4} edge={c.data} />
            </group>
          </Part>
          <Tag position={[0, 0.5, 0]} strong>{n.slip}</Tag>
        </group>
      </Reveal>
      <Reveal order={1}>
        <Flow points={told} color={c.data} width={1.4} dashed />
        {/* The wider frame: purposes compatible with why it was collected. */}
        <PurposeFrame size={1.75} color={c.inkMuted} />
        <Tag position={[1.2, 0.98, 0]}>{n.compatible}</Tag>
        <Part id="gate" label={n.gateHover} position={[0, -1.3, 0]}>
          <Checkpoint color={c.inkMuted} radius={0.22} />
        </Part>
        <Tag position={[0, -1.68, 0]}>{n.gate}</Tag>
      </Reveal>
    </>
  )
}
