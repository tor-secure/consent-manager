import type { DetailChapter, Law } from '../law'
import type { Station } from '../stations'

/**
 * The EU General Data Protection Regulation (Regulation (EU) 2016/679), on the
 * same eight-station route as the DPDP Act. Every line paraphrases the
 * Regulation, its recitals, or the ePrivacy rule on cookies, and cites where;
 * nothing adds a legal claim of its own.
 */

const stations: Station[] = [
  {
    id: 'people',
    number: '01',
    label: 'People',
    title: 'Your data, and who holds it',
    takeaway:
      'Personal data is any information relating to an identified or identifiable person. The GDPR covers its processing by automated means, and in structured filing systems.',
    points: [
      { title: 'You are the data subject', body: 'The identified or identifiable living person the data relates to.' },
      { title: 'The controller decides', body: 'It determines the purposes and means of processing, alone or jointly.' },
      { title: 'A processor acts for it', body: 'Under a contract, on documented instructions. The controller stays accountable.' },
    ],
    control: {
      prompt: 'Who is who?',
      kind: 'single',
      options: [
        { id: 'principal', label: 'You', result: 'The data subject: the identified or identifiable natural person the personal data relates to.' },
        { id: 'fiduciary', label: 'Controller', result: 'The controller determines the purposes and means of processing. Usually the website or app that collected it.' },
        { id: 'processor', label: 'Processor', result: 'A processor processes personal data on the controller’s behalf, under an Article 28 contract. The controller remains accountable; the processor has duties of its own.' },
      ],
    },
    chapters: ['gdpr-data', 'gdpr-roles'],
    marks: ['principal', 'data', 'fiduciary', 'processor'],
  },
  {
    id: 'reason',
    number: '02',
    label: 'Basis',
    title: 'A purpose, and a lawful basis',
    takeaway:
      'Holding data is not a basis for using it. Each processing purpose needs one of six lawful bases in Article 6, settled before it starts.',
    points: [
      { title: 'Six bases', body: 'Consent, contract, legal obligation, vital interests, public task, legitimate interests.' },
      { title: 'No swapping', body: 'If consent is refused or withdrawn, you cannot switch to another basis to carry on.' },
      { title: 'The purpose is a boundary', body: 'Specified, explicit and legitimate. No further use that is incompatible with it.' },
    ],
    control: {
      prompt: 'Pick the route your data takes',
      kind: 'single',
      options: [
        { id: 'consent', label: 'Consent', result: 'You agree to processing for one or more specific purposes. The consent route lights.', tone: 'grant' },
        { id: 'legitimate', label: 'Another basis', result: 'Contract, legal obligation, vital interests, public task or legitimate interests, each with its own conditions, chosen and documented before processing.', tone: 'neutral' },
        { id: 'shortcut', label: 'Swapped basis', result: 'Refused. Asking for consent, then relying on legitimate interests once you say no or withdraw, is not allowed.', tone: 'refuse' },
      ],
    },
    chapters: ['gdpr-bases', 'gdpr-purpose'],
    marks: ['data', 'purpose', 'consent'],
  },
  {
    id: 'consent',
    number: '03',
    label: 'Consent',
    title: 'What makes a consent valid',
    takeaway:
      'Consent must be freely given, specific, informed and unambiguous: a statement or a clear affirmative action, which the controller can later show.',
    points: [
      { title: 'Information first', body: 'Who is asking, for which purposes, and that you can withdraw.' },
      { title: 'A clear action', body: 'Silence, pre-ticked boxes and inactivity are not consent.' },
      { title: 'Not a condition', body: 'Tying a service to consent it does not need weighs against consent being free.' },
    ],
    control: {
      prompt: 'Send a consent through the three checks',
      kind: 'single',
      startEmpty: true,
      options: [
        { id: 'silence', label: 'Pre-ticked box', result: 'Stopped at check 1. Silence, pre-ticked boxes and inactivity are not a clear affirmative action.', tone: 'refuse' },
        { id: 'uninformed', label: 'No information', result: 'Stopped at check 2. Without knowing who is asking and for what, the consent is not informed.', tone: 'refuse' },
        { id: 'bundled', label: 'Bundled', result: 'Stopped at check 3. Made a condition of a service that does not need it, consent is unlikely to be freely given.', tone: 'refuse' },
        { id: 'given', label: 'Clear yes', result: 'Passes all three. Your data changes in place: consent is now attached to it, in a form the controller can demonstrate.', tone: 'grant' },
      ],
    },
    chapters: ['gdpr-consent'],
    marks: ['data', 'consent', 'purpose'],
  },
  {
    id: 'purposes',
    number: '04',
    label: 'Purposes',
    title: 'Off until you say yes',
    takeaway:
      'Each purpose needs its own answer, and nothing optional runs before it. Cookies and trackers that are not strictly necessary wait for consent.',
    points: [
      { title: 'Each purpose, its own answer', body: 'One switch for everything is not specific consent.' },
      { title: 'Nothing on by default', body: 'An optional purpose starts off; a pre-ticked one was never consent.' },
      { title: 'Refusing is as easy', body: 'Regulators expect saying no to take no more effort than saying yes.' },
    ],
    control: {
      prompt: 'Your choices',
      kind: 'toggle',
      options: [
        { id: 'necessary', label: 'Strictly necessary', vendor: 'the service', defaultOn: true, result: 'Storage strictly necessary for the service you asked for runs without consent.' },
        { id: 'analytics', label: 'Analytics', vendor: 'analytics vendor', result: 'Analytics allowed: its stream lights and reaches its vendor.', tone: 'grant' },
        { id: 'advertising', label: 'Advertising', vendor: 'ad vendor', result: 'Advertising allowed: its stream lights and reaches its vendor.', tone: 'grant' },
      ],
      locked: [{ id: 'necessary', reason: 'Strictly necessary storage is exempt from consent under the ePrivacy rules.' }],
      declined: 'Not consented: {list}. It started off, and its stream stops before its vendor, which stays dark. Refusing is a valid answer.',
      allowed: 'Everything consented: each stream reaches its vendor. Switch one off to refuse just that purpose.',
    },
    chapters: ['gdpr-granularity'],
    marks: ['data', 'purpose', 'processor'],
  },
  {
    id: 'withdrawal',
    number: '05',
    label: 'Record',
    title: 'Recorded, and reversible',
    takeaway:
      'The controller must be able to demonstrate your consent. Withdrawing it must be as easy as giving it, and what relied on it has to stop.',
    points: [
      { title: 'Demonstrable', body: 'Who consented, when, to what, and what they were told.' },
      { title: 'Withdraw at any time', body: 'As easy as giving consent, and you are told so before you give it.' },
      { title: 'Not a rewind', body: 'Processing before the withdrawal stays lawful. Erasure is a separate right.' },
    ],
    control: {
      prompt: 'Change your mind',
      kind: 'single',
      options: [
        { id: 'given', label: 'Consent given', result: 'The record holds your decision, the information you were given and the time.', tone: 'grant' },
        { id: 'withdrawn', label: 'Withdraw consent', result: 'Withdrawn. A new entry is filed over the old one, which stays. The analytics stream stops; the necessary stream runs on. The data is still there until erasure is asked for or due.', tone: 'refuse' },
      ],
    },
    chapters: ['gdpr-record'],
    marks: ['record', 'consent', 'data'],
  },
  {
    id: 'rights',
    number: '06',
    label: 'Rights',
    title: 'Your rights. Their duties.',
    takeaway:
      'You can access, rectify, erase, restrict, port and object, and complain to a supervisory authority. The controller owes far more than a consent banner.',
    points: [
      { title: 'Answered within a month', body: 'Extendable by two more for complex or numerous requests.' },
      { title: 'Consent is one duty of many', body: 'Security, breach notice, records, processor contracts and more.' },
      { title: 'Some carry more', body: 'A DPIA for high-risk processing; a DPO where Article 37 requires one.' },
    ],
    control: {
      prompt: 'See it from either end',
      kind: 'single',
      options: [
        { id: 'rights', label: 'Your rights', result: 'Access, rectification, erasure, restriction, portability, objection, and a complaint to a supervisory authority, each a line from you to where your data went.' },
        { id: 'duties', label: 'Their duties', result: 'Consent handling, a lawful basis, transparency, security, breach notice, processor contracts and accountability, with consent one node of seven.' },
      ],
    },
    chapters: ['gdpr-rights', 'gdpr-duties'],
    marks: ['principal', 'right', 'fiduciary'],
  },
  {
    id: 'stricter',
    number: '07',
    label: 'Stricter',
    title: 'Where the rules tighten',
    takeaway:
      'Below the national age, a child’s consent to an online service needs a parent behind it. Special category data is off limits unless an Article 9 condition applies.',
    points: [
      { title: 'Under 16, or as low as 13', body: 'Each member state sets the age; below it, a holder of parental responsibility consents or authorises.' },
      { title: 'Special categories', body: 'Health, biometric and genetic data, beliefs, sex life and more: prohibited by default.' },
      { title: 'Explicit, not implied', body: 'Where consent is the way in, it has to be explicit consent.' },
    ],
    control: {
      prompt: 'Look closer at',
      kind: 'single',
      options: [
        { id: 'children', label: 'Children', result: 'A double wall around the data. A parent’s consent comes through one check, with reasonable efforts to verify it; a child’s own yes below the age is stopped at the wall.' },
        { id: 'special', label: 'Special categories', result: 'A double wall around sensitive data. Explicit consent, or another Article 9 condition, comes through the check; implied consent and legitimate interests are stopped at the wall.' },
      ],
    },
    chapters: ['gdpr-children', 'gdpr-special'],
    marks: ['principal', 'data', 'record'],
  },
  {
    id: 'system',
    number: '08',
    label: 'System',
    title: 'It was never just a banner',
    takeaway:
      'Inform, ask, choose, record, apply, withdraw, update: a lifecycle inside the controller’s wider accountability, about a person.',
    points: [
      { title: 'Accountability', body: 'The controller must be able to show it meets every principle.' },
      { title: 'Beyond the banner', body: 'Security, transfers out of the EEA, DPIAs and breach notice sit outside it.' },
      { title: 'Check the source', body: 'EDPB and national guidance keep moving. Read the official text.' },
    ],
    control: {
      prompt: 'Walk the lifecycle',
      kind: 'single',
      options: [
        { id: 'notice', label: 'Inform', result: 'Inform: who is asking, the purposes, and the right to withdraw, before the question.' },
        { id: 'request', label: 'Request', result: 'Consent request: one purpose at a time, clearly apart from anything else.' },
        { id: 'choice', label: 'Your choice', result: 'Your choice: a clear affirmative action, or a refusal.' },
        { id: 'recorded', label: 'Recorded', result: 'Consent recorded: enough to demonstrate it later.' },
        { id: 'applied', label: 'Applied', result: 'Consent applied: only what the record allows runs.' },
        { id: 'change', label: 'Withdraw', result: 'Withdraw: as easy as saying yes was.' },
        { id: 'updated', label: 'Updated', result: 'Consent updated: the record and connected systems follow, and the loop closes.' },
      ],
    },
    chapters: ['gdpr-system'],
    marks: ['data', 'record', 'consent'],
  },
]

