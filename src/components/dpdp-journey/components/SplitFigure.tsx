// Written for plain React: the React Compiler is off for the explainer, whose
// 3D code mutates per-frame state in place, as React Three Fiber intends.
'use no memo'

import { Datum, Org, Purpose, Route, Stop } from './marks'

/**
 * Chapter 07 drawn flat and upright: one stream below your data comes apart
 * into three, each in its own purpose — the centre runs, analytics (left) is
 * allowed and reaches its vendor, advertising (right) is declined and stops
 * short. A stand-in for the stage when WebGL is unavailable.
 */
export function SplitFigure({ step }: { step: string }) {
  const order = ['one-stream', 'separate', 'necessary', 'optional', 'vendors']
  const k = step === 'all' ? order.length : order.indexOf(step) + 1
  const split = k >= 2
  const centreOn = k >= 3
  const answered = k >= 4
  const vendors = k >= 5

  return (
    <svg className="stand-in" viewBox="0 0 132 196" aria-hidden="true" focusable="false">
      <Datum x={66} y={22} r={12} />
      {split ? (
        <g>
          <Route d="M66 36C66 60 30 60 30 84V160" state={answered ? 'consented' : 'faint'} />
          <Route d="M66 36V160" state={centreOn ? 'travelled' : 'faint'} />
          <Route d="M66 36C66 60 102 60 102 84V160" state={answered ? 'declined' : 'faint'} />
          {[30, 66, 102].map((x) => (
            <Purpose key={x} x={x - 14} y={84} w={28} h={24} arm={6} />
          ))}
          {answered ? <Stop x={102} y={140} vertical={false} /> : null}
        </g>
      ) : (
        <path className="mk-route mk-route--travelled" d="M66 36V160" style={{ strokeWidth: 7 }} />
      )}
      {vendors ? (
        <g>
          <Org x={30} y={174} kind="processor" s={14} />
          <Org x={102} y={174} kind="processor" s={14} />
        </g>
      ) : null}
    </svg>
  )
}
