// Written for plain React: the React Compiler is off for the explainer, whose
// 3D code mutates per-frame state in place, as React Three Fiber intends.
'use no memo'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Edges, Line, RoundedBox } from '@react-three/drei'
import type { SceneText } from '../../content/law'
import { useLaw, useSelected } from '../../state/law'
import { Fiduciary, Flow, Halo, Part, Person, Processor, Reveal, Tag, approach, useBend, useColors } from '../kit'

type Vec3 = [number, number, number]

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
  const t = useLaw().scene.people
  const selected = useSelected('people')
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
        <Part id="principal" label={t.principalHover} choose="principal" position={YOU} tagged>
          <Person />
          <Tag position={[0, -0.62, 0]} strong>{t.principal}</Tag>
        </Part>
      </Reveal>

      <Reveal order={2}>
        <Flow points={decides} color={c.inkSoft} width={2} />
        <Part id="fiduciary" label={t.fiduciary} choose="fiduciary" position={FIDUCIARY} tagged>
          <Fiduciary />
          <Tag position={[0, t.thresholds ? 0.86 : 0.6, 0]} strong>{t.fiduciary}</Tag>
        </Part>
      </Reveal>

      <Reveal order={3}>
        <Flow points={onBehalf} color={c.inkMuted} width={1.6} dashed />
        {/* Responsibility: from the fiduciary down to its processor, and it stays. */}
        <Flow points={[[1.75, 0.38, 0], [1.75, -0.72, 0]]} color={c.ink} width={3} flowing={selected === 'processor'} levelRef={level} />
        <Part id="processor" label={t.processor} choose="processor" position={PROCESSOR} tagged>
          <Processor />
          <Tag position={[0, -0.58, 0]} strong>{t.processor}</Tag>
        </Part>
        <Tag position={[2.45, -0.15, 0]}>{t.responsibility}</Tag>
      </Reveal>

      <Tag position={[0, -0.55, 0]} tone="data">{t.data}</Tag>

      <Extras t={t} selected={selected} />

      <Halo
        selected={selected}
        color={c.data}
        targets={{ principal: YOU, fiduciary: FIDUCIARY, processor: PROCESSOR }}
      />
    </>
  )
}

/**
 * What a law adds to the cast: where it reaches (a boundary round you, which
 * the holder's line crosses), who decides jointly, who counts with you, and
 * what makes an organisation one the law applies to.
 */
function Extras({ t, selected }: { t: SceneText['people']; selected: string | null }) {
  const c = useColors()
  const scopeRadius = t.household ? 0.98 : 0.82
  const ring = useMemo(
    () => Array.from({ length: 73 }, (_, i): Vec3 => {
      const a = (i / 72) * Math.PI * 2
      return [YOU[0] + Math.cos(a) * scopeRadius, YOU[1] - (t.household ? 0.3 : 0.12) + Math.sin(a) * scopeRadius * 0.92, -0.05]
    }),
    [scopeRadius, t.household],
  )
  return (
    <>
      {t.scope ? (
        <Reveal order={1}>
          <Part id="scope" label={t.scope.hover}>
            <Line points={ring} color={c.data} lineWidth={1.3} dashed dashSize={0.09} gapSize={0.07} />
          </Part>
          <Tag position={[YOU[0], YOU[1] + scopeRadius * 0.92 - (t.household ? 0.3 : 0.12) + 0.12, 0]} tone="data">{t.scope.label}</Tag>
        </Reveal>
      ) : null}

      {t.household ? (
        <Reveal order={1}>
          <Part id="household" label={t.household.hover}>
            {[-0.6, 0.6].map((dx) => (
              <group key={dx}>
                <Flow points={[[YOU[0] + dx * 0.45, YOU[1] - 0.25, 0], [YOU[0] + dx, YOU[1] - 0.72, 0]]} color={c.inkMuted} width={1.2} />
                <Person position={[YOU[0] + dx, YOU[1] - 0.86, 0]} scale={0.36} tone={c.inkSoft} />
              </group>
            ))}
          </Part>
          {selected === 'principal' ? <Tag position={[YOU[0], YOU[1] - 1.0, 0]}>{t.household.label}</Tag> : null}
        </Reveal>
      ) : null}

      {t.joint ? (
        <Reveal order={2}>
          {/* A second controller beside the first: joint controllers, one arrangement between them. */}
          <Part id="joint" label={t.joint.hover} position={[FIDUCIARY[0] + 0.72, FIDUCIARY[1] + 0.05, -0.55]}>
            <RoundedBox args={[0.46, 0.46, 0.46]} radius={0.05} smoothness={3}>
              <meshStandardMaterial color={c.inkSoft} transparent opacity={0.55} roughness={0.4} depthWrite={false} />
              <Edges color={c.ink} />
            </RoundedBox>
          </Part>
          <Flow points={[[FIDUCIARY[0] + 0.3, FIDUCIARY[1], -0.1], [FIDUCIARY[0] + 0.5, FIDUCIARY[1] + 0.03, -0.4]]} color={c.ink} width={2.4} />
          {selected === 'fiduciary' ? <Tag position={[FIDUCIARY[0] + 0.25, FIDUCIARY[1] + 0.95, 0]}>{t.joint.label}</Tag> : null}
        </Reveal>
      ) : null}

      {t.thresholds ? (
        <Reveal order={2}>
          {/* Three thresholds on top of the block; meeting any one is enough. */}
          {t.thresholds.items.map((item, k) => (
            <Part key={item} id={`threshold-${k}`} label={item} position={[FIDUCIARY[0] - 0.2 + k * 0.2, FIDUCIARY[1] + 0.31 + (0.14 + k * 0.08) / 2, 0.12]}>
              <mesh>
                <boxGeometry args={[0.12, 0.14 + k * 0.08, 0.12]} />
                <meshStandardMaterial
                  color={k === 1 ? c.data : c.paperRaised}
                  emissive={k === 1 ? c.data : c.paperRaised}
                  emissiveIntensity={k === 1 ? 0.6 : 0.3}
                  roughness={0.5}
                />
                <Edges color={c.ink} />
              </mesh>
            </Part>
          ))}
          {selected === 'fiduciary' ? <Tag position={[FIDUCIARY[0], FIDUCIARY[1] + 1.2, 0]}>{t.thresholds.label}</Tag> : null}
        </Reveal>
      ) : null}
    </>
  )
}
