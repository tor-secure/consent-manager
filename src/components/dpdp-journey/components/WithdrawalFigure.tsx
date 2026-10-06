// Written for plain React: the React Compiler is off for the explainer, whose
// 3D code mutates per-frame state in place, as React Three Fiber intends.
'use no memo'

import { Datum, Org, Principal, Route, Stop } from './marks'

/**
 * Chapter 10 drawn flat and upright: the withdrawal coming down the thread,
 * the data drained in place, the stream that relied on consent stopped and its
 * vendor dark, the centre stream running on, the record updated on top of the
 * old one. A stand-in for the stage when WebGL is unavailable.
 */
export function WithdrawalFigure({ step }: { step: string }) {
  const order = ['change', 'stop', 'record', 'systems', 'past', 'erasure']
  const k = step === 'all' ? order.length : order.indexOf(step) + 1
  const drained = k >= 1
  const stopped = k >= 2
  const recorded = k >= 3

  return (
    <svg className="stand-in" viewBox="0 0 132 196" aria-hidden="true" focusable="false">
      <Principal x={66} y={14} />
      <Route d="M66 24V120" state="travelled" />
      {k === 1 ? <circle cx={66} cy={70} r={6} style={{ fill: 'var(--c-withdraw)' }} /> : null}
      <Route d="M66 120C66 140 30 140 30 160V176" state={stopped ? 'faint' : 'consented'} />
      {stopped ? <Stop x={30} y={156} vertical={false} /> : null}
      <Route d="M66 120V184" state="travelled" />
      <Org x={30} y={184} kind="processor" s={12} />
      <rect className="mk-sheet" x={92} y={40} width={22} height={28} />
      {recorded ? <rect className="mk-sheet" x={97} y={45} width={22} height={28} style={{ stroke: 'var(--c-withdraw)' }} /> : null}
      <Datum x={66} y={120} r={13} state={drained ? 'withdrawn' : 'consented'} />
    </svg>
  )
}
