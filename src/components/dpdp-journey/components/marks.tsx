// Written for plain React: the React Compiler is off for the explainer, whose
// 3D code mutates per-frame state in place, as React Three Fiber intends.
'use no memo'

import type { ReactNode } from 'react'

/**
 * The visual vocabulary as SVG primitives.
 *
 * Every illustration on the page is composed from these, and every one of them
 * names a concept from `src/content/vocabulary.ts`. They carry no colour of
 * their own: the `.mk-*` classes in `app.css` map each to a token, so both
 * colour schemes come from one place.
 *
 * The rule the vocabulary follows: colour belongs to the data and its states.
 * People and organisations are drawn in ink. That keeps the eye on the one
 * thing being followed.
 *
 * Coordinates are in the plate's user units (see `Plate.tsx`).
 */

interface At {
  x: number
  y: number
}

/** You — a point with a ring, the origin everything else is measured from. */
export function Principal({ x, y }: At) {
  return (
    <g className="mk-principal">
      <circle className="mk-principal__ring" cx={x} cy={y} r={9} />
      <circle className="mk-principal__core" cx={x} cy={y} r={3.5} />
    </g>
  )
}

export type DatumState = 'raw' | 'consented' | 'withdrawn'

/** Flat-top hexagon: the 2D projection of the data solid on the 3D stage. */
function hexagon(x: number, y: number, r: number) {
  const points: string[] = []
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i
    points.push(`${(x + r * Math.cos(a)).toFixed(2)},${(y + r * Math.sin(a)).toFixed(2)}`)
  }
  return points.join(' ')
}

/**
 * Your data — the one coloured solid. Consent and withdrawal are states of this
 * same mark, never a second object.
 */
export function Datum({ x, y, r = 12, state = 'raw' }: At & { r?: number; state?: DatumState }) {
  return (
    <polygon className={`mk-datum mk-datum--${state}`} points={hexagon(x, y, r)} />
  )
}

/**
 * An organisation. The fiduciary is solid — it decides. A processor is the
 * same square, dashed and hollow — it acts on someone else's instruction.
 */
export function Org({
  x,
  y,
  kind,
  s = 16,
}: At & { kind: 'fiduciary' | 'processor'; s?: number }) {
  return (
    <rect
      className={`mk-org mk-org--${kind}`}
      x={x - s / 2}
      y={y - s / 2}
      width={s}
      height={s}
    />
  )
}

/**
 * A purpose: corner brackets around a region. Only the corners are drawn, so
 * the boundary reads as a stated limit rather than a container.
 */
export function Purpose({
  x,
  y,
  w,
  h,
  arm = 10,
}: At & { w: number; h: number; arm?: number }) {
  const r = x + w
  const b = y + h
  const d = [
    `M${x} ${y + arm}V${y}H${x + arm}`,
    `M${r - arm} ${y}H${r}V${y + arm}`,
    `M${r} ${b - arm}V${b}H${r - arm}`,
    `M${x + arm} ${b}H${x}V${b - arm}`,
  ].join('')
  return <path className="mk-purpose" d={d} />
}

export type RouteState = 'open' | 'travelled' | 'consented' | 'declined' | 'faint'

/** A route the data may travel. Its state is carried by stroke, never colour alone. */
export function Route({ d, state = 'open' }: { d: string; state?: RouteState }) {
  return <path className={`mk-route mk-route--${state}`} d={d} />
}

/** A refusal: a bar across a route at the point it is stopped. */
export function Stop({ x, y, vertical = true }: At & { vertical?: boolean }) {
  const d = vertical ? `M${x} ${y - 7}V${y + 7}` : `M${x - 7} ${y}H${x + 7}`
  return <path className="mk-stop" d={d} />
}

export type StationState = 'pass' | 'refuse' | 'dark' | 'held'

/** A station: a script, vendor or downstream system the data may reach. */
export function Station({ x, y, state = 'pass' }: At & { state?: StationState }) {
  return <circle className={`mk-station mk-station--${state}`} cx={x} cy={y} r={5.5} />
}

/** Evidence: a slip with ruled lines, set down and left in place. */
export function Record({ x, y }: At) {
  return (
    <g className="mk-record">
      <rect className="mk-record__slip" x={x - 9} y={y - 11} width={18} height={22} />
      <path className="mk-record__rule" d={`M${x - 5} ${y - 5}H${x + 5}M${x - 5} ${y}H${x + 5}M${x - 5} ${y + 5}H${x + 2}`} />
    </g>
  )
}

/** The far end of a right: a place your data reached. */
export function Endpoint({ x, y }: At) {
  return <circle className="mk-endpoint" cx={x} cy={y} r={3.5} />
}

/** A plain connection — reach, responsibility, or a right. */
export function Link({ d, dashed = false }: { d: string; dashed?: boolean }) {
  return <path className={`mk-link${dashed ? ' mk-link--dashed' : ''}`} d={d} />
}

/** A small caption inside a plate. Duplicated in the HTML; never the only copy. */
export function Label({
  x,
  y,
  children,
  anchor = 'middle',
  tone = 'muted',
}: At & { children: ReactNode; anchor?: 'start' | 'middle' | 'end'; tone?: 'muted' | 'strong' }) {
  return (
    <text className={`mk-label mk-label--${tone}`} x={x} y={y} textAnchor={anchor}>
      {children}
    </text>
  )
}
