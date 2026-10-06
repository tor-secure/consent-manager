// Written for plain React: the React Compiler is off for the explainer, whose
// 3D code mutates per-frame state in place, as React Three Fiber intends.
'use no memo'

import { Datum, Label, Link, Org, Principal } from './marks'

/**
 * The roles chapter drawn flat and upright, as the stage draws it: you at the
 * top, your data beneath, the fiduciary that takes it, and the processor it is
 * passed on to — with the fiduciary's line still attached. A stand-in for the
 * stage when WebGL is unavailable; `highlight` names the role a moment is
 * introducing, and the rest recede.
 */
export function RolesFigure({ highlight }: { highlight: string }) {
  const on = (id: string) => (highlight === 'all' || highlight === id ? true : undefined)

  return (
    <svg className="stand-in" viewBox="0 0 132 196" aria-hidden="true" focusable="false">
      <g className="stand-in__part" data-on={on('principal')}>
        <Principal x={66} y={16} />
        <Label x={84} y={19} anchor="start">You</Label>
      </g>
      <Link d="M66 26V172" dashed />
      <g className="stand-in__part" data-on={on('fiduciary')}>
        <Org x={30} y={92} kind="fiduciary" />
        <Link d="M38 92H54" />
        <Label x={30} y={78} tone="strong">Fiduciary</Label>
      </g>
      <g className="stand-in__part" data-on={on('processor')}>
        <Link d="M30 100V152H54" />
        <Org x={102} y={152} kind="processor" />
        <Label x={102} y={176}>Processor</Label>
      </g>
      <Datum x={66} y={highlight === 'processor' ? 152 : 92} r={11} />
    </svg>
  )
}
