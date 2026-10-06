// Written for plain React: the React Compiler is off for the explainer, whose
// 3D code mutates per-frame state in place, as React Three Fiber intends.
'use no memo'

import type { Beat } from '../content/types'
import { Datum, Label, Link, Org, Principal } from './marks'

/**
 * The opening picture drawn flat: you, your data on its thread, and the
 * system below. It is the static counterpart of the 3D stage's opening, shown
 * in its place when WebGL is unavailable, so a reader without the 3D layer
 * meets the same cast in the same order.
 *
 * `highlight` names the part a beat is introducing; the rest recede. It is
 * `aria-hidden` because each beat already says the same thing in text.
 */
export function PrologueFigure({ highlight }: { highlight: Beat['id'] | 'all' }) {
  const on = (part: Beat['id']) => (highlight === 'all' || highlight === part ? true : undefined)

  return (
    <svg className="stand-in" viewBox="0 0 132 176" aria-hidden="true" focusable="false">
      <g className="stand-in__part" data-on={on('you')}>
        <Principal x={44} y={22} />
        <Label x={62} y={25} anchor="start">You</Label>
      </g>
      <g className="stand-in__part" data-on={on('data')}>
        <Link d="M44 32V60" dashed />
        <Datum x={44} y={74} r={13} />
        <Label x={64} y={77} anchor="start" tone="strong">Your data</Label>
      </g>
      <g className="stand-in__part" data-on={on('system')}>
        <Link d="M44 88V124" dashed />
        <Link d="M30 140H86" />
        <Org x={30} y={140} kind="fiduciary" />
        <Org x={86} y={140} kind="processor" />
        <Label x={58} y={168} tone="strong">The system</Label>
      </g>
    </svg>
  )
}
