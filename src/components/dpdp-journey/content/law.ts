import type { View } from '../three/layout'
import type { Station, StationId } from './stations'
import type { Chapter } from './types'

/**
 * A law the journey can explain. The route is always the same eight stations
 * (people, reason, consent, purposes, withdrawal, rights, stricter, system),
 * because the models on the stage are consent mechanics every law here has in
 * some form; a law supplies the words, the choices, and the labels the models
 * carry.
 *
 * Some models play a choice out by its option id, so in every law:
 * - people: `principal`, `fiduciary`, `processor` (you, who decides, who works for it)
 * - reason: `consent`, `legitimate` (the two ways round the bar), `shortcut` (refused)
 * - consent: `silence`, `uninformed`, `bundled` (fail checks 1, 2, 3), `given` (passes)
 * - purposes: one locked option in the middle stream, two optional ones either side
 * - withdrawal: `given`, `withdrawn`
 * - rights: `rights`, `duties`
 * - stricter and system: any ids; the scenes come from `scene.stricter` and the options
 */
export interface Law {
  id: 'dpdp' | 'gdpr' | 'ccpa'
  hero: {
    /** The law's name, above the title. */
    name: string
    /** Its year or number, set beside the name. */
    year: string
    lead: string
  }
  colophon: { about: string; legal: string }
  /** Prefixed to each chapter's `source` in the detail sheet. */
  sourcePrefix: string
  stations: Station[]
  /** The full text behind the stations, by id (see `Station.chapters`). */
  chapters: DetailChapter[]
  scene: SceneText
  /**
   * Phone framings that differ from the shared ones, where this law's models
   * reach further (a boundary drawn round you, say). By station, then view.
   */
  narrowViews?: Partial<Record<StationId, Record<string, View>>>
}

/** What the detail sheet shows of a chapter. */
export type DetailChapter = Pick<Chapter, 'id' | 'kicker' | 'title' | 'takeaway' | 'brief' | 'source'> &
  Partial<Pick<Chapter, 'depth' | 'caution' | 'terms' | 'moments'>>

/** The one thing each right lets you do, drawn as its own small shape. */
export type RightTool =
  | 'access'
  | 'correction'
  | 'erasure'
  | 'restriction'
  | 'portability'
  | 'objection'
  | 'complaint'
  | 'nomination'
  | 'withdrawal'
  | 'equal'

/**
 * One side of the stricter station. A `room` is protected data behind a double
 * wall: one way in through a check, and other reaches stopped at the wall. The
 * `holders` scene is two lookalike record holders told apart.
 */
export type StricterScene =
  | {
      kind: 'room'
      subject: string
      /** Who comes in through the check, and the shape they are drawn as. */
      gatekeeper: string
      gatekeeperHover: string
      gatekeeperShape: 'person' | 'organisation'
      check: string
      checkHover: string
      /** Two to four reaches stopped at the wall. */
      reaches: string[]
      /** A second way in through the same check, beside the first. */
      second?: { label: string; hover: string; shape: 'person' | 'organisation' }
      /** An age scale beside the room: its marks, and the span of them that applies. */
      ages?: { marks: string[]; from: number; to: number; label: string }
      /** What the room holds, one small tile each (named on hover). */
      contents?: string[]
    }
  | {
      kind: 'holders'
      left: string
      leftHover: string
      right: string
      rightHover: string
      you: string
      organisation: string
      authority: string
    }

