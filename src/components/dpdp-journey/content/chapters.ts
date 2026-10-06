import type { Chapter } from './types'

/**
 * The spine of the experience. Fifteen chapters in seven acts.
 *
 * Ordering rationale lives in `docs/INFORMATION-ARCHITECTURE.md`. The short
 * version: a reader cannot understand duties before knowing who holds them, or
 * consent before knowing that consent is not the only lawful ground. So roles
 * come before rules, grounds come before consent, and the mechanics of a choice
 * (record, enforcement, withdrawal) come before the rights that depend on them.
 *
 * Every legal statement below is drawn from the canonical ConsentGuru DPDP page;
 * the `source` field names where. The `visual` field describes this site's own
 * illustration and makes no claim about the Act.
 */
export const chapters: Chapter[] = [
  // ───────────────────────────────── Act I — What is in play
  {
    id: 'data',
    label: '01',
    actId: 'subject',
    stage: 'Data',
    title: 'Your data is already in the room',
    kicker: 'Start with the thing the law is about.',
    takeaway:
      'Personal data is any information that points at an identifiable person — and the Act covers it once it is digital, including paper records that were digitised later.',
    brief: [],
    terms: [
      {
        term: 'Personal data',
        definition:
          'Information about an individual who is identifiable by, or in relation to, that information.',
      },
    ],
    moments: [
      {
        id: 'term',
        term: 'Personal data',
        mark: 'data',
        plain:
          'Not a special category of secret facts — ordinary information that happens to point at someone. The thread is that pointing.',
      },
      {
        id: 'digital',
        tag: 'Digital',
        title: 'Once it is digital',
        plain:
          'The Digital Personal Data Protection Act, 2023 is concerned with personal data in digital form — including data collected offline and digitised afterwards.',
      },
    ],
    visual: {
      event:
        'The view closes in on the object you met at the top of the page, hanging on its thread beneath you. It is the only object you will follow, and the thread never breaks.',
      elements: [
        { name: 'The point with a ring', meaning: 'The person the data is about: you.' },
        { name: 'The solid', meaning: 'One piece of your personal data.' },
        { name: 'The thread', meaning: 'What makes it personal: it points back at you.' },
      ],
      meaning:
        'What makes the data personal is the thread back to a person, not what it says.',
    },
    treatment: 'origin',
    // An opener and two moments, one viewport each, then the summary.
    track: 4.5,
    source: 'Quick overview — Digital personal data; Key concepts — Personal data',
  },
  {
    id: 'people',
    label: '02',
    actId: 'subject',
    stage: 'Roles',
    title: 'Three roles, and only one of them is you',
    kicker: 'Who the data is about, who decides, who does the work.',
    takeaway:
      'You are the Data Principal. The organisation that decides why and how your data is processed is the Data Fiduciary — and it stays responsible even when it hires a Data Processor to do some of the processing.',
    brief: [
      'For a child, a parent or lawful guardian acts as the Data Principal; so does the lawful guardian of a person with a disability.',
      'The Data Fiduciary is usually the website operator or app publisher collecting the data. Data Processors are the services it engages: analytics vendors, tag managers, cloud hosts, agencies.',
    ],
    depth: {
      summary: 'Why the distinction decides everything that follows',
      points: [
        'The duties under the Act sit with the Data Fiduciary. Engaging a processor does not move them.',
        'A Data Processor may be engaged only under a valid contract.',
        'When you exercise a right, you exercise it against the fiduciary — not against its vendors.',
      ],
    },
    terms: [
      {
        term: 'Data Principal',
        definition: 'The individual to whom the personal data relates.',
      },
      {
        term: 'Data Fiduciary',
        definition:
          'The person or organisation that decides the purpose and means of processing.',
      },
      {
        term: 'Data Processor',
        definition:
          'A person who processes personal data on behalf of a Data Fiduciary.',
      },
    ],
    moments: [
      {
        term: 'Data Principal',
        id: 'principal',
        mark: 'principal',
        plain: 'In this story, that is you.',
      },
      {
        term: 'Data Fiduciary',
        id: 'fiduciary',
        mark: 'fiduciary',
        plain: 'It decides why your data is processed, and how. Usually the website or app that collected it.',
      },
      {
        term: 'Data Processor',
        id: 'processor',
        mark: 'processor',
        plain: 'A service the fiduciary engages — an analytics vendor, a cloud host. It does the work; the responsibility stays with the fiduciary.',
      },
    ],
    visual: {
      event:
        'Your data travels down from you to the organisation that decides about it, and on to a service working for that organisation. The line from the organisation stays attached to your data the whole way.',
      elements: [
        { name: 'The point with a ring', meaning: 'You — the Data Principal.' },
        { name: 'The solid block', meaning: 'The Data Fiduciary, which decides.' },
        { name: 'The dashed block', meaning: 'A Data Processor, acting on its behalf.' },
        {
          name: 'The line from the solid block',
          meaning: 'Responsibility, which stays with the fiduciary wherever the data goes.',
        },
      ],
      meaning:
        'Responsibility has a fixed address, and it is not the vendor’s.',
    },
    treatment: 'cast',
    // Four viewport-tall moments (an opener and one per role) before the summary.
    track: 5.5,
    source: 'Quick overview — People and organisations; Key concepts — Data Principal, Data Fiduciary, Data Processor',
  },

  // ───────────────────────────────── Act II — Why anything may happen
  {
    id: 'grounds',
    label: '03',
    actId: 'basis',
    stage: 'Grounds',
    // Act II is told as one question and its answer: 03 asks it, 04 answers it.
    title: 'Why do you need my data?',
    kicker: '“Because we have it” is not an answer.',
    takeaway:
      'Processing needs either your consent or one of the legitimate uses the Act specifically lists. Consent is not the only path, and it is not a catch-all.',
    // Every sentence of the explanation is carried by a moment below, so the
    // summary keeps only the takeaway.
    brief: [],
    moments: [
      {
        id: 'held',
        title: 'Holding it is not a reason',
        plain:
          'An organisation may not process your personal data merely because it holds it. It needs a lawful purpose, and a ground the Act recognises.',
      },
      {
        id: 'consent',
        title: 'One ground: your consent',
        mark: 'consent',
        plain:
          'You agree to the processing. What makes an agreement count is a question of its own — it comes shortly.',
      },
      {
        id: 'legitimate',
        title: 'The other: a legitimate use',
        plain:
          'A use the Act itself specifically lists. Describing advertising as a legitimate use, to skip asking you, is precisely the move the Act does not allow.',
      },
      {
        id: 'per-purpose',
        title: 'One ground, purpose by purpose',
        plain:
          'Which ground applies is decided and documented for each purpose — not declared once for the whole organisation.',
      },
    ],
    visual: {
      event:
        'The object stops at a bar across its route. Two ways around it open — consent on one side, a legitimate use on the other — and each lights as it is named. A shortcut dressed up as a legitimate use is refused. Then the object takes one way; the other stays visible, unlit.',
      elements: [
        { name: 'The bar', meaning: 'Holding the data is not a reason to process it.' },
        { name: 'The left way', meaning: 'Consent given by you.' },
        { name: 'The right way', meaning: 'A legitimate use the Act lists.' },
        { name: 'The refused shortcut', meaning: 'A purpose relabelled as a legitimate use to avoid asking.' },
        { name: 'The unlit way', meaning: 'A ground that does not apply to this purpose.' },
      ],
      meaning:
        'There is always a named reason the processing is allowed, and it is one specific reason.',
    },
    treatment: 'grounds',
    // An opener and four moments, one viewport each, then the summary.
    track: 6.5,
    source: 'Quick overview — A lawful basis; Data Fiduciary responsibilities — Lawful processing',
  },
  {
    id: 'purpose',
    label: '04',
    actId: 'basis',
    stage: 'Purpose',
    title: 'The answer has to be a purpose',
    kicker: 'Your data, then a reason, then the processing — in that order.',
    takeaway:
      'Data is asked for with a specific reason named, is limited to what that reason needs, and should not be quietly reused for a different one.',
    brief: [],
    terms: [
      {
        term: 'Purpose of processing',
        definition:
          'The specific reason the data is requested. Data should be limited to what is necessary for it.',
      },
    ],
    moments: [
      {
        id: 'purpose',
        term: 'Purpose of processing',
        mark: 'purpose',
        plain: 'Under the Act it has to be named, not implied.',
      },
      {
        id: 'needs',
        title: 'Only what it needs',
        plain: 'The purpose sets the limit on what is collected: only what that reason actually needs.',
      },
      {
        id: 'reuse',
        title: 'No quiet reuse',
        plain: 'Data collected for one purpose should not be reused for a purpose nobody agreed to.',
      },
    ],
    next: 'When consent is the basis, what makes that consent valid?',
    visual: {
      event:
        'A loose frame forms around the object — the purpose. It closes in until it fits, and a reach past its edge is refused rather than bent. From here on, the frame travels with the object, and everything that happens to it happens inside.',
      elements: [
        { name: 'The frame', meaning: 'The stated purpose, and its limits.' },
        { name: 'The frame closing in', meaning: 'Only what the purpose needs.' },
        { name: 'The interior', meaning: 'Processing the purpose covers.' },
        { name: 'A refused reach', meaning: 'A use nobody agreed to.' },
      ],
      meaning:
        'A purpose is a boundary, not a label — and the boundary is the point.',
    },
    treatment: 'frame',
    // An opener and three moments, then the summary and the next question.
    track: 5.5,
    source: 'Key concepts — Purpose of processing; Consent — Specific and purpose-limited',
  },

  // ───────────────────────────────── Act III — The moment of choice
  {
    id: 'notice',
    label: '05',
    actId: 'choice',
    stage: 'Notice',
    title: 'The notice arrives before the question',
    kicker: 'Informed means informed at that moment.',
    takeaway:
      'A notice is an itemised explanation presented together with the consent request — not a privacy policy buried in the footer.',
    // The brief is carried by the moments below, each while the stage shows it.
    brief: [],
    depth: {
      summary: 'What sound notice practice looks like',
      points: [
        'Where the people you serve read a language other than English, present the notice in a language they can use.',
        'When the notice changes, keep the earlier text, so a later consent record can point at the notice the person actually saw.',
      ],
    },
    terms: [
      {
        term: 'Notice',
        definition:
          'An itemised explanation, presented with a consent request, of the personal data and the purpose of processing — plus withdrawal, rights, and complaints.',
      },
    ],
    moments: [
      {
        id: 'wall',
        title: 'Not a wall of text',
        plain: 'A wall of legal text that hides the purpose does not meet the point of a notice.',
      },
      {
        id: 'itemised',
        term: 'Notice',
        plain: 'Plain and itemised, and presented with the request — not a privacy policy buried in the footer.',
      },
      {
        id: 'what-why',
        tag: 'Before you answer',
        title: 'What, and what for',
        plain:
          'It states the personal data and the purpose of processing, in language you can actually follow, at the point the choice is being asked for.',
      },
      {
        id: 'after',
        tag: 'And after',
        title: 'What you can do next',
        plain:
          'It also explains how to withdraw consent, how to exercise your rights and how to complain to the Data Protection Board — with contact details for someone who can answer questions about the processing.',
      },
    ],
    visual: {
      event:
        'A surface unfolds above the object as a dense wall of lines. It resolves into a short list of separate items; the first two reach down to what they describe — one to the data, one to the purpose around it — and then the rest light: withdrawal, rights, complaints, contact.',
      elements: [
        { name: 'The wall of lines', meaning: 'Legal text that hides the purpose.' },
        { name: 'The separate items', meaning: 'An itemised notice.' },
        { name: 'The line to the object', meaning: 'What personal data is being asked for.' },
        { name: 'The line to the frame', meaning: 'The purpose it is asked for.' },
        { name: 'The last items', meaning: 'Withdrawal, rights, complaints and contact.' },
      ],
      meaning:
        'A notice is a finite list of specific things, and it is understood before you answer.',
    },
    treatment: 'unfold',
    // An opener and four moments, one viewport each, then the summary.
    track: 6.5,
    source: 'Notice and transparency; Key concepts — Notice',
  },
  {
    id: 'consent',
    label: '06',
    actId: 'choice',
    stage: 'Consent',
    title: 'What makes a consent real',
    kicker: 'Five words, all of them load-bearing.',
    takeaway:
      'Consent must be free, specific, informed, unconditional and unambiguous — and given by a clear affirmative action.',
    // The brief and the failure cases are carried by the moments, each while
    // the stage shows the attempt it describes.
    brief: [],
    terms: [
      {
        term: 'Consent',
        definition:
          'A free, specific, informed, unconditional and unambiguous indication of agreement to processing for a specified purpose, given by a clear affirmative action.',
      },
    ],
    moments: [
      {
        id: 'term',
        term: 'Consent',
        mark: 'consent',
        plain:
          'Your agreement has to come from you, and pass all of it, before anything changes.',
      },
      {
        id: 'silence',
        tag: 'Unambiguous · clear affirmative action',
        title: 'Silence is not a yes',
        plain:
          'It is given by a clear affirmative action. Silence, inactivity, and a pre-ticked box are not agreement to anything.',
      },
      {
        id: 'uninformed',
        tag: 'Specific · informed',
        title: 'Not without knowing what for',
        plain:
          'Consent is for a specified purpose. Asked for without a notice the person could understand first, it fails the test.',
      },
      {
        id: 'bundled',
        tag: 'Free · unconditional',
        title: 'Not as the price of something else',
        plain:
          'Bundled into a contract for something unrelated, or forced by a take-it-or-leave-it wall where the Act expects a real choice, it fails the test.',
      },
      {
        id: 'given',
        tag: 'All of it',
        title: 'Your clear yes',
        mark: 'consent',
        plain:
          'Free, specific, informed, unconditional, unambiguous, and given by your own clear action. Only that changes the data.',
      },
    ],
    visual: {
      event:
        'Three checkpoints sit on the thread between you and your data. Would-be consents come down it one at a time: an empty one stops at the first, a fogged one at the second, one dragging something unrelated at the third. Then a real yes passes all three, and the data changes in place — it does not move.',
      elements: [
        { name: 'The thread', meaning: 'Consent has to come from you.' },
        { name: 'The first checkpoint', meaning: 'Unambiguous, by a clear affirmative action.' },
        { name: 'The second checkpoint', meaning: 'Specific and informed.' },
        { name: 'The third checkpoint', meaning: 'Free and unconditional.' },
        { name: 'The empty bead', meaning: 'Silence, inactivity, a pre-ticked box: nothing you did.' },
        { name: 'The fogged bead', meaning: 'Agreement without a notice you could understand.' },
        { name: 'The bead dragging a box', meaning: 'Consent bundled with something unrelated.' },
        { name: 'The changed material', meaning: 'Consent now attached to this data.' },
        { name: 'The solidified route', meaning: 'Processing that is now permitted.' },
      ],
      meaning:
        'Consent is a property of the data and the purpose, not a gate the data walked through — and only a real choice sets it.',
    },
    treatment: 'affirm',
    // An opener and five moments, one viewport each, then the summary.
    track: 7.5,
    source: 'Consent under the DPDP Act — Free and unconditional, Informed, Clear affirmative action; Key concepts — Consent',
  },
  {
    id: 'granularity',
    label: '07',
    actId: 'choice',
    stage: 'Purposes',
    title: 'One switch is not a choice',
    kicker: 'Purposes have to come apart.',
    takeaway:
      'Optional purposes such as analytics and advertising should be separable from the processing a service genuinely needs.',
    brief: [],
    moments: [
      {
        id: 'one-stream',
        title: 'One switch for everything?',
        plain:
          'Separating optional purposes from what is actually necessary is what makes accept, reject, or a purpose-by-purpose selection into a real decision rather than a formality.',
      },
      {
        id: 'separate',
        mark: 'purpose',
        title: 'Each purpose, its own stream',
        plain: 'Each request names its own purpose, which means each purpose can be answered on its own terms.',
      },
      {
        id: 'necessary',
        tag: 'Centre · necessary',
        title: 'What the service needs',
        plain: 'Processing that is actually necessary for the service is kept apart from the optional purposes.',
      },
      {
        id: 'optional',
        tag: 'Analytics · advertising',
        title: 'Optional, answered one by one',
        plain:
          'Optional purposes such as analytics and advertising should be separable. In this illustration you allow analytics (left) and decline advertising (right) — declining is a supported answer, not a failure.',
      },
      {
        id: 'vendors',
        title: 'Each stream reaches its own vendors',
        plain:
          'Optional scripts and vendors run only for the purposes your choice allows. One choice, answered purpose by purpose, reaches each kind of processing differently.',
      },
    ],
    visual: {
      event:
        'One thick stream below the object comes apart into three, each inside its own purpose. The centre — what the service needs — runs. The left — analytics, allowed in this illustration — lights in the consent tone and reaches its vendor. The right — advertising, declined — stays open but stops short of its vendor, which stays dark.',
      elements: [
        { name: 'The single thick stream', meaning: 'Every purpose behind one switch.' },
        { name: 'Each separate stream', meaning: 'One purpose, answerable by itself.' },
        { name: 'The centre stream', meaning: 'Processing necessary for the service.' },
        { name: 'The lit left stream', meaning: 'An optional purpose you allowed.' },
        { name: 'The dark, open right stream', meaning: 'An optional purpose you declined — still a valid outcome.' },
        { name: 'The small dashed boxes', meaning: 'Vendors and scripts that serve each purpose.' },
      ],
      meaning:
        'One decision can reach different kinds of processing differently — and declining part of it is a supported answer.',
    },
    treatment: 'split',
    // An opener and five moments, one viewport each, then the summary.
    track: 7.5,
    source: 'Consent — Granular choices and evidence; Consent management — What software can carry; Consent lifecycle — Consent applied',
  },

  // ───────────────────────────────── Act IV — What the choice does
  {
    id: 'record',
    label: '08',
    actId: 'consequence',
    stage: 'Record',
    title: 'The agreement has to be showable',
    kicker: 'Evidence, not memory.',
    takeaway:
      'What was asked, which notice version was shown, what you chose, and when — kept so that the consent can actually be demonstrated later.',
    // The brief is carried by the moments, each while the slip fills that field.
    brief: [],
    moments: [
      {
        id: 'press',
        title: 'A click is over in a moment',
        plain: 'The Act expects consent to be demonstrable in practice. In operational terms, that means a record.',
      },
      {
        id: 'seen',
        tag: 'What you saw',
        title: 'The request, and the notice shown',
        plain: 'The record holds the request and the version of the notice that was actually displayed.',
      },
      {
        id: 'decided',
        tag: 'What you decided',
        title: 'The decision, purpose by purpose',
        plain: 'The decision and the purposes it covers are stored as evidence.',
      },
      {
        id: 'when',
        tag: 'When',
        title: 'And the time it was made',
        plain:
          'With the time — and, in practice, an identifier for the record and the locale the notice was shown in, so it can be found and read back later.',
      },
      {
        id: 'version',
        tag: 'Which version',
        title: 'When the notice changes',
        plain:
          'Keep the earlier text, so the record can point at the notice the person actually saw. A record pointing at a notice nobody can produce proves very little.',
      },
    ],
    visual: {
      event:
        'Under the object a slip is filled in, one field at a time: a snapshot of the notice, linked to the version it was; the purposes, in the states you left them; a mark on a time rail with an identifier. Then the notice changes — a new version arrives, the old one moves down the shelf and stays, and the slip still points at it. Finally the slip is filed beside the route, where it stays.',
      elements: [
        { name: 'The slip', meaning: 'The consent record.' },
        { name: 'The snapshot', meaning: 'What you were shown.' },
        { name: 'The shelf of sheets', meaning: 'Notice versions, old ones kept.' },
        { name: 'The line to the old sheet', meaning: 'The record points at the version you saw.' },
        { name: 'The three purpose marks', meaning: 'What you decided, purpose by purpose.' },
        { name: 'The time rail and strip', meaning: 'When, and an identifier for the record.' },
        { name: 'The filed mark', meaning: 'Evidence that outlives the moment of choice.' },
      ],
      meaning:
        'Consent is not just a click. The decision becomes a thing that exists independently of anyone remembering it — and the past it points to is kept, not rewritten.',
    },
    treatment: 'ledger',
    // An opener and five moments, one viewport each, then the summary.
    track: 7.5,
    source: 'Consent — Granular choices and evidence; Notice — earlier versions; Consent lifecycle — Consent recorded; How ConsentGuru helps — Consent records and receipts, Policy versioning',
  },
  {
    id: 'enforcement',
    label: '09',
    actId: 'consequence',
    stage: 'Applied',
    title: 'The record has to actually hold',
    kicker: 'A stored choice that nothing obeys is decoration.',
    takeaway:
      'Optional scripts, vendors and downstream systems should run only for the purposes your record allows.',
    brief: [],
    moments: [
      {
        id: 'reach',
        tag: 'Consent applied',
        title: 'The choice has to reach what runs',
        plain:
          'Between the decision and the processing sits enforcement. The recorded choice has to reach the tags, apps and vendors that would otherwise start running.',
      },
      {
        id: 'told',
        title: 'Left uninformed, they assume',
        plain:
          'Downstream systems have to be told which purposes are allowed. Here, the stations your record covers let the data through; the rest refuse.',
      },
    ],
    visual: {
      event:
        'The object passes a line of stations inside the purpose frame. Stations covered by the record let it through; the rest visibly refuse.',
      elements: [
        { name: 'Each station', meaning: 'A script, vendor, or downstream system.' },
        { name: 'A passing station', meaning: 'A purpose the record allows.' },
        { name: 'A refusing station', meaning: 'A purpose the record does not allow.' },
      ],
      meaning:
        'The record is not a filing cabinet. It is an instruction that things obey.',
    },
    treatment: 'gate',
    // An opener and two moments, one viewport each, then the summary.
    track: 4.5,
    source: 'Consent management — What software can carry; How ConsentGuru helps — Script and SDK control',
  },
  {
    id: 'withdrawal',
    label: '10',
    actId: 'consequence',
    stage: 'Withdrawal',
    title: 'You can change your mind',
    kicker: 'And it has to be as easy as saying yes was.',
    takeaway:
      'Withdrawal must be as easy as giving consent. Processing that was lawful before stays lawful; processing that relied on the consent has to stop.',
    // Every sentence of the brief is carried by a moment below.
    brief: [],
    moments: [
      {
        id: 'change',
        tag: 'At any time',
        title: 'I changed my mind',
        plain:
          'The Data Principal may withdraw consent at any time, and withdrawing should be as easy as giving it was.',
        action: {
          kind: 'withdraw',
          label: 'Withdraw consent',
          doneLabel: 'Consent withdrawn',
          hint: 'Or keep scrolling — the story withdraws it for you.',
          doneHint: 'Withdrawn. Scroll on to see what changes.',
        },
      },
      {
        id: 'stop',
        tag: 'Going forward',
        title: 'What relied on it stops',
        plain:
          'The fiduciary must stop the processing that relied on that consent, unless another lawful ground applies. In this illustration analytics relied on it and stops; the centre stream did not, and runs on.',
      },
      {
        id: 'record',
        tag: 'The record',
        title: 'The new decision is recorded',
        plain:
          'The new decision is stored — filed on top of the old record, which stays — and sent to the systems that were connected.',
      },
      {
        id: 'systems',
        tag: 'Connected systems',
        title: 'Everything downstream is told',
        plain:
          'The updated decision reaches each system that was connected, and what relied on the consent stops there — one after another, not all at once.',
      },
      {
        id: 'past',
        tag: 'Not a rewind',
        title: 'What was done before stays lawful',
        plain: 'Withdrawal does not make earlier lawful processing unlawful. The route already travelled stays as it was.',
      },
      {
        id: 'erasure',
        tag: 'Not the same as deletion',
        title: 'Withdrawn is not the same as erased',
        plain:
          'The fiduciary must erase the data where the Act requires erasure — when consent is withdrawn or the specified purpose is no longer served, unless retention is necessary for compliance with law. The data is still here, hollowed.',
      },
    ],
    visual: {
      event:
        'A withdrawal comes down the same thread the yes came down, with nothing to pass. The data drains in place — it keeps its shape, hollowed. The stream that relied on consent is stopped and its vendor goes dark; the centre stream runs on. A new slip is filed on top of the old record, and the connected stations go dark one after another. The route already travelled stays.',
      elements: [
        { name: 'The withdrawal bead', meaning: 'Your withdrawal — down the same thread as your yes.' },
        { name: 'The drained material', meaning: 'Consent no longer attached.' },
        { name: 'The stopped stream', meaning: 'Processing that relied on consent, stopped.' },
        { name: 'The centre stream', meaning: 'Processing that did not rely on it, continuing.' },
        { name: 'The new slip on the record', meaning: 'The updated decision, filed over the old one, which stays.' },
        { name: 'The darkening sequence', meaning: 'Connected systems told, in order.' },
        { name: 'The route already travelled', meaning: 'Processing done lawfully before withdrawal, which stays lawful.' },
        { name: 'The hollowed object, still there', meaning: 'Withdrawal is not the same as erasure.' },
      ],
      meaning:
        'Withdrawal works forwards. It stops what relied on consent, updates the record, reaches every connected system — and it does not rewrite the past or, by itself, make the data disappear.',
    },
    treatment: 'reverse',
    // An opener and six moments, one viewport each, then the summary.
    track: 8.5,
    source: 'Consent — Withdrawal; FAQ — Can consent be withdrawn, What happens when a user withdraws consent; Data Principal rights — Erasure; Consent lifecycle — Change or withdraw, Consent updated; Consent management — What software can carry',
  },

  // ───────────────────────────────── Act V — Who owes what
  {
    id: 'rights',
    label: '11',
    actId: 'obligation',
    stage: 'Rights',
    title: 'What you can ask for',
    kicker: 'Five rights, plus the one you just used.',
    takeaway:
      'Access, correction, erasure, grievance redressal and nomination — exercised with the Data Fiduciary, with a path onward to the Data Protection Board.',
    // Each right is its own moment; the brief is carried there.
    brief: [],
    depth: {
      summary: 'Conditions worth knowing',
      points: ['Several of these rights depend on the manner and timelines prescribed in the Rules.'],
    },
    moments: [
      {
        id: 'access',
        tag: 'Access',
        title: 'Ask what is being done with it',
        plain:
          'You may ask for a summary of the personal data being processed and the processing activities undertaken — and for the identities of other fiduciaries and processors it has been shared with.',
      },
      {
        id: 'correction',
        tag: 'Correction',
        title: 'Ask for it to be put right',
        plain: 'You may ask for inaccurate data to be corrected, incomplete data completed, and data updated.',
      },
      {
        id: 'erasure',
        tag: 'Erasure',
        title: 'Ask for it to be erased',
        plain:
          'You may ask for erasure. It must happen when consent is withdrawn or the specified purpose is no longer served — unless retention is necessary for compliance with law.',
      },
      {
        id: 'grievance',
        tag: 'Grievance',
        title: 'Complain — and go further',
        plain:
          'A grievance goes to the Data Fiduciary, which is expected to respond within the prescribed period, and there is a path onward to the Data Protection Board.',
      },
      {
        id: 'nomination',
        tag: 'Nomination',
        title: 'Name someone to act for you',
        plain: 'You may nominate someone to exercise your rights if you die or become incapable.',
      },
      {
        id: 'withdraw',
        tag: 'Withdrawal',
        title: 'And the one you just used',
        plain: 'Withdrawal of consent, from the previous chapter, is a consent right that sits alongside these.',
      },
    ],
    visual: {
      event:
        'The view comes back up the thread to you. Around you, six small tools sit in a ring, each joined to you by a line. As each right is named its tool comes closer and does one quiet thing: a summary comes up to you; a missing edge is completed; a shape fades inside a bracket; a pulse goes on to the Board; a second ring firms up beside yours; a bead goes down a short thread. Then the view widens, and lines from you reach every place your data went.',
      elements: [
        { name: 'The ring of tools around you', meaning: 'Your rights — things you can do.' },
        { name: 'The sheet coming up to you', meaning: 'Access: a summary of what is processed.' },
        { name: 'The completed edge', meaning: 'Correction and completion.' },
        { name: 'The shape fading in a bracket', meaning: 'Erasure, in the situations described.' },
        { name: 'The path to the double square', meaning: 'A grievance, and the path on to the Board.' },
        { name: 'The second ring', meaning: 'Someone you nominate.' },
        { name: 'The bead and stop', meaning: 'Withdrawal of consent.' },
        { name: 'The lines from you', meaning: 'Rights reach the places your data actually went.' },
      ],
      meaning:
        'A right is not abstract. Each one is something you can do — and it reaches specific places the data actually went.',
    },
    treatment: 'radial',
    // An opener and six moments, one viewport each, then the summary.
    track: 8.5,
    source: 'Data Principal rights',
  },
  {
    id: 'duties',
    label: '12',
    actId: 'obligation',
    stage: 'Duties',
    title: 'The other end of every line',
    kicker: 'Consent is one duty among several.',
    takeaway:
      'The Data Fiduciary owes lawful processing, reasonable security, accuracy where decisions depend on it, honoured withdrawal, a working rights queue, valid processor contracts, and deletion when the purpose ends.',
    // Each duty is its own moment; the brief is carried there.
    brief: [],
    depth: {
      summary: 'About penalties',
      points: [
        'The Schedule to the Act sets monetary penalties. The highest amount stated for specified failures — including failure to observe reasonable security safeguards, and failure to observe obligations in relation to children — is up to ₹250 crore.',
        'Other breaches have lower ceilings.',
        'A penalty follows an inquiry by the Data Protection Board. It is not an automatic fine for a missing cookie category.',
      ],
    },
    moments: [
      {
        id: 'banner',
        tag: 'Consent handling',
        title: 'Not a consent-banner law',
        plain:
          'Asking properly, recording the answer and honouring withdrawal are one duty among several. A complete consent banner answers none of the others.',
      },
      {
        id: 'lawful',
        tag: 'Lawful processing',
        title: 'A lawful ground for every purpose',
        plain:
          'Consent, or a legitimate use the Act itself lists — decided and documented purpose by purpose, not declared once for the whole organisation.',
      },
      {
        id: 'security',
        tag: 'Security',
        title: 'Keep it safe',
        plain:
          'Reasonable security safeguards — and, after a breach, intimation to the Data Protection Board and to each affected person.',
      },
      {
        id: 'accuracy',
        tag: 'Accuracy',
        title: 'Keep it right where it matters',
        plain: 'Accuracy where the data drives a decision or is shared on.',
      },
      {
        id: 'rights',
        tag: 'Rights and grievances',
        title: 'Answer the person',
        plain:
          'A working way to handle the rights from the last chapter, and a response to grievances within the prescribed period.',
      },
      {
        id: 'processors',
        tag: 'Processors',
        title: 'Contracts with the vendors it engages',
        plain: 'A Data Processor may be engaged only under a valid contract. Engaging one does not move the duties.',
      },
      {
        id: 'retention',
        tag: 'Retention and deletion',
        title: 'Not forever',
        plain: 'A retention schedule teams can follow, and deletion when the purpose ends.',
      },
      {
        id: 'significant',
        tag: 'Significant Data Fiduciaries',
        title: 'Some organisations carry more',
        plain:
          'The Central Government may designate Significant Data Fiduciaries by volume, sensitivity and risk. They carry more: a Data Protection Officer based in India, an independent data auditor, periodic assessments. Only the Government designates — this page cannot tell you who is.',
      },
    ],
    visual: {
      event:
        'The view turns to the organisation. The fiduciary sits at the centre of its own ring of duties — consent handling lights first, alone, then six more arrive around it. As each is named it comes closer; rights reach back to you, processors to the vendor. Below, inside a dashed bracket, three more duties appear for organisations the Government designates.',
      elements: [
        { name: 'The ring around the fiduciary', meaning: 'What the organisation owes — your ring of rights, from the other end.' },
        { name: 'The checkpoint and bead', meaning: 'Consent handling: one duty of seven.' },
        { name: 'The barred fork', meaning: 'Lawful processing.' },
        { name: 'The enclosed data', meaning: 'Security safeguards.' },
        { name: 'Two identical shapes', meaning: 'Accuracy where data is relied on or shared.' },
        { name: 'The line back to you', meaning: 'Rights and grievances, answered.' },
        { name: 'The contract between blocks', meaning: 'Processor relationships.' },
        { name: 'The route held in a bracket', meaning: 'Retention, then deletion.' },
        { name: 'The dashed bracket below', meaning: 'Additional duties, only for designated Significant Data Fiduciaries.' },
      ],
      meaning:
        'Most of what the Act requires is never triggered by a visitor clicking anything. Consent is one node on the ring.',
    },
    treatment: 'counterpart',
    // An opener and eight moments, one viewport each, then the summary.
    track: 10.5,
    source: 'Data Fiduciary responsibilities; Significant Data Fiduciaries; Quick overview — A lawful basis; Penalties are decided by the Board',
  },

  // ───────────────────────────────── Act VI — Where the rules tighten
  {
    id: 'children',
    label: '13',
    actId: 'stricter',
    stage: 'Children',
    title: 'Under eighteen changes the rules',
    kicker: 'Verifiable consent, and some processing simply switched off.',
    takeaway:
      'A child’s data needs verifiable consent from a parent or lawful guardian, and tracking, behavioural monitoring and targeted advertising directed at children are not permitted.',
    // Carried by the moments below, one idea at a time.
    brief: [],
    moments: [
      {
        id: 'child',
        tag: 'Under 18',
        title: 'A child’s data is held more closely',
        plain: 'A child is a person under eighteen.',
      },
      {
        id: 'guardian',
        tag: 'Verifiable consent',
        title: 'A parent or guardian decides',
        plain:
          'Before processing a child’s personal data, the Data Fiduciary must obtain verifiable consent of a parent or lawful guardian. The same applies to a person with a disability who has a lawful guardian.',
      },
      {
        id: 'restricted',
        tag: 'Not permitted',
        title: 'Some things stay out',
        plain:
          'A fiduciary must not undertake processing likely to cause any detrimental effect on the well-being of a child, and must not undertake tracking, behavioural monitoring, or targeted advertising directed at children.',
      },
      {
        id: 'prescribed',
        tag: 'Prescribed',
        title: 'Checked the way the Rules say',
        plain:
          'The manner of verification is prescribed. A self-declared age is a weak signal; where the Rules require a particular check, that check is the one to follow. Exemptions, where they exist, are prescribed — they are not a default.',
      },
    ],
    visual: {
      event:
        'A double wall closes around the object, inside its purpose — a room, not an alarm. A guardian appears above; their consent comes down their own thread through a single check and into the room. Four reaches from outside are stopped at the wall, with the guardian’s line still connected. Then the check is singled out, beside the rule it follows.',
      elements: [
        { name: 'The double wall', meaning: 'Additional protection for a child’s data.' },
        { name: 'The second person mark', meaning: 'A parent or lawful guardian.' },
        { name: 'The ring on their thread', meaning: 'Verification, in the manner prescribed.' },
        { name: 'The bead through it', meaning: 'Verifiable consent from the guardian.' },
        {
          name: 'The reaches stopped at the wall',
          meaning: 'Detrimental processing, tracking, behavioural monitoring, targeted advertising directed at children.',
        },
        { name: 'The slip beside the ring', meaning: 'The prescribed rule the check follows.' },
      ],
      meaning:
        'This is not the ordinary rule with an extra step: a guardian decides, the check is prescribed, and some processing is not permitted at all.',
    },
    treatment: 'threshold',
    // An opener and four moments, one viewport each, then the summary.
    track: 6.5,
    source: 'Children’s data (Section 9); Key concepts — Children',
  },
  {
    id: 'consent-manager',
    label: '14',
    actId: 'stricter',
    stage: 'Manager',
    title: 'A Consent Manager is not a consent tool',
    kicker: 'One is a registered role. One is software.',
    takeaway:
      'A Consent Manager is a person registered with the Data Protection Board and accountable to you. A consent management platform is software a fiduciary deploys. Using the software does not create the role.',
    // Carried by the moments below, one distinction at a time.
    brief: [],
    caution:
      'Interoperability is a standards and registration question, not a claim a single vendor can settle alone.',
    terms: [
      {
        term: 'Consent Manager',
        definition:
          'A person registered with the Data Protection Board who enables a Data Principal to give, manage, review and withdraw consent through an accessible, transparent and interoperable platform, and who is accountable to the Data Principal.',
      },
    ],
    moments: [
      {
        id: 'alike',
        tag: 'Easily confused',
        title: 'Two things that look the same',
        plain:
          'Both carry consent records about your data, and both let consents be reviewed and changed. That is why the two names get swapped. They should not be.',
      },
      {
        id: 'manager',
        term: 'Consent Manager',
        plain:
          'A statutory role, accountable to you — not only to the company that collected the data.',
      },
      {
        id: 'reach',
        tag: 'One place',
        title: 'Your consents, across organisations',
        plain:
          'Through it you can issue consent for a specified purpose instead of only through each company’s own form, see the consents you have given, and review or withdraw them in the same place as you gave them.',
      },
      {
        id: 'platform',
        tag: 'Consent management platform',
        title: 'A tool the fiduciary runs',
        plain:
          'Software a Data Fiduciary deploys on its own properties: banners, a preference centre, records, signals to connected systems.',
      },
      {
        id: 'qualification',
        tag: 'Not the same thing',
        title: 'Using the software creates no role',
        plain:
          'Deploying a consent management platform registers nobody with the Board, and the legal duty stays with the fiduciary. Publishing a banner does not by itself make an organisation compliant.',
      },
    ],
    visual: {
      event:
        'Two identical holders sit side by side above the data, each with a record. A divider appears and they separate. One goes to your side — joined to you, registered with the Board — and reaches across to several organisations. The other settles inside the organisation’s boundary, beside the fiduciary that runs it. A line from it toward the Board is stopped.',
      elements: [
        { name: 'The two identical holders', meaning: 'Why the terms are so easily confused.' },
        { name: 'The divider', meaning: 'Related ideas, different worlds.' },
        { name: 'The holder on your side', meaning: 'A registered Consent Manager, accountable to you.' },
        { name: 'The double square above it', meaning: 'Registration with the Data Protection Board.' },
        { name: 'The lines across to several blocks', meaning: 'One place to manage consents with many organisations.' },
        { name: 'The holder inside the boundary', meaning: 'A consent management platform: the fiduciary’s software.' },
        { name: 'The stopped line toward the Board', meaning: 'Deploying the software registers nobody.' },
      ],
      meaning:
        'These terms are not interchangeable: one is a registered role accountable to you, the other is a tool an organisation runs — and running it creates no role and settles no duty.',
    },
    treatment: 'custody',
    // An opener and five moments, one viewport each, then the summary.
    track: 7.5,
    source: 'Consent Manager (statutory role); Quick overview — Two different roles; Legal notice',
  },

  // ───────────────────────────────── Act VII — The whole system
  {
    id: 'system',
    label: '15',
    actId: 'whole',
    stage: 'System',
    title: 'It was one system all along',
    kicker: 'Everything you met, in one view — and an honest account of what it does not cover.',
    takeaway:
      'The consent lifecycle runs notice → request → your choice → recorded → applied → change or withdraw → updated. It is a workflow, not the whole of the Act, and the legal duty stays with the Data Fiduciary throughout.',
    // Synthesis: the moments gather what the story already said.
    brief: [],
    moments: [
      {
        id: 'lifecycle',
        tag: 'The lifecycle',
        title: 'Seven steps, and you saw every one',
        plain:
          'Notice → consent request → your choice → consent recorded → consent applied → change or withdraw → consent updated. Each lit point is where the story showed that step.',
      },
      {
        id: 'beyond',
        tag: 'Not the whole Act',
        title: 'A workflow inside wider duties',
        plain:
          'Those seven steps are a consent workflow, not a complete map of every duty: security, retention, processor contracts, breach intimation and children’s data all sit outside the banner. The duty stays with the Data Fiduciary throughout.',
      },
      {
        id: 'rules',
        tag: 'Check the source',
        title: 'The rules keep moving',
        plain:
          'Rules notified under the Act prescribe forms, timelines and safeguards, and some obligations take effect on dates the Central Government notifies. Check the official text and the latest notification before treating anything here as the rule that binds you today.',
      },
      {
        id: 'person',
        tag: 'Where it started',
        title: 'And it all points back to a person',
        plain:
          'Every step on this route was about one piece of personal data — information that points back at someone. In this story, that was you.',
      },
      {
        id: 'closing',
        title: 'It was never just a banner.',
        plain: 'It is a lifecycle, inside a wider set of duties, about a person.',
      },
    ],
    caution:
      'This is a general explanation, not legal advice, a legal opinion, or a compliance certification. Publishing a banner does not by itself make an organisation compliant.',
    visual: {
      event:
        'A single line in your data’s tone traces the seven lifecycle steps through the places the story showed them — notice, checkpoints, purpose streams, record, stations, withdrawal — and climbs back to the record for the update, closing into a loop. The view widens to bring back what sits outside it: the organisation’s ring of duties, the children’s room, the two worlds of chapter 14, a dashed boundary around everything. Then it rises up the thread to you, and settles on the whole system, still.',
      elements: [
        { name: 'The line in the data’s tone', meaning: 'The consent lifecycle.' },
        { name: 'The seven lit rings', meaning: 'Where each step happened in the story.' },
        { name: 'The loop back to the record', meaning: 'Consent updated: the cycle closes.' },
        { name: 'Everything around the line', meaning: 'Duties the lifecycle does not reach.' },
        { name: 'The thread up to you', meaning: 'Every step was about one person.' },
        { name: 'Your object', meaning: 'The single piece of data you followed, where you last left it.' },
      ],
      meaning:
        'The story was one continuous system, and the banner was only part of it.',
    },
    treatment: 'assembly',
    // An opener and five moments, one viewport each, then the summary.
    track: 7.5,
    source: 'Consent lifecycle; Legal notice; Introduction — Rules notified under the Act',
  },
]

export const chapterCount = chapters.length

/** Chapter ids grouped by act, in story order. */
export const chaptersByAct = chapters.reduce<Record<string, Chapter[]>>(
  (grouped, chapter) => {
    ;(grouped[chapter.actId] ??= []).push(chapter)
    return grouped
  },
  {},
)
