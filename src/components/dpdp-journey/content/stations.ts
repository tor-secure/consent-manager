import type { MarkId } from './types'

/**
 * The compact journey: eight stations, each one model on the stage and one
 * short card on the page. The full chapter text in `chapters.ts` stays the
 * single source for detail, and each station names the chapters it condenses
 * so its detail sheet can show them in full.
 *
 * Every line here paraphrases a chapter's takeaway or moments. Nothing adds a
 * legal claim (see docs/CONTENT.md).
 */

export type StationId =
  | 'people'
  | 'reason'
  | 'consent'
  | 'purposes'
  | 'withdrawal'
  | 'rights'
  | 'stricter'
  | 'system'

/** One choice in a station's interactive control. */
export interface StationOption {
  id: string
  label: string
  /** What the stage shows for this choice, said in the card as well. */
  result: string
  /** The tone the result is reported in. */
  tone?: 'grant' | 'refuse' | 'neutral'
}

export interface StationControl {
  /** What the control asks, shown above it. */
  prompt: string
  /** `single`: one option at a time. `toggle`: each option on or off. */
  kind: 'single' | 'toggle'
  options: StationOption[]
  /** Toggles that cannot be switched off, with the reason. */
  locked?: { id: string; reason: string }[]
}

export interface Station {
  id: StationId
  number: string
  /** Short name for navigation. */
  label: string
  title: string
  /** The one sentence to walk away with. */
  takeaway: string
  /** Three short points. */
  points: { title: string; body: string }[]
  control: StationControl
  /** Chapters (by id) whose full text the detail sheet shows. */
  chapters: string[]
  /** The marks this station's model is built from, for the key. */
  marks: MarkId[]
}

