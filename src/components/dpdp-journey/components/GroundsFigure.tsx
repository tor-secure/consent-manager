// Written for plain React: the React Compiler is off for the explainer, whose
// 3D code mutates per-frame state in place, as React Three Fiber intends.
'use no memo'

import { Datum, Link, Route, Stop } from './marks'

/**
 * Chapter 03 drawn flat and upright, as the stage draws it: the data stopped at
 * a bar, consent around one side, a legitimate use around the other, a
 * relabelled shortcut refused. A stand-in for the stage when WebGL is
 * unavailable; `step` is the moment being shown.
 */
export function GroundsFigure({ step }: { step: string }) {
  const all = step === 'all'
  const lit = (id: string) => (all || step === id ? true : undefined)
  const travelled = step === 'per-purpose'

  return (
    <svg className="stand-in" viewBox="0 0 132 196" aria-hidden="true" focusable="false">
      <g className="stand-in__part" data-on={lit('held') ?? (travelled || undefined)}>
        <Route d="M66 20V60" state="travelled" />
        <path className="mk-stop" d="M50 70H82" />
      </g>
      <g className="stand-in__part" data-on={lit('consent') ?? (travelled || undefined)}>
        <Route d="M66 60C30 70 30 130 66 150" state={travelled ? 'travelled' : 'consented'} />
      </g>
      <g className="stand-in__part" data-on={lit('legitimate') ?? lit('per-purpose')}>
        <Route d="M66 60C102 70 102 130 66 150" state={step === 'legitimate' ? 'travelled' : 'faint'} />
      </g>
      <g className="stand-in__part" data-on={lit('legitimate')}>
        <Link d="M124 104H104" dashed />
        <Stop x={102} y={104} />
      </g>
      <Route d="M66 150V184" state="faint" />
      <Datum x={66} y={travelled ? 166 : 40} r={11} />
    </svg>
  )
}
