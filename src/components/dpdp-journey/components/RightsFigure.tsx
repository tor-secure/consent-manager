// Written for plain React: the React Compiler is off for the explainer, whose
// 3D code mutates per-frame state in place, as React Three Fiber intends.
'use no memo'

import { Principal } from './marks'

/**
 * Chapter 11 drawn flat: you at the centre, six tools around you in a ring,
 * the one being named drawn closer and darker. A stand-in for the stage when
 * WebGL is unavailable; the card beside it names the right in words.
 */
const RING = ['access', 'correction', 'erasure', 'grievance', 'nomination', 'withdraw']
const ANGLES = [120, 60, 0, 300, 240, 180]

export function RightsFigure({ step }: { step: string }) {
  return (
    <svg className="stand-in" viewBox="0 0 132 196" aria-hidden="true" focusable="false">
      {RING.map((id, i) => {
        const on = step === 'all' || step === id
        const a = (ANGLES[i] * Math.PI) / 180
        const r = on && step !== 'all' ? 34 : 46
        const x = 66 + Math.cos(a) * r
        const y = 98 - Math.sin(a) * r * 1.12
        return (
          <g key={id} className="stand-in__part" data-on={on || undefined}>
            <path className="mk-link" d={`M66 98L${x} ${y}`} />
            <circle className="mk-endpoint" cx={x} cy={y} r={on && step !== 'all' ? 11 : 8} />
          </g>
        )
      })}
      <Principal x={66} y={98} />
    </svg>
  )
}