export const stations: Station[] = [
  {
    id: 'people',
    number: '01',
    label: 'People',
    title: 'Your data, and who holds it',
    takeaway:
      'Personal data is information that points at an identifiable person. Once it is digital, the Act covers it.',
    points: [
      { title: 'You are the Data Principal', body: 'The individual the data relates to.' },
      { title: 'The Data Fiduciary decides', body: 'It chooses why and how your data is processed.' },
      { title: 'A Data Processor works for it', body: 'Hiring a vendor does not move the fiduciary’s responsibility.' },
    ],
    control: {
      prompt: 'Who is who?',
      kind: 'single',
      options: [
        { id: 'principal', label: 'You', result: 'The Data Principal: the individual to whom the personal data relates.' },
        { id: 'fiduciary', label: 'Fiduciary', result: 'The Data Fiduciary decides the purpose and means of processing. Usually the website or app that collected it.' },
        { id: 'processor', label: 'Processor', result: 'A Data Processor processes on the fiduciary’s behalf, under a valid contract. The responsibility line stays with the fiduciary.' },
      ],
    },
    chapters: ['data', 'people'],
    marks: ['principal', 'data', 'fiduciary', 'processor'],
  },
  {
    id: 'reason',
    number: '02',
    label: 'Reason',
    title: 'A reason, and a lawful ground',
    takeaway:
      'Holding data is not a reason to use it. Processing needs a named purpose and either your consent or a legitimate use the Act lists.',
    points: [
      { title: 'Two grounds', body: 'Your consent, or a use the Act itself specifically lists.' },
      { title: 'No relabelling', body: 'Calling advertising a “legitimate use” to skip asking is not allowed.' },
      { title: 'The purpose is a boundary', body: 'Only what that purpose needs. No quiet reuse.' },
    ],
    control: {
      prompt: 'Pick the route your data takes',
      kind: 'single',
      options: [
        { id: 'consent', label: 'Consent', result: 'You agree to the processing for a stated purpose. The consent route lights.', tone: 'grant' },
        { id: 'legitimate', label: 'Legitimate use', result: 'A use the Act specifically lists. Decided and documented purpose by purpose.', tone: 'neutral' },
        { id: 'shortcut', label: 'Relabelled shortcut', result: 'Refused. Describing advertising as a legitimate use, to avoid asking you, is what the Act does not allow.', tone: 'refuse' },
      ],
    },
    chapters: ['grounds', 'purpose'],
    marks: ['data', 'purpose', 'consent'],
  },
  {
    id: 'consent',
    number: '03',
    label: 'Consent',
    title: 'What makes a consent real',
    takeaway:
      'A notice comes first. Consent must then be free, specific, informed, unconditional and unambiguous, given by a clear affirmative action.',
    points: [
      { title: 'Notice before the question', body: 'An itemised explanation of the data and its purpose, presented with the request.' },
      { title: 'A clear action', body: 'Silence, inactivity or a pre-ticked box is not a yes.' },
      { title: 'Not a price', body: 'Consent bundled with something unrelated fails the test.' },
    ],
    control: {
      prompt: 'Send a consent through the three checks',
      kind: 'single',
      options: [
        { id: 'silence', label: 'Pre-ticked box', result: 'Stopped at check 1. Silence, inactivity and a pre-ticked box are not a clear affirmative action.', tone: 'refuse' },
        { id: 'uninformed', label: 'No notice', result: 'Stopped at check 2. Consent is for a specified purpose; without a notice you could understand, it is not informed.', tone: 'refuse' },
        { id: 'bundled', label: 'Bundled', result: 'Stopped at check 3. Bundled into a contract for something unrelated, it is not free and unconditional.', tone: 'refuse' },
        { id: 'given', label: 'Clear yes', result: 'Passes all three. Your data changes in place: consent is now attached to it.', tone: 'grant' },
      ],
    },
    chapters: ['notice', 'consent'],
    marks: ['data', 'consent', 'purpose'],
  },
  {
    id: 'purposes',
    number: '04',
    label: 'Purposes',
    title: 'One switch is not a choice',
    takeaway:
      'Optional purposes like analytics and advertising should be separable from what the service needs, and only what your choice allows should run.',
    points: [
      { title: 'Each purpose, its own answer', body: 'Accept, reject, or choose purpose by purpose.' },
      { title: 'Declining is valid', body: 'A declined purpose is a supported answer, not a failure.' },
      { title: 'The choice must hold', body: 'Scripts and vendors run only for the purposes allowed.' },
    ],
    control: {
      prompt: 'Your choices',
      kind: 'toggle',
      options: [
        { id: 'necessary', label: 'Necessary', result: 'Processing the service needs runs, kept apart from the optional purposes.' },
        { id: 'analytics', label: 'Analytics', result: 'Analytics allowed: its stream lights and reaches its vendor.', tone: 'grant' },
        { id: 'advertising', label: 'Advertising', result: 'Advertising allowed: its stream lights and reaches its vendor.', tone: 'grant' },
      ],
      locked: [{ id: 'necessary', reason: 'What the service needs is kept apart from the optional purposes.' }],
    },
    chapters: ['granularity', 'enforcement'],
    marks: ['data', 'purpose', 'processor'],
  },
  {
    id: 'withdrawal',
    number: '05',
    label: 'Record',
    title: 'Recorded, and reversible',
    takeaway:
      'The choice is kept as evidence. Withdrawing must be as easy as consenting, and what relied on the consent has to stop.',
    points: [
      { title: 'A record, not a memory', body: 'The notice version shown, what you chose, and when.' },
      { title: 'Withdraw at any time', body: 'Systems that relied on consent are told and stop, one after another.' },
      { title: 'Not a rewind, not erasure', body: 'Earlier lawful processing stays lawful. Withdrawal is not deletion by itself.' },
    ],
    control: {
      prompt: 'Change your mind',
      kind: 'single',
      options: [
        { id: 'given', label: 'Consent given', result: 'The record holds your decision, the notice version you saw and the time.', tone: 'grant' },
        { id: 'withdrawn', label: 'Withdraw consent', result: 'Withdrawn. A new slip is filed over the old one, which stays. The analytics stream stops; the necessary stream runs on. The data is still there, hollowed.', tone: 'refuse' },
      ],
    },
    chapters: ['record', 'withdrawal'],
    marks: ['record', 'consent', 'data'],
  },
  {
    id: 'rights',
    number: '06',
    label: 'Rights',
    title: 'Your rights. Their duties.',
    takeaway:
      'You can ask for access, correction, erasure, grievance redressal and nomination. The fiduciary owes far more than a consent banner.',
    points: [
      { title: 'Exercised with the fiduciary', body: 'With a path onward to the Data Protection Board.' },
      { title: 'Consent is one duty of many', body: 'Security, accuracy, processor contracts, deletion and more.' },
      { title: 'Some carry more', body: 'The Government may designate Significant Data Fiduciaries.' },
    ],
    control: {
      prompt: 'See it from either end',
      kind: 'single',
      options: [
        { id: 'rights', label: 'Your rights', result: 'Access, correction, erasure, grievance, nomination, and withdrawal of consent, each a line from you to where your data went.' },
        { id: 'duties', label: 'Their duties', result: 'Lawful processing, security, accuracy, rights handling, processor contracts, retention and deletion, with consent handling one node of seven.' },
      ],
    },
    chapters: ['rights', 'duties'],
    marks: ['principal', 'right', 'fiduciary'],
  },
  {
    id: 'stricter',
    number: '07',
    label: 'Stricter',
    title: 'Where the rules tighten',
    takeaway:
      'A child’s data needs a guardian’s verifiable consent. A Consent Manager is a registered role, not a piece of software.',
    points: [
      { title: 'Under eighteen', body: 'Verifiable consent from a parent or lawful guardian.' },
      { title: 'Not permitted', body: 'Tracking, behavioural monitoring and targeted advertising directed at children.' },
      { title: 'Role, not tool', body: 'Deploying consent software registers nobody with the Board.' },
    ],
    control: {
      prompt: 'Look closer at',
      kind: 'single',
      options: [
        { id: 'children', label: 'Children', result: 'A double wall around the data. A guardian’s consent comes through one prescribed check; tracking and targeted ads are stopped at the wall.' },
        { id: 'manager', label: 'Consent Manager', result: 'Two holders that look alike. The registered Consent Manager sits on your side, accountable to you; the platform sits inside the organisation, and its line to the Board is stopped.' },
      ],
    },
    chapters: ['children', 'consent-manager'],
    marks: ['principal', 'data', 'record'],
  },
  {
    id: 'system',
    number: '08',
    label: 'System',
    title: 'It was never just a banner',
    takeaway:
      'Notice, request, choice, recorded, applied, change or withdraw, updated: a lifecycle inside wider duties, about a person.',
    points: [
      { title: 'A workflow, not the whole Act', body: 'Security, retention and children’s data sit outside the banner.' },
      { title: 'The duty stays put', body: 'With the Data Fiduciary, throughout.' },
      { title: 'Check the source', body: 'Rules and notified dates keep moving. Read the official text.' },
    ],
    control: {
      prompt: 'Walk the lifecycle',
      kind: 'single',
      options: [
        { id: 'notice', label: 'Notice', result: 'Notice: the data and the purpose, explained before the question.' },
        { id: 'request', label: 'Request', result: 'Consent request: one purpose at a time.' },
        { id: 'choice', label: 'Your choice', result: 'Your choice: a clear affirmative action, or a decline.' },
        { id: 'recorded', label: 'Recorded', result: 'Consent recorded: what was shown, decided, and when.' },
        { id: 'applied', label: 'Applied', result: 'Consent applied: only what the record allows runs.' },
        { id: 'change', label: 'Change', result: 'Change or withdraw: as easy as saying yes was.' },
        { id: 'updated', label: 'Updated', result: 'Consent updated: the record and connected systems follow, and the loop closes.' },
      ],
    },
    chapters: ['system'],
    marks: ['data', 'record', 'consent'],
  },
]

export const stationIndex = new Map(stations.map((station, index) => [station.id, index]))
