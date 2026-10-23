import type { DetailChapter, Law } from '../law'
import type { Station } from '../stations'

/**
 * The California Consumer Privacy Act, as amended by the California Privacy
 * Rights Act, on the same eight-station route. California's model is mostly
 * notice and opt-out, so where a station's idea has no direct counterpart
 * (a lawful basis, an opt-in default) it shows California's own rule in that
 * place. Every line paraphrases the statute (Cal. Civ. Code §1798.100 ff.) or
 * the CPPA's regulations (Cal. Code Regs. tit. 11, §7000 ff.).
 */

const stations: Station[] = [
  {
    id: 'people',
    number: '01',
    label: 'People',
    title: 'Your information, and who holds it',
    takeaway:
      'Personal information is anything that identifies, or could reasonably be linked to, you or your household. The law covers California residents and the businesses that meet its thresholds.',
    points: [
      { title: 'You are the consumer', body: 'A natural person who is a California resident.' },
      { title: 'The business decides', body: 'It determines the purposes and means of processing, and meets a threshold.' },
      { title: 'A service provider works for it', body: 'Under a written contract that limits what it may do with the data.' },
    ],
    control: {
      prompt: 'Who is who?',
      kind: 'single',
      options: [
        { id: 'principal', label: 'You', result: 'The consumer: a natural person who is a California resident, including as an employee, job applicant or business contact.' },
        { id: 'fiduciary', label: 'Business', result: 'The business determines why and how personal information is processed, and meets a threshold: revenue over $25 million (adjusted for inflation), 100,000 or more consumers or households, or half its revenue from selling or sharing.' },
        { id: 'processor', label: 'Service provider', result: 'A service provider or contractor processes for a business purpose under a written contract that limits its use. Handing it data under that contract is not a sale.' },
      ],
    },
    chapters: ['ccpa-info', 'ccpa-roles'],
    marks: ['principal', 'data', 'fiduciary', 'processor'],
  },
  {
    id: 'reason',
    number: '02',
    label: 'Purpose',
    title: 'Told at collection, used as expected',
    takeaway:
      'California lists no lawful bases. It asks for notice at collection, and use that is reasonably necessary and proportionate to the purposes disclosed.',
    points: [
      { title: 'Notice at collection', body: 'What is collected, why, and whether it is sold or shared, at or before collection.' },
      { title: 'Reasonable expectations', body: 'Use must fit what an average consumer would expect, or a compatible disclosed purpose.' },
      { title: 'New purpose, new consent', body: 'An unrelated or incompatible purpose needs your consent first.' },
    ],
    control: {
      prompt: 'Pick the route your data takes',
      kind: 'single',
      options: [
        { id: 'consent', label: 'Disclosed purpose', result: 'Used for a purpose you were told about at collection, as far as is reasonably necessary and proportionate. This route lights.', tone: 'grant' },
        { id: 'legitimate', label: 'Compatible purpose', result: 'Another disclosed purpose, compatible with the context in which the information was collected.', tone: 'neutral' },
        { id: 'shortcut', label: 'Unrelated purpose', result: 'Refused. A purpose unrelated to, or incompatible with, why it was collected needs your consent before it runs.', tone: 'refuse' },
      ],
    },
    chapters: ['ccpa-purpose'],
    marks: ['data', 'purpose', 'consent'],
  },
  {
    id: 'consent',
    number: '03',
    label: 'Consent',
    title: 'When California does ask for consent',
    takeaway:
      'Most processing runs on notice and opt-out. Where consent is required, it must be freely given, specific, informed and unambiguous, and a dark pattern voids it.',
    points: [
      { title: 'Where it applies', body: 'A minor’s data sold or shared, financial incentives, opting back in, unrelated new purposes.' },
      { title: 'A clear action', body: 'Hovering over, muting, pausing or closing content is not consent.' },
      { title: 'No dark patterns', body: 'Agreement obtained through a dark pattern is not consent.' },
    ],
    control: {
      prompt: 'Send a consent through the three checks',
      kind: 'single',
      startEmpty: true,
      options: [
        { id: 'silence', label: 'Closed the pop-up', result: 'Stopped at check 1. Hovering over, muting, pausing or closing a piece of content is not consent.', tone: 'refuse' },
        { id: 'uninformed', label: 'Accepted the terms', result: 'Stopped at check 2. Accepting general terms of use that bury the processing among unrelated matters is not consent.', tone: 'refuse' },
        { id: 'bundled', label: 'Dark pattern', result: 'Stopped at check 3. Agreement obtained through a dark pattern, such as a confusing or lopsided choice, is not consent.', tone: 'refuse' },
        { id: 'given', label: 'Clear yes', result: 'Passes all three. Your data changes in place: consent is now attached to it.', tone: 'grant' },
      ],
    },
    chapters: ['ccpa-consent'],
    marks: ['data', 'consent', 'purpose'],
  },
  {
    id: 'purposes',
    number: '04',
    label: 'Opt-out',
    title: 'On, until you opt out',
    takeaway:
      'California works the other way round: once you have been told, selling and sharing may run until you opt out. A browser opt-out signal counts as a request.',
    points: [
      { title: 'Do Not Sell or Share', body: 'A clear link, or an alternative the law allows, to opt out of both.' },
      { title: 'Signals count', body: 'An opt-out preference signal such as Global Privacy Control must be honoured.' },
      { title: 'Sharing means ads', body: 'Disclosure for cross-context behavioural advertising, paid or not.' },
    ],
    control: {
      prompt: 'Your choices',
      kind: 'toggle',
      options: [
        { id: 'business', label: 'Business purposes', vendor: 'service provider', defaultOn: true, result: 'Disclosure to a service provider, for a business purpose, under contract.' },
        { id: 'sell', label: 'Selling', vendor: 'data buyer', defaultOn: true, result: 'Selling runs: its stream reaches the third party.', tone: 'grant' },
        { id: 'share', label: 'Sharing for ads', vendor: 'ad network', defaultOn: true, result: 'Sharing runs: its stream reaches the ad network.', tone: 'grant' },
      ],
      locked: [{ id: 'business', reason: 'Disclosure to a service provider under a compliant contract is not a sale or a share, so there is no opt-out for it.' }],
      declined: 'Opted out: {list}. That stream stops before its third party, which stays dark. The business has 15 business days to stop.',
      allowed: 'Nothing opted out: once you were told at collection, selling and sharing run by default. Switch one off to opt out.',
    },
    chapters: ['ccpa-optout'],
    marks: ['data', 'purpose', 'processor'],
  },
  {
    id: 'withdrawal',
    number: '05',
    label: 'Record',
    title: 'Opted out, and it holds',
    takeaway:
      'An opt-out is passed on to the third parties that received your data, kept on record, and respected for at least 12 months before you can be asked again.',
    points: [
      { title: 'Passed on', body: 'Third parties it sold or shared with after your request are told to comply.' },
      { title: 'Twelve months', body: 'No asking you to opt back in for at least a year.' },
      { title: 'Not a deletion', body: 'Past disclosures are not unwound. Deleting is a separate right.' },
    ],
    control: {
      prompt: 'Change your mind',
      kind: 'single',
      options: [
        { id: 'given', label: 'Not opted out', result: 'Selling and sharing run, as the notice at collection said they would.', tone: 'neutral' },
        { id: 'withdrawn', label: 'Opt out', result: 'Opted out. Your request is filed on the record, kept for 24 months. The selling stream stops and the third parties are told in turn; the service runs on. Your data is still there unless you ask to delete it.', tone: 'refuse' },
      ],
    },
    chapters: ['ccpa-record'],
    marks: ['record', 'consent', 'data'],
  },
  {
    id: 'rights',
    number: '06',
    label: 'Rights',
    title: 'Your rights. Their duties.',
    takeaway:
      'You can know, delete, correct, opt out and limit, without retaliation for using any of them. The business owes far more than a footer link.',
    points: [
      { title: 'Answered in 45 days', body: 'Extendable once by another 45 days, with notice to you.' },
      { title: 'Enforced', body: 'By the California Privacy Protection Agency and the Attorney General.' },
      { title: 'Some carry more', body: 'Risk assessments and cybersecurity audits, where the regulations’ tests are met.' },
    ],
    control: {
      prompt: 'See it from either end',
      kind: 'single',
      options: [
        { id: 'rights', label: 'Your rights', result: 'Know, delete, correct, opt out, limit, and no retaliation for using them, each a line from you to where your data went.' },
        { id: 'duties', label: 'Their duties', result: 'Honouring opt-outs, notice at collection, a privacy policy, answering requests, reasonable security, contracts and minimisation, with opt-outs one node of seven.' },
      ],
    },
    chapters: ['ccpa-rights', 'ccpa-duties'],
    marks: ['principal', 'right', 'fiduciary'],
  },
  {
    id: 'stricter',
    number: '07',
    label: 'Stricter',
    title: 'Where the rules tighten',
    takeaway:
      'A minor’s data cannot be sold or shared without an opt-in. Sensitive personal information can be limited to what the service needs.',
    points: [
      { title: 'Under 16: opt in', body: 'Ages 13 to 15 opt in themselves; under 13, a parent or guardian does.' },
      { title: 'Knowing the age', body: 'Wilfully disregarding a consumer’s age counts as knowing it.' },
      { title: 'Limit sensitive use', body: 'Precise location, health, biometrics, account logins and more.' },
    ],
    control: {
      prompt: 'Look closer at',
      kind: 'single',
      options: [
        { id: 'minors', label: 'Minors', result: 'A double wall around a minor’s data. Only an affirmative opt-in, from the teen or, under 13, a parent or guardian, comes through the check; selling and sharing are stopped at the wall.' },
        { id: 'sensitive', label: 'Sensitive data', result: 'A double wall around sensitive information you have asked to limit. Uses necessary for what you asked for come through the check; inferring traits and other uses are stopped at the wall.' },
      ],
    },
    chapters: ['ccpa-minors', 'ccpa-sensitive'],
    marks: ['principal', 'data', 'record'],
  },
  {
    id: 'system',
    number: '08',
    label: 'System',
    title: 'It was never just a link',
    takeaway:
      'Notice, opt-out offered, your request, recorded, applied, passed on, held: a lifecycle inside the business’s wider duties, about a person.',
    points: [
      { title: 'A workflow, not the statute', body: 'Security, contracts, access requests and assessments sit outside the link.' },
      { title: 'Other states', body: 'Many US states now have privacy laws of their own, each a little different.' },
      { title: 'Check the source', body: 'The Agency’s regulations keep moving. Read the official text.' },
    ],
    control: {
      prompt: 'Walk the lifecycle',
      kind: 'single',
      options: [
        { id: 'notice', label: 'Notice', result: 'Notice at collection: what is collected, why, and whether it is sold or shared.' },
        { id: 'offered', label: 'Opt-out offered', result: 'A Do Not Sell or Share link, or an allowed alternative, where you can use it.' },
        { id: 'request', label: 'Your request', result: 'Your request: a click on the link, or a signal your browser sends.' },
        { id: 'recorded', label: 'Recorded', result: 'Recorded: the request and the response, kept for 24 months.' },
        { id: 'applied', label: 'Applied', result: 'Applied: selling and sharing stop, within 15 business days.' },
        { id: 'passed', label: 'Passed on', result: 'Passed on: third parties are told to comply.' },
        { id: 'held', label: 'Held', result: 'Held: at least 12 months before you are asked to opt back in.' },
      ],
    },
    chapters: ['ccpa-system'],
    marks: ['data', 'record', 'consent'],
  },
]

