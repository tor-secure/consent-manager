/**
 * The content model.
 *
 * Text is separated from presentation: nothing here knows about CSS classes,
 * DOM structure, or Three.js. A chapter declares *what it must teach* and *what
 * visual event would make that obvious*; the sections layer decides how to show
 * it, and the 3D layer decides how to build it.
 *
 * See `docs/CONTENT.md` for the rule against inventing legal substance, and
 * `docs/INFORMATION-ARCHITECTURE.md` for why the chapters are in this order.
 */

/**
 * The named visual treatment of a chapter. This is a semantic name for the kind
 * of visual event the chapter needs — not a layout or a component. The CSS maps
 * it to a presentation; the 3D scene maps it to a behaviour. Either may change
 * without touching the content.
 */
export type Treatment =
  | 'origin' // something resolves out of nothing
  | 'cast' // several actors take up positions around the subject
  | 'grounds' // alternative routes, exactly one of which is taken
  | 'frame' // a boundary is drawn and then tested
  | 'unfold' // a surface opens and is read item by item
  | 'affirm' // the subject changes state in place
  | 'split' // one path separates into several
  | 'ledger' // something durable is set down and persists
  | 'gate' // passage is permitted or refused, station by station
  | 'reverse' // an earlier change is undone, with visible consequences
  | 'radial' // connections are drawn outward from the subject
  | 'counterpart' // the same connections, seen from the other end
  | 'threshold' // a stricter boundary that most things cannot cross
  | 'custody' // two similar-looking holders, told apart
  | 'assembly' // everything built so far resolves into one diagram

/**
 * The site's visual vocabulary: the small set of abstract marks every
 * illustration is composed from. Each names a concept, not a shape — the
 * presentation layer decides what the shape is.
 */
export type MarkId =
  | 'principal'
  | 'data'
  | 'fiduciary'
  | 'processor'
  | 'purpose'
  | 'consent'
  | 'record'
  | 'right'

/** One entry in the key to the visual vocabulary. */
export interface Mark {
  id: MarkId
  name: string
  /** What the mark stands for, in this site's illustrations. Not a legal claim. */
  standsFor: string
}

/** One element on stage, and what it stands for. */
export interface VisualElement {
  name: string
  meaning: string
}

/**
 * A visual concept, described independently of its implementation. A phase that
 * builds the 3D reads `event` and `elements` as a specification; it does not get
 * to add anything that is not described here.
 */
export interface VisualConcept {
  /** The single state change the visitor should notice. */
  event: string
  /** Every element on stage, and what each one means. */
  elements: VisualElement[]
  /** The idea the event exists to make obvious. */
  meaning: string
}

/** A term defined at the point it is first used. */
export interface Term {
  term: string
  definition: string
}

/**
 * A moment inside a chapter: one step of its explanation, shown at the instant
 * the stage shows the thing it is about. A chapter told in moments introduces
 * its ideas one at a time, in order, before its summary — rather than as a
 * block of text after the picture.
 *
 * A moment is either a defined term (its source definition is shown verbatim)
 * or a titled step in plain language.
 */
/**
 * An optional real control on a moment. The story never waits on it: the
 * same outcome also plays out by scrolling on. The labels are content; what
 * the control does is decided by `kind`.
 */
export interface MomentAction {
  kind: 'withdraw'
  label: string
  doneLabel: string
  /** Shown before it is pressed. */
  hint: string
  /** Shown after it is pressed, as a polite status message. */
  doneHint: string
}

interface MomentBase {
  /** Stable id. The stage and the flat stand-in figure key off it. */
  id: string
  /** The mark that stands for it, when it introduces one. */
  mark?: MarkId
  /**
   * A short label shown above the heading: what this moment tests or names.
   * Words from the source only.
   */
  tag?: string
  /** An optional control the visitor can use at this moment. */
  action?: MomentAction
  /** One or two plain-language lines. Paraphrases the source; adds nothing. */
  plain: string
}

export type Moment = MomentBase &
  (
    | {
        /** Must match the `term` of one of the chapter's `terms`. */
        term: string
        title?: never
      }
    | { title: string; term?: never }
  )

/** Optional deeper explanation, shown behind a disclosure. */
export interface Depth {
  summary: string
  points: string[]
}

/** A grouping of chapters. Acts give a fifteen-chapter story a readable shape. */
export interface Act {
  id: string
  /** Roman numeral shown in the rail and the act break. */
  numeral: string
  title: string
  /** One line stating what this act of the story is for. */
  premise: string
}

export interface Chapter {
  id: string
  /** Two-digit position label. */
  label: string
  actId: Act['id']
  /** Short name for the rail and the mobile counter. */
  stage: string
  title: string
  /** One line of framing under the title. */
  kicker: string

  /**
   * What the visitor should walk away knowing. One sentence. This is the
   * chapter's reason to exist — if it cannot be stated here, the chapter is
   * either two chapters or none.
   */
  takeaway: string

  /**
   * The concise explanation. Always shown, on every screen size. Two short
   * paragraphs is the target and the ceiling.
   */
  brief: string[]

  /** Deeper detail, progressively disclosed. Never required to follow the story. */
  depth?: Depth

  /** Terms this chapter introduces. */
  terms?: Term[]

  /**
   * Optional: the chapter's terms introduced one at a time, each while the
   * stage shows it. Terms covered here are not repeated in the summary.
   */
  moments?: Moment[]

  /**
   * Optional: the question this chapter leaves the reader with, answered by
   * what follows. Always a question, never a claim.
   */
  next?: string

  /** A caution the source states explicitly and a reader would otherwise miss. */
  caution?: string

  visual: VisualConcept
  treatment: Treatment

  /** Scroll track length, in viewport heights. Longer copy earns a longer dwell. */
  track: number

  /** Which part of the canonical source this chapter derives from. */
  source: string
}

/**
 * One beat of the prologue: the opening sequence that introduces the cast —
 * you, your data, the system — before the first chapter. Beats are framing,
 * not claims about the Act; definitions wait for the chapters that own them.
 */
export interface Beat {
  id: 'you' | 'data' | 'system'
  /** The element of the opening picture this beat names. */
  title: string
  text: string
}