const chapters: DetailChapter[] = [
  {
    id: 'gdpr-data',
    kicker: 'Start with the thing the law is about.',
    title: 'Personal data, and where the GDPR reaches',
    takeaway:
      'Any information relating to an identified or identifiable living person is personal data, including online identifiers such as cookie IDs and IP addresses.',
    terms: [
      {
        term: 'Personal data',
        definition:
          'Any information relating to an identified or identifiable natural person (“data subject”); an identifiable natural person is one who can be identified, directly or indirectly, in particular by reference to an identifier such as a name, an identification number, location data, an online identifier or to one or more factors specific to that person.',
      },
    ],
    moments: [
      {
        id: 'term',
        term: 'Personal data',
        plain: 'Ordinary information that points at someone. A pseudonymous ID still counts if it can be linked back to a person.',
      },
      {
        id: 'scope',
        tag: 'Scope',
        title: 'Inside and outside the EU',
        plain:
          'It applies to organisations established in the EU, and to those outside it that offer goods or services to people in the EU or monitor their behaviour there.',
      },
    ],
    brief: [
      'The Regulation covers processing wholly or partly by automated means, and manual processing of data that forms part of a filing system. Purely personal or household activity is outside it.',
    ],
    source: 'GDPR Articles 2, 3 and 4(1); Recital 30',
  },
  {
    id: 'gdpr-roles',
    kicker: 'Who the data is about, who decides, who does the work.',
    title: 'Data subject, controller, processor',
    takeaway:
      'The controller decides why and how your data is processed and is accountable for it. A processor works on its behalf, under a contract, and has some duties of its own.',
    terms: [
      {
        term: 'Controller',
        definition:
          'The natural or legal person, public authority, agency or other body which, alone or jointly with others, determines the purposes and means of the processing of personal data.',
      },
      {
        term: 'Processor',
        definition:
          'A natural or legal person, public authority, agency or other body which processes personal data on behalf of the controller.',
      },
    ],
    moments: [
      { id: 'controller', term: 'Controller', mark: 'fiduciary', plain: 'Usually the website or app operator. Two organisations deciding together are joint controllers and must set out who does what.' },
      { id: 'processor', term: 'Processor', mark: 'processor', plain: 'Analytics vendors, cloud hosts and agencies acting on instructions. A processor that decides purposes for itself becomes a controller for that processing.' },
    ],
    brief: [
      'An Article 28 contract binds the processor to act only on documented instructions, keep the data secure, use sub-processors only with authorisation, and help the controller meet its duties.',
    ],
    source: 'GDPR Articles 4(7), 4(8), 26 and 28',
  },
  {
    id: 'gdpr-bases',
    kicker: 'Consent is one way in, not the only one.',
    title: 'Six lawful bases',
    takeaway:
      'Processing is lawful only if at least one Article 6 basis applies, and the controller should identify it before processing starts.',
    brief: [
      'The six bases are consent; performance of a contract with the person; compliance with a legal obligation; protection of vital interests; a task in the public interest or official authority; and legitimate interests, unless overridden by the person’s interests or rights.',
      'Legitimate interests needs a three-part test: a legitimate purpose, processing necessary for it, and a balance that does not override the person. Public authorities cannot rely on it for their tasks.',
    ],
    depth: {
      summary: 'Why the basis cannot be swapped',
      points: [
        'The basis shapes the person’s rights: portability applies to consent and contract, and the right to object applies to legitimate interests and public task.',
        'The European Data Protection Board’s consent guidelines say a controller that chose consent cannot switch to another basis to justify processing once consent is refused or withdrawn.',
        'People must be told the basis in the privacy information given at collection.',
      ],
    },
    source: 'GDPR Articles 6(1), 13(1)(c) and 21; EDPB Guidelines 05/2020 on consent',
  },
  {
    id: 'gdpr-purpose',
    kicker: 'The purpose draws the edge of what may happen.',
    title: 'Purpose limitation and minimisation',
    takeaway:
      'Data is collected for specified, explicit and legitimate purposes, and not further processed in a way incompatible with them. Only what is needed is collected.',
    brief: [
      'A new purpose is checked for compatibility: the link to the original purpose, the context and the person’s expectations, the nature of the data, the consequences, and safeguards such as pseudonymisation.',
    ],
    depth: {
      summary: 'The principles in Article 5',
      points: [
        'Lawfulness, fairness and transparency.',
        'Purpose limitation, data minimisation, accuracy and storage limitation.',
        'Integrity and confidentiality, and accountability for all of them.',
      ],
    },
    source: 'GDPR Articles 5(1) and 6(4)',
  },
  {
    id: 'gdpr-consent',
    kicker: 'Four conditions, all at once.',
    title: 'Freely given, specific, informed, unambiguous',
    takeaway:
      'A valid consent passes every condition, is given by a statement or a clear affirmative action, and can be demonstrated afterwards.',
    terms: [
      {
        term: 'Consent',
        definition:
          'Any freely given, specific, informed and unambiguous indication of the data subject’s wishes by which he or she, by a statement or by a clear affirmative action, signifies agreement to the processing of personal data relating to him or her.',
      },
    ],
    moments: [
      { id: 'term', term: 'Consent', mark: 'consent', plain: 'Each word is a test a consent can fail.' },
      { id: 'action', tag: 'Check 1', title: 'A clear affirmative action', plain: 'Silence, pre-ticked boxes or inactivity do not constitute consent.' },
      { id: 'informed', tag: 'Check 2', title: 'Informed and specific', plain: 'At least who the controller is, the purposes, and that consent can be withdrawn, in clear and plain language, distinguishable from other matters.' },
      { id: 'free', tag: 'Check 3', title: 'Freely given', plain: 'Making a contract or service conditional on consent to processing it does not need weighs heavily against consent being free. So does a clear imbalance of power.' },
    ],
    brief: [],
    caution:
      'Explicit consent, needed for special category data and some transfers, asks for more: an express statement, such as a written or typed confirmation.',
    source: 'GDPR Articles 4(11) and 7; Recitals 32, 42 and 43',
  },
  {
    id: 'gdpr-granularity',
    kicker: 'One switch is not a choice.',
    title: 'Granular consent and cookies',
    takeaway:
      'When processing has several purposes, consent should be given for each. Storing or reading non-essential cookies needs consent before it happens.',
    brief: [
      'Cookies and similar technologies are governed by the ePrivacy Directive as implemented in each member state: storing or accessing information on a device needs consent, unless it is strictly necessary for a service the person explicitly asked for, or for transmitting a communication. The GDPR supplies the standard for that consent.',
      'Regulators have repeatedly found banners unlawful where rejecting takes more steps than accepting, or where boxes are pre-ticked.',
    ],
    caution: 'National cookie guidance differs between member states. Check the authority for each country you serve.',
    source: 'GDPR Recitals 32 and 43; ePrivacy Directive 2002/58/EC, Article 5(3); EDPB cookie banner taskforce report (2023)',
  },
  {
    id: 'gdpr-record',
    kicker: 'A choice that cannot be shown did not happen.',
    title: 'Demonstrating, and withdrawing',
    takeaway:
      'Where consent is the basis, the controller must be able to show it was given. Withdrawal is possible at any time, as easily as consent was given.',
    brief: [
      'A useful record shows who consented, when, what they were told, how they consented, and whether they have since withdrawn.',
      'Withdrawal does not make earlier processing unlawful. Where consent was the only basis, the data must then be erased on request, or once it is no longer needed.',
    ],
    source: 'GDPR Articles 7(1), 7(3) and 17(1)(b)',
  },
  {
    id: 'gdpr-rights',
    kicker: 'What you can ask for.',
    title: 'The data subject’s rights',
    takeaway:
      'Rights to information, access, rectification, erasure, restriction, portability and objection, and protections around automated decisions, with a complaint to a supervisory authority behind them.',
    brief: [
      'Requests are answered without undue delay and within one month, extendable by two further months where needed. They are free unless manifestly unfounded or excessive.',
    ],
    depth: {
      summary: 'Each right in a line',
      points: [
        'Access: a copy of the data and information about its processing.',
        'Rectification: inaccurate data corrected, incomplete data completed.',
        'Erasure: on grounds such as withdrawn consent or data no longer needed.',
        'Restriction: the data kept but not used, for example while accuracy is contested.',
        'Portability: data you provided, in a machine-readable format, where processing rests on consent or contract.',
        'Objection: always for direct marketing; for legitimate interests or public task, unless the controller shows compelling grounds.',
        'Automated decisions: no decision with legal or similarly significant effects based solely on automated processing, outside narrow exceptions.',
        'Complaint: to the supervisory authority where you live, work, or the infringement happened.',
      ],
    },
    source: 'GDPR Articles 12 to 22 and 77',
  },
  {
    id: 'gdpr-duties',
    kicker: 'What the controller owes.',
    title: 'Accountability, beyond consent',
    takeaway:
      'The controller is responsible for, and must be able to demonstrate, compliance with every principle. Consent handling is one duty among many.',
    brief: [
      'Duties include transparency at collection, appropriate security, records of processing activities, processor contracts, and notifying a personal data breach to the supervisory authority within 72 hours where feasible, unless it is unlikely to result in a risk.',
      'Processing likely to result in a high risk needs a data protection impact assessment first. A data protection officer is required for public authorities and for core activities involving large-scale monitoring or large-scale special category data.',
    ],
    caution:
      'Administrative fines reach up to €20 million or 4% of total worldwide annual turnover, whichever is higher, for the most serious infringements.',
    source: 'GDPR Articles 5(2), 13, 24, 28, 30, 32 to 35, 37 and 83',
  },
  {
    id: 'gdpr-children',
    kicker: 'Online services offered directly to a child.',
    title: 'A parent behind the yes',
    takeaway:
      'Where an information society service relies on consent, a child below the national age cannot consent alone: a holder of parental responsibility must give or authorise it.',
    brief: [
      'The default age is 16. Member states may set a lower age, but not below 13, so the age differs across the EU.',
      'The controller must make reasonable efforts to verify that consent is given or authorised by the holder of parental responsibility, taking into account available technology.',
    ],
    depth: {
      summary: 'Children merit specific protection',
      points: [
        'Recital 38 points particularly at marketing, profiling, and services offered directly to children.',
        'Privacy information aimed at children must be in language they can easily understand.',
        'Preventive or counselling services offered directly to a child should not need parental consent.',
      ],
    },
    source: 'GDPR Articles 8 and 12(1); Recital 38',
  },
  {
    id: 'gdpr-special',
    kicker: 'Data whose misuse does the most harm.',
    title: 'Special categories',
    takeaway:
      'Processing special category data is prohibited unless one of the conditions in Article 9(2) applies, alongside an ordinary Article 6 basis.',
    brief: [
      'The special categories are racial or ethnic origin, political opinions, religious or philosophical beliefs, trade union membership, genetic data, biometric data for identification, health data, and data about sex life or sexual orientation.',
      'Conditions include explicit consent, employment and social security law, vital interests, data manifestly made public by the person, legal claims, substantial public interest, health and social care, public health, and research. Legitimate interests is not among them.',
    ],
    caution: 'Member states may add conditions or limits for genetic, biometric and health data. Criminal offence data has its own rule, in Article 10.',
    source: 'GDPR Articles 9 and 10',
  },
  {
    id: 'gdpr-system',
    kicker: 'Everything so far, as one system.',
    title: 'A lifecycle inside accountability',
    takeaway:
      'Inform, request, choice, record, apply, withdraw, update: the consent lifecycle, inside duties that reach well past the banner.',
    brief: [
      'Outside the loop sit security, breach response, DPIAs, records of processing, and transfers of personal data outside the EEA, which need an adequacy decision or appropriate safeguards such as standard contractual clauses.',
    ],
    caution:
      'The UK applies its own version of the GDPR, alongside the Data Protection Act 2018 and later amendments. Check which regime applies to each audience.',
    source: 'GDPR Articles 5(2), 24, 44 to 49',
  },
]

