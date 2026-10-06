// Written for plain React: the React Compiler is off for the explainer, whose
// 3D code mutates per-frame state in place, as React Three Fiber intends.
'use no memo'

import { Datum, Principal, Stop } from './marks'

/**
 * Chapter 13 drawn flat: a double wall around the data; a guardian above,
 * their thread through a single check into the room; reaches from outside
 * stopped at the wall. A stand-in for the stage when WebGL is unavailable.
 */
export function ChildrenFigure({ step }: { step: string }) {
  const order = ['child', 'guardian', 'restricted', 'prescribed']
  const k = step === 'all' ? order.length : order.indexOf(step) + 1
  const guardian = k >= 2
  const restricted = k >= 3
  const prescribed = k >= 4

  return (
    <svg className="stand-in" viewBox="0 0 132 196" aria-hidden="true" focusable="false">
      <rect className="mk-sheet" x={34} y={96} width={64} height={64} style={{ stroke: 'var(--ink)', strokeWidth: 2 }} />
      <rect className="mk-duties" x={39} y={101} width={54} height={54} style={{ strokeDasharray: 'none', stroke: 'var(--ink)' }} />
      <Datum x={66} y={128} r={12} />
      {guardian ? (
        <g>
          <Principal x={30} y={28} />
          <path className="mk-route mk-route--travelled" d="M34 36L56 96" />
          <ellipse
            cx={45}
            cy={66}
            rx={9}
            ry={9}
            style={{ fill: 'none', stroke: prescribed ? 'var(--ink)' : 'var(--c-grant)', strokeWidth: prescribed ? 2.5 : 1.75 }}
          />
          <path className="mk-route mk-route--consented" d="M50 96H62" />
        </g>
      ) : null}
      {prescribed ? <rect className="mk-sheet" x={8} y={56} width={14} height={18} style={{ stroke: 'var(--ink)' }} /> : null}
      {restricted
        ? [110, 122, 134, 146].map((y) => (
            <g key={y}>
              <path className="mk-link mk-link--dashed" d={`M126 ${y}H104`} />
              <Stop x={102} y={y} />
            </g>
          ))
        : null}
    </svg>
  )
}