const chapters: DetailChapter[] = [
  {
    id: 'ccpa-info',
    kicker: 'Start with the thing the law is about.',
    title: 'Personal information, and who it protects',
    takeaway:
      'Personal information is information that identifies, relates to, describes, or could reasonably be linked with a particular consumer or household, online or off.',
    moments: [
      {
        id: 'term',
        tag: 'Personal information',
        title: 'Linked, or linkable',
        plain: 'Names and emails, but also device IDs, browsing history, inferences drawn to build a profile, and household-level data.',
      },
      {
        id: 'consumer',
        tag: 'Consumer',
        title: 'A California resident',
        plain: 'Since 2023 that includes employees, job applicants and business-to-business contacts, whose earlier exemptions have expired.',
      },
    ],
    brief: [
      'Publicly available information, and information that is deidentified or aggregate, is outside the definition.',
    ],
    source: 'Cal. Civ. Code §1798.140 (definitions of personal information and consumer)',
  },
  {
    id: 'ccpa-roles',
    kicker: 'Who the data is about, who decides, who receives it.',
    title: 'Business, service provider, third party',
    takeaway:
      'A business decides why and how information is processed. A service provider or contractor acts for it under contract. Anyone else who receives the data is a third party, and disclosure to them can be a sale or a share.',
    brief: [
      'A for-profit business is covered if it does business in California and has annual gross revenue over $25 million (adjusted for inflation), buys, sells or shares the personal information of 100,000 or more consumers or households, or earns at least half its annual revenue from selling or sharing it.',
      'The service provider contract must forbid selling or sharing the data, using it outside the direct business relationship, or combining it with other data except as the regulations allow, and must require the same level of protection.',
    ],
    source: 'Cal. Civ. Code §1798.140 (business, service provider, contractor, third party); CCPA Regulations §7051',
  },
  {
    id: 'ccpa-purpose',
    kicker: 'California has no list of lawful bases.',
    title: 'Notice at collection, and purpose limits',
    takeaway:
      'At or before collection, a business tells you the categories it collects, the purposes, whether it sells or shares them, and how long it keeps them. Its use must then be reasonably necessary and proportionate to those purposes.',
    brief: [
      'Whether a use is within your reasonable expectations depends on your relationship with the business, the type and source of the information, how it is collected, and how specific the disclosure was.',
      'Using personal information for a purpose unrelated to, or incompatible with, the purposes it was collected for requires your consent first.',
    ],
    source: 'Cal. Civ. Code §1798.100(a) and (c); CCPA Regulations §§7002 and 7012',
  },
  {
    id: 'ccpa-consent',
    kicker: 'Rare, but strict where it applies.',
    title: 'Consent, as California defines it',
    takeaway:
      'Consent is a freely given, specific, informed and unambiguous indication of your wishes, by a statement or a clear affirmative action, for a narrowly defined purpose.',
    moments: [
      { id: 'where', tag: 'Where', title: 'When it is needed', plain: 'Selling or sharing a minor’s data, joining a financial incentive programme, opting back in after opting out, and processing for an unrelated or incompatible purpose.' },
      { id: 'action', tag: 'Check 1', title: 'A clear affirmative act', plain: 'Hovering over, muting, pausing or closing a given piece of content is not consent.' },
      { id: 'specific', tag: 'Check 2', title: 'Specific', plain: 'Acceptance of general or broad terms of use, or a similar document mixing processing with unrelated information, is not consent.' },
      { id: 'pattern', tag: 'Check 3', title: 'No dark patterns', plain: 'Agreement obtained through a dark pattern, an interface that subverts or impairs your choice, is not consent.' },
    ],
    brief: [],
    caution:
      'The regulations call for symmetry in choice: the path to a privacy-protective option must not be longer or harder than the path to the less protective one.',
    source: 'Cal. Civ. Code §§1798.125(b) and 1798.140 (consent, dark pattern); CCPA Regulations §7004',
  },
  {
    id: 'ccpa-optout',
    kicker: 'The default runs the other way.',
    title: 'Opting out of sale and sharing',
    takeaway:
      'A business that sells or shares personal information must let you opt out of both, through a clear link or an allowed alternative, and must treat an opt-out preference signal as a valid request.',
    brief: [
      'Selling is disclosing personal information to a third party for money or other valuable consideration. Sharing is disclosing it for cross-context behavioural advertising, whether or not anything is paid.',
      'An opt-out preference signal, such as Global Privacy Control, must be processed as a request to opt out for that browser or device, and for the consumer if known.',
    ],
    caution: 'Whether a given disclosure is a sale or a share depends on the facts and the contracts. A consent platform cannot decide that for you.',
    source: 'Cal. Civ. Code §§1798.120, 1798.135 and 1798.140 (sell, share); CCPA Regulations §§7013, 7025 and 7026',
  },
  {
    id: 'ccpa-record',
    kicker: 'An opt-out has to stick.',
    title: 'Applied, passed on, kept',
    takeaway:
      'After an opt-out, the business stops selling and sharing within 15 business days, tells the third parties concerned, keeps a record, and waits at least 12 months before asking again. The same 12 months applies after a request to limit sensitive information.',
    brief: [
      'Third parties that received the information after the request, before the business complied, must be notified and directed to comply.',
      'Records of consumer requests, and how the business responded, are kept for at least 24 months.',
    ],
    depth: {
      summary: 'What an opt-out does not do',
      points: [
        'It does not unwind disclosures made before it.',
        'It does not delete anything: the right to delete is separate.',
        'It does not stop disclosure to service providers acting under contract.',
      ],
    },
    source: 'Cal. Civ. Code §1798.135(c); CCPA Regulations §§7026 and 7101',
  },
  {
    id: 'ccpa-rights',
    kicker: 'What you can ask for.',
    title: 'The consumer’s rights',
    takeaway:
      'Rights to know, delete, correct, opt out of sale and sharing, and limit the use of sensitive personal information, with no retaliation for using them.',
    brief: [
      'Requests to know, delete and correct are verified, then answered within 45 calendar days, extendable once by 45 more with notice. Opt-out and limit requests need no verification.',
    ],
    depth: {
      summary: 'Each right in a line',
      points: [
        'Know: the categories and specific pieces collected, the sources, purposes, and who it was disclosed to.',
        'Delete: what was collected from you, subject to exceptions such as completing a transaction or security.',
        'Correct: inaccurate personal information, using commercially reasonable efforts.',
        'Opt out: of selling and sharing.',
        'Limit: sensitive personal information to necessary uses.',
        'No retaliation: no denying goods, charging different prices or giving a different quality of service for using a right, except as part of a disclosed financial incentive.',
      ],
    },
    source: 'Cal. Civ. Code §§1798.105 to 1798.125 and 1798.130',
  },
  {
    id: 'ccpa-duties',
    kicker: 'What the business owes.',
    title: 'Duties beyond the link',
    takeaway:
      'Notice at collection, a privacy policy updated at least every 12 months, honouring requests and signals, reasonable security, contracts with every recipient, and collecting no more than the purposes need.',
    brief: [
      'Under regulations adopted by the California Privacy Protection Agency in 2025, businesses whose processing presents significant risk must conduct risk assessments, and some must complete annual cybersecurity audits, on phased timelines.',
    ],
    caution:
      'Administrative fines reach $2,500 per violation, or $7,500 per intentional violation or violation involving a minor’s data, adjusted for inflation. Consumers can sue directly over some data breaches caused by a failure of reasonable security.',
    source: 'Cal. Civ. Code §§1798.100, 1798.130, 1798.150, 1798.155, 1798.185 and 1798.199.90',
  },
  {
    id: 'ccpa-minors',
    kicker: 'The one place California defaults to opt-in.',
    title: 'Minors under 16',
    takeaway:
      'A business may not sell or share the personal information of a consumer it knows is under 16 unless the consumer, if 13 to 15, or a parent or guardian, if under 13, has affirmatively authorised it.',
    brief: [
      'A business that wilfully disregards a consumer’s age is treated as knowing it.',
      'The business must tell the minor, or the parent or guardian, that the opt-in can be undone: an opt-out remains available afterwards.',
    ],
    source: 'Cal. Civ. Code §1798.120(c) and (d); CCPA Regulations §§7070 and 7071',
  },
  {
    id: 'ccpa-sensitive',
    kicker: 'Information whose misuse does the most harm.',
    title: 'Limiting sensitive personal information',
    takeaway:
      'You can direct a business to use your sensitive personal information only as necessary to provide the goods or services you would reasonably expect, plus a short list of permitted purposes.',
    brief: [
      'Sensitive personal information includes government ID numbers, account logins with credentials, precise geolocation, racial or ethnic origin, citizenship or immigration status, religious beliefs, union membership, the contents of mail and messages, genetic, biometric, health and neural data, and data about sex life or sexual orientation.',
      'The right does not apply to sensitive information collected or processed without the purpose of inferring characteristics about you.',
    ],
    source: 'Cal. Civ. Code §§1798.121 and 1798.140 (sensitive personal information); CCPA Regulations §7027',
  },
  {
    id: 'ccpa-system',
    kicker: 'Everything so far, as one system.',
    title: 'A lifecycle inside wider duties',
    takeaway:
      'Notice, an opt-out offered, your request, recorded, applied, passed on, and held: the preference lifecycle, inside duties that reach well past the link.',
    brief: [
      'Outside the loop sit access, deletion and correction requests, security, service provider contracts, risk assessments and audits, and the privacy policy itself.',
    ],
    caution:
      'More than a dozen other US states have passed comprehensive privacy laws with their own thresholds, definitions and opt-in rules for sensitive data. Do not assume a California configuration covers them.',
    source: 'Cal. Civ. Code §1798.100 ff.; CCPA Regulations, Cal. Code Regs. tit. 11, §7000 ff.',
  },
]