/** Every label a model on the stage carries, by station. */
export interface SceneText {
  people: {
    principal: string
    principalHover: string
    fiduciary: string
    processor: string
    responsibility: string
    data: string
    /** One word each, for the flat figure. */
    short: { fiduciary: string; processor: string }
    /** A dashed boundary round you: where the law reaches, wherever the holder is. */
    scope?: { label: string; hover: string }
    /** A second controller beside the first, deciding with it. */
    joint?: { label: string; hover: string }
    /** Your household, counted with you. */
    household?: { label: string; hover: string }
    /** Thresholds a holder must meet (any one), drawn as bars on its block. */
    thresholds?: { label: string; items: [string, string, string] }
  }
  reason: {
    bar: string
    purpose: string
    consent: string
    legitimate: string
    shortcut: string
    shortcutHover: string
    processing: string
    /**
     * How the ways to processing are drawn: two round a bar (the default);
     * `bases`, one for consent and one per other lawful basis, with the
     * refused route a jump between them; or `notice`, no bar at all, but a
     * notice at collection, nested purposes, and a consent gate for anything
     * outside them.
     */
    kind?: 'bar' | 'bases' | 'notice'
    /** bases: the other lawful bases, fanned on the right. */
    others?: string[]
    /** notice: the notice at collection, the wider frame, and the gate. */
    notice?: { slip: string; slipHover: string; compatible: string; gate: string; gateHover: string }
  }
  consent: {
    checks: [string, string, string]
    notice: string
    noticeHover: string
    /** How each failing attempt is drawn, where the law names its own. */
    attempts?: Partial<Record<'silence' | 'uninformed' | 'bundled', Attempt>>
    /** A record slip that appears once a yes passes: consent that can be shown. */
    proof?: string
    /** The lane most processing takes without consent, beside the checks. */
    bypass?: { label: string; hover: string }
  }
  purposes?: {
    /** Accept all and reject all, the same size, each setting every optional purpose. */
    choice?: { accept: string; reject: string; note: string }
    /** An opt-out link and a browser signal, each switching the optional purposes off. */
    optOut?: { link: string; linkHover: string; signal: string; signalHover: string }
  }
  withdrawal: {
    past: string
    record: string
    versions: string
    necessary: string
    told: string
    /** Give and withdraw, the same size. */
    symmetry?: { give: string; withdraw: string; note: string }
    /** Erasure, a separate right: drawn round the data, not set off. */
    erasure?: string
    /** Timings in place of notice versions: how long the record is kept, the deadline to stop, the hold before asking again. */
    timing?: { kept: string; keptCount: number; deadline: string; deadlineCount: number; hold: string; holdCount: number }
  }
  rights: {
    you: string
    holder: string
    /** Around you. Five to seven reads best. */
    rights: { label: string; tool: RightTool }[]
    /** Around the holder; the first is the consent duty, drawn lit. */
    duties: string[]
    /** The dashed bracket of duties only some holders carry. */
    extra: string
    /** How long a request may take: a clock of the base time, and its extension dashed. */
    deadline?: { base: number; extension: number; label: string }
  }
  stricter: [StricterScene, StricterScene]
  system: {
    person: string
    boundary: string
    /**
     * Something crossing the boundary: a `transfer` leaving it through a check,
     * or a `signal` coming in to step `step` of the loop.
     */
    crossing?: { kind: 'transfer' | 'signal'; label: string; hover: string; step: number }
  }
}

/** A would-be consent, shaped like what it is. */
export type Attempt = 'hollow' | 'faint' | 'bundle' | 'preticked' | 'blank' | 'closed' | 'terms' | 'lopsided'

export type Selection = Record<StationId, string | null>

/** What each control shows before the reader touches it. */
export interface LawDefaults {
  selection: Selection
  purposes: Record<string, boolean>
  /** Purposes that cannot be switched off. */
  locked: string[]
}

const cache = new WeakMap<Law, LawDefaults>()

export function defaultsOf(law: Law): LawDefaults {
  let defaults = cache.get(law)
  if (defaults) return defaults
  const selection = {} as Selection
  const purposes: Record<string, boolean> = {}
  const locked: string[] = []
  for (const station of law.stations) {
    const { control } = station
    if (control.kind === 'toggle') {
      selection[station.id] = null
      for (const option of control.options) purposes[option.id] = Boolean(option.defaultOn)
      for (const l of control.locked ?? []) {
        locked.push(l.id)
        purposes[l.id] = true
      }
    } else {
      selection[station.id] = control.startEmpty ? null : control.options[0].id
    }
  }
  defaults = { selection, purposes, locked }
  cache.set(law, defaults)
  return defaults
}