export const gdpr: Law = {
  id: 'gdpr',
  hero: {
    name: 'General Data Protection Regulation',
    year: '2016/679',
    lead: 'Europe’s data protection law in eight stops. Follow one piece of personal data, try each idea on the model, and open the details when you want the full text.',
  },
  colophon: {
    about:
      'A plain-language walkthrough of the EU General Data Protection Regulation, written for people who have never read it. The 3D layer illustrates the text beside it; every explanation is also written in the page, so nothing is lost without it.',
    legal:
      'This is a general explanation, not legal advice, a legal opinion, or a compliance certification. How the Regulation applies depends on your processing, the member states you serve, national law such as cookie rules and the age of digital consent, and guidance and decisions from the European Data Protection Board, supervisory authorities and the courts. Read the official text, and obtain advice from qualified counsel for your own processing.',
  },
  sourcePrefix: 'Source: ',
  stations,
  chapters,
  // The boundary round you reaches past the shared phone framing of station 01.
  narrowViews: { people: { main: { center: [0.05, 0.0, 0], radius: 3.05, dir: [0, 0.22, 1] } } },
  scene: {
    people: {
      principal: 'You · data subject',
      principalHover: 'You: the data subject',
      fiduciary: 'Controller',
      processor: 'Processor',
      responsibility: 'controller stays accountable',
      data: 'your data',
      short: { fiduciary: 'Controller', processor: 'Processor' },
      scope: {
        label: 'you, in the EU',
        hover: 'In the EU, the GDPR follows you even to a controller outside it that offers you goods or services or monitors you there (Article 3(2))',
      },
      joint: {
        label: 'joint controllers (Art 26)',
        hover: 'A joint controller: two or more deciding purposes and means together, under an arrangement between them (Article 26)',
      },
    },
    reason: {
      bar: 'Holding it is not a basis',
      purpose: 'purpose',
      consent: 'Consent',
      legitimate: 'Another lawful basis',
      shortcut: 'swapped basis',
      shortcutHover: 'A basis swapped after a refusal',
      processing: 'processing',
      kind: 'bases',
      others: ['Contract', 'Legal obligation', 'Vital interests', 'Public task', 'Legitimate interests'],
    },
    consent: {
      checks: ['clear action', 'informed', 'free'],
      notice: 'Information',
      noticeHover: 'The information you are given first',
      attempts: { silence: 'preticked', uninformed: 'blank', bundled: 'bundle' },
      proof: 'can be shown later (Art 7(1))',
    },
    purposes: {
      choice: { accept: 'Accept all', reject: 'Reject all', note: 'refusing as easy as accepting' },
    },
    withdrawal: {
      past: 'the past stays lawful',
      record: 'Consent record',
      versions: 'what you were told, kept',
      necessary: 'necessary runs on',
      told: 'told in turn',
      symmetry: { give: 'Give', withdraw: 'Withdraw', note: 'as easy as giving (Art 7(3))' },
      erasure: 'erasure: a separate right (Art 17)',
    },
    rights: {
      you: 'You',
      holder: 'Controller',
      deadline: { base: 1, extension: 2, label: '1 month, +2 if complex (Art 12(3))' },
      rights: [
        { label: 'Access', tool: 'access' },
        { label: 'Rectification', tool: 'correction' },
        { label: 'Erasure', tool: 'erasure' },
        { label: 'Restriction', tool: 'restriction' },
        { label: 'Portability', tool: 'portability' },
        { label: 'Objection', tool: 'objection' },
        { label: 'Complaint', tool: 'complaint' },
      ],
      duties: ['Consent handling', 'Lawful basis', 'Transparency', 'Security', 'Breach notice', 'Processor contracts', 'Accountability'],
      extra: 'DPIA and DPO, where required',
    },
    stricter: [
      {
        kind: 'room',
        subject: 'A child’s data',
        gatekeeper: 'parental responsibility',
        gatekeeperHover: 'A holder of parental responsibility',
        gatekeeperShape: 'person',
        check: 'reasonable checks',
        checkHover: 'Reasonable efforts to verify, given available technology',
        reaches: ['child’s own yes', 'pre-ticked box', 'bundled terms'],
        ages: { marks: ['13', '14', '15', '16'], from: 0, to: 3, label: '16, or as low as 13 (Art 8(1))' },
      },
      {
        kind: 'room',
        subject: 'Special category data',
        gatekeeper: 'you, explicitly',
        gatekeeperHover: 'You, giving explicit consent',
        gatekeeperShape: 'person',
        check: 'Article 9 condition',
        checkHover: 'Explicit consent, or another Article 9(2) condition',
        reaches: ['implied consent', 'legitimate interests', 'a new purpose'],
        contents: [
          'Racial or ethnic origin',
          'Political opinions',
          'Religious or philosophical beliefs',
          'Trade union membership',
          'Genetic data',
          'Biometric data, to identify you',
          'Health',
          'Sex life or sexual orientation',
        ],
      },
    ],
    system: {
      person: 'a person, throughout',
      boundary: 'accountability, beyond the banner',
      crossing: {
        kind: 'transfer',
        label: 'out of the EEA: adequacy or safeguards',
        hover: 'A transfer out of the EEA needs an adequacy decision or appropriate safeguards, such as standard contractual clauses (Chapter V)',
        step: 0.5,
      },
    },
  },
}