export const ccpa: Law = {
  id: 'ccpa',
  hero: {
    name: 'California Consumer Privacy Act',
    year: 'as amended by the CPRA',
    lead: 'California’s privacy law in eight stops. Follow one piece of personal information, try each idea on the model, and open the details when you want the full text.',
  },
  colophon: {
    about:
      'A plain-language walkthrough of the California Consumer Privacy Act, as amended by the California Privacy Rights Act, written for people who have never read it. The 3D layer illustrates the text beside it; every explanation is also written in the page, so nothing is lost without it.',
    legal:
      'This is a general explanation, not legal advice, a legal opinion, or a compliance certification. Thresholds, definitions, exemptions, timelines and penalties depend on the statute, the California Privacy Protection Agency’s regulations, inflation adjustments, and enforcement by the Agency and the Attorney General. Read the official text, and obtain advice from qualified counsel for your own processing.',
  },
  sourcePrefix: 'Source: ',
  stations,
  chapters,
  // The boundary round you reaches past the shared phone framing of station 01.
  narrowViews: { people: { main: { center: [0.05, 0.0, 0], radius: 3.05, dir: [0, 0.22, 1] } } },
  scene: {
    people: {
      principal: 'You · consumer',
      principalHover: 'You: the consumer',
      fiduciary: 'Business',
      processor: 'Service provider',
      responsibility: 'contract limits use',
      data: 'your information',
      short: { fiduciary: 'Business', processor: 'Provider' },
      scope: {
        label: 'California resident',
        hover: 'The law protects consumers: natural persons who are California residents (§1798.140(i))',
      },
      household: {
        label: 'or your household',
        hover: 'Personal information includes what can reasonably be linked to your household (§1798.140(v))',
      },
      thresholds: {
        label: 'meets any one threshold',
        items: [
          'Annual revenue over $25 million, adjusted for inflation',
          'Buys, sells or shares data on 100,000+ consumers or households',
          'Half its annual revenue from selling or sharing',
        ],
      },
    },
    reason: {
      bar: 'Collecting it is not a licence',
      purpose: 'purpose',
      consent: 'Disclosed purpose',
      legitimate: 'Compatible purpose',
      shortcut: 'unrelated purpose',
      shortcutHover: 'A purpose you were never told about',
      processing: 'processing',
      kind: 'notice',
      notice: {
        slip: 'Notice at collection',
        slipHover: 'At or before collection: what is collected, why, whether it is sold or shared, and for how long (§1798.100(a))',
        compatible: 'compatible purposes',
        gate: 'consent first',
        gateHover: 'A purpose unrelated to, or incompatible with, why it was collected needs your consent first (Regs §7002(e))',
      },
    },
    consent: {
      checks: ['clear action', 'specific', 'no dark pattern'],
      notice: 'Notice at collection',
      noticeHover: 'What is collected, why, and whether it is sold',
      attempts: { silence: 'closed', uninformed: 'terms', bundled: 'lopsided' },
      bypass: {
        label: 'most processing: notice and opt-out',
        hover: 'Most processing needs no consent: a notice at collection, and the right to opt out',
      },
    },
    purposes: {
      optOut: {
        link: 'Do Not Sell or Share',
        linkHover: 'The “Do Not Sell or Share My Personal Information” link (§1798.135(a))',
        signal: 'Global Privacy Control',
        signalHover: 'An opt-out preference signal sent by your browser, which the business must treat as a request to opt out (Regs §7025)',
      },
    },
    withdrawal: {
      past: 'past disclosures stay',
      record: 'Request record',
      versions: 'kept 24 months',
      necessary: 'service runs on',
      told: 'third parties told',
      timing: {
        kept: 'kept 24 months',
        keptCount: 24,
        deadline: 'stops within 15 business days',
        deadlineCount: 15,
        hold: '12 months before asking again',
        holdCount: 12,
      },
    },
    rights: {
      you: 'You',
      holder: 'Business',
      deadline: { base: 45, extension: 45, label: '45 days, +45 with notice (§1798.130)' },
      rights: [
        { label: 'Know', tool: 'access' },
        { label: 'Delete', tool: 'erasure' },
        { label: 'Correct', tool: 'correction' },
        { label: 'Opt out', tool: 'withdrawal' },
        { label: 'Limit', tool: 'restriction' },
        { label: 'No retaliation', tool: 'equal' },
      ],
      duties: ['Honour opt-outs', 'Notice at collection', 'Privacy policy', 'Answer requests', 'Reasonable security', 'Contracts', 'Minimisation'],
      extra: 'Risk assessments and audits, some businesses',
    },
    stricter: [
      {
        kind: 'room',
        subject: 'A minor’s data',
        gatekeeper: 'teen, 13 to 15',
        gatekeeperHover: 'The consumer, aged 13 to 15, opting in themselves (§1798.120(c))',
        gatekeeperShape: 'person',
        check: 'opt-in first',
        checkHover: 'An affirmative authorisation to sell or share',
        reaches: ['selling it', 'sharing for ads'],
        second: { label: 'parent, under 13', hover: 'A parent or guardian, for a child under 13 (§1798.120(c))', shape: 'person' },
      },
      {
        kind: 'room',
        subject: 'Sensitive information',
        gatekeeper: 'the business',
        gatekeeperHover: 'The business, for necessary uses',
        gatekeeperShape: 'organisation',
        check: 'necessary uses',
        checkHover: 'Uses necessary for what you reasonably expect',
        reaches: ['inferring traits', 'unexpected uses', 'selling it', 'sharing it'],
        contents: [
          'Social security, licence or passport number',
          'Account login with its password',
          'Financial account with its access code',
          'Precise geolocation',
          'Racial or ethnic origin, religion, union membership',
          'Contents of mail, email or texts',
          'Genetic and biometric data',
          'Health, sex life or sexual orientation',
        ],
      },
    ],
    system: {
      person: 'a consumer, throughout',
      boundary: 'wider duties, beyond the link',
      crossing: {
        kind: 'signal',
        label: 'browser signal (GPC)',
        hover: 'Global Privacy Control: an opt-out request your browser sends by itself (Regs §7025)',
        step: 2,
      },
    },
  },
}
