// Written for plain React: the React Compiler is off for the explainer, whose
// 3D code mutates per-frame state in place, as React Three Fiber intends.
'use no memo'

import { Datum, Principal, Route, Stop } from './marks'

/**
 * Chapter 06 drawn flat and upright: you at the top, the thread down to your
 * data, three checkpoints on it, and one would-be consent at a time — stopped
 * at the checkpoint it fails, or, for a real yes, through all three and into
 * the data. A stand-in for the stage when WebGL is unavailable.
 */
const CHECKS = [70, 104, 138]
const STOPS: Record<string, number> = { silence: 0, uninformed: 1, bundled: 2 }

export function ConsentFigure({ step }: { step: string }) {
  const given = step === 'given' || step === 'all'
  const stopAt = STOPS[step]
  const failing = stopAt !== undefined

  return (
    <svg className="stand-in" viewBox="0 0 132 196" aria-hidden="true" focusable="false">
      <Principal x={66} y={16} />
      <Route d="M66 26V160" state={given ? 'consented' : 'travelled'} />
      {CHECKS.map((y, i) => (
        <ellipse
          key={y}
          className={`stand-in__check${given ? ' is-pass' : failing && i === stopAt ? ' is-fail' : ''}`}
          cx={66}
          cy={y}
          rx={20}
          ry={6}
        />
      ))}
      {failing ? (
        <g>
          <circle
            className={`stand-in__bead stand-in__bead--${step}`}
            cx={66}
            cy={CHECKS[stopAt] - 16}
            r={7}
          />
          {step === 'bundled' ? (
            <g>
              <path className="mk-link mk-link--dashed" d={`M73 ${CHECKS[stopAt] - 16}H92`} />
              <rect className="mk-org mk-org--processor" x={92} y={CHECKS[stopAt] - 23} width={14} height={14} />
            </g>
          ) : null}
          <Stop x={66} y={CHECKS[stopAt] - 6} vertical={false} />
        </g>
      ) : null}
      <Datum x={66} y={172} r={13} state={given ? 'consented' : 'raw'} />
    </svg>
  )
}
