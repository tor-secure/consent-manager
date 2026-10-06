// Written for plain React: the React Compiler is off for the explainer, whose
// 3D code mutates per-frame state in place, as React Three Fiber intends.
'use no memo'

import { Datum, Org, Principal, Purpose, Record } from './marks'

/**
 * Chapter 15 drawn flat: you at the top, the route down, the lifecycle as a
 * loop of seven points in the data's tone, and — once the view widens — the
 * duties around it inside a dashed boundary. A stand-in for the stage when
 * WebGL is unavailable.
 */
const LOOP: [number, number][] = [
  [86, 56], [66, 76], [66, 98], [40, 114], [92, 132], [66, 150], [44, 118],
]

export function AssemblyFigure({ step }: { step: string }) {
  const beyond = step !== 'lifecycle'
  const d = LOOP.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join('')
  return (
    <svg className="stand-in" viewBox="0 0 132 196" aria-hidden="true" focusable="false">
      {beyond ? <rect className="mk-duties" x={6} y={6} width={120} height={184} /> : null}
      <Principal x={66} y={18} />
      <path className="mk-route mk-route--travelled" d="M66 28V176" />
      {beyond ? <Org x={34} y={42} kind="fiduciary" s={12} /> : null}
      {beyond ? <Purpose x={84} y={160} w={30} h={24} arm={6} /> : null}
      <path d={d} style={{ fill: 'none', stroke: 'var(--c-data)', strokeWidth: 2 }} />
      {LOOP.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={4} style={{ fill: 'var(--plate-bg)', stroke: 'var(--c-data)', strokeWidth: 1.5 }} />
      ))}
      <Record x={40} y={114} />
      <Datum x={66} y={176} r={9} state="withdrawn" />
    </svg>
  )
}
