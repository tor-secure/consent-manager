// Written for plain React: the React Compiler is off for the explainer, whose
// 3D code mutates per-frame state in place, as React Three Fiber intends.
'use no memo'

import { create } from 'zustand'
import type { LawDefaults, Selection } from '../content/law'
import type { StationId } from '../content/stations'

/**
 * Two kinds of state, kept apart on purpose.
 *
 * `journey` is continuous: where the reader is along the scroll, the pointer,
 * the rectangle the stage frames its subject in. It is a plain mutable object
 * written by the scroll driver and read inside `useFrame`, so scrolling never
 * re-renders React.
 *
 * `useChoices` is discrete: what the reader picked in each station's control
 * (or by clicking the model). React renders the card from it and the stage
 * reacts to it, so the HTML and the 3D can never disagree.
 */

export interface JourneyFrame {
  /**
   * Continuous position. −1 is the hero (your data, alone), 0…7 are the
   * stations. Between two stations the value travels only during the second
   * part of the scroll, so each station holds still while its card is read.
   */
  position: number
  /** Pointer in normalised device coordinates, −1 → 1. Mouse only. */
  pointerX: number
  pointerY: number
  /** Where the subject is framed, in CSS pixels of the viewport. */
  window: { x: number; y: number; width: number; height: number }
  /**
   * The hero's picture space, in CSS pixels of the document (not the
   * viewport): it scrolls with the title, so the opening model rides above
   * the words instead of sliding under them. Zero-sized when there is none.
   */
  hero: { x: number; y: number; width: number; height: number }
  /** The document scroll, to place `hero` in the viewport. */
  scrollY: number
  /** Viewport size the window was measured against. */
  viewport: { width: number; height: number }
}

export const journey: JourneyFrame = {
  position: -1,
  pointerX: 0,
  pointerY: 0,
  window: { x: 0, y: 0, width: 1, height: 1 },
  hero: { x: 0, y: 0, width: 0, height: 0 },
  scrollY: 0,
  viewport: { width: 1, height: 1 },
}

const wakers = new Set<() => void>()

/** The stage subscribes so an on-demand render loop knows when to draw. */
export function onJourneyChange(waker: () => void) {
  wakers.add(waker)
  return () => {
    wakers.delete(waker)
  }
}

export function wakeJourney() {
  for (const waker of wakers) waker()
}

const STATION_IDS: StationId[] = ['people', 'reason', 'consent', 'purposes', 'withdrawal', 'rights', 'stricter', 'system']

interface Choices {
  /** The station holding the viewport, −1 in the hero. */
  active: number
  /**
   * What the reader has picked. A station not in it shows its law's default
   * (read it with `useSelected`), so the store needs no law to render.
   */
  selection: Partial<Selection>
  /** Purpose toggles in station 04 the reader has flipped (see `usePurposes`). */
  purposes: Record<string, boolean>
  /** The mounted law's defaults, for actions that flip a default. */
  defaults: LawDefaults
  /** Bumped on every choice, so the stage can replay an animation. */
  pulse: Record<StationId, number>
  /** The part of a model under the pointer, for its label. */
  hover: { station: StationId; part: string } | null
  /** Which station's detail sheet is open. */
  details: StationId | null
  /** Phone: the model has come forward over the words to play a choice. */
  showcase: boolean
  setActive: (index: number) => void
  choose: (station: StationId, option: string) => void
  togglePurpose: (id: string) => void
  /** Sets every purpose that can be switched (accept all, reject all, an opt-out). */
  setPurposes: (on: boolean) => void
  setHover: (hover: Choices['hover']) => void
  openDetails: (station: StationId | null) => void
  /** A law has mounted: start from its defaults, with nothing picked. */
  begin: (defaults: LawDefaults) => void
}

function togglePurposes(state: Choices, id: string): Partial<Choices> {
  if (state.defaults.locked.includes(id)) return {}
  const on = state.purposes[id] ?? state.defaults.purposes[id] ?? false
  return {
    purposes: { ...state.purposes, [id]: !on },
    pulse: { ...state.pulse, purposes: state.pulse.purposes + 1 },
  }
}

const zeroPulse = () => Object.fromEntries(STATION_IDS.map((id) => [id, 0])) as Record<StationId, number>

const fresh = () => ({
  active: -1,
  selection: {},
  purposes: {},
  pulse: zeroPulse(),
  hover: null,
  details: null,
  showcase: false,
})

export const useChoices = create<Choices>((set) => ({
  ...fresh(),
  defaults: { selection: {} as Selection, purposes: {}, locked: [] },
  begin: (defaults) => set({ ...fresh(), defaults }),
  setActive: (active) => set({ active }),
  // In station 04 a choice is a toggle: each purpose is answered on its own.
  choose: (station, option) =>
    set((state) => station === 'purposes' ? togglePurposes(state, option) : ({
      selection: { ...state.selection, [station]: option },
      pulse: { ...state.pulse, [station]: state.pulse[station] + 1 },
    })),
  togglePurpose: (id) => set((state) => togglePurposes(state, id)),
  setPurposes: (on) =>
    set((state) => {
      const purposes = { ...state.purposes }
      for (const id of Object.keys(state.defaults.purposes)) {
        if (!state.defaults.locked.includes(id)) purposes[id] = on
      }
      return { purposes, pulse: { ...state.pulse, purposes: state.pulse.purposes + 1 } }
    }),
  setHover: (hover) => set({ hover }),
  openDetails: (details) => set({ details }),
}))

// Every discrete change may need a frame from an on-demand stage.
useChoices.subscribe(wakeJourney)

/** How long the model holds the stage: long enough to play any choice out. */
const SHOWCASE_MS = 3200
let showcaseTimer = 0

/**
 * On a phone the card's words sit over the model, so a choice made on a
 * button would play out half hidden. Instead the model comes forward: the
 * words fade back, the model moves to the middle of the screen and grows,
 * plays the choice, and then everything settles back. Not on wider screens
 * (the model is beside the card there) and not under reduced motion.
 */
export function startShowcase() {
  if (!window.matchMedia('(max-width: 767.98px)').matches) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  if (document.documentElement.dataset.stage !== 'available') return
  window.clearTimeout(showcaseTimer)
  useChoices.setState({ showcase: true })
  showcaseTimer = window.setTimeout(endShowcase, SHOWCASE_MS)
}

export function endShowcase() {
  window.clearTimeout(showcaseTimer)
  if (useChoices.getState().showcase) useChoices.setState({ showcase: false })
}

/**
 * The state of your data as the story has left it: consented once a clear
 * yes has passed the checks (or the reader has moved past station 03 without
 * trying), drained once withdrawn.
 */
export function dataState(state: Choices, position: number): 'raw' | 'consented' | 'withdrawn' {
  if (state.selection.withdrawal === 'withdrawn' && position > 3.5) return 'withdrawn'
  const tried = state.selection.consent
  if (tried === 'given') return 'consented'
  if (tried == null && position > 2.55) return 'consented'
  return 'raw'
}
