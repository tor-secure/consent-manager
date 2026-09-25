export const PENALTY_VERSION = "2026.09.1";

export type PenaltyOption = {
  value: string;
  label: string;
  /** 0 is lower indicative exposure. 3 is higher. Not a rupee amount. */
  exposure: 0 | 1 | 2 | 3;
};

export type PenaltyFactor = {
  id: string;
  step: string;
  weight: number;
  prompt: string;
  help: string;
  recommendation: string;
  options: PenaltyOption[];
};

export const PENALTY_STEPS = ["Organisation", "Processing", "Controls"] as const;

export const PENALTY_BANDS = [
  { max: 24, label: "Limited indicative exposure" },
  { max: 49, label: "Moderate indicative exposure" },
  { max: 74, label: "Elevated indicative exposure" },
  { max: 100, label: "Higher indicative exposure" },
] as const;

export const PENALTY_FACTORS: PenaltyFactor[] = [
  {
    id: "size",
    step: "Organisation",
    weight: 4,
    prompt: "How large is the organisation's consumer or user base in India?",
    help: "Scale is context for how widely a control gap could spread. It is not a penalty formula.",
    recommendation: "Document the approximate Data Principal population you actually process for, and review controls that do not scale with it.",
    options: [
      { value: "small", label: "Under about 10,000 people", exposure: 0 },
      { value: "mid", label: "About 10,000 to 1 million", exposure: 1 },
      { value: "large", label: "Over about 1 million", exposure: 2 },
      { value: "unknown", label: "We have not estimated this", exposure: 3 },
    ],
  },
  {
    id: "principals",
    step: "Organisation",
    weight: 8,
    prompt: "Do you know roughly how many Data Principals' personal data you process?",
    help: "An unknown population makes breach notice, erasure, and consent evidence harder to operate.",
    recommendation: "Build a processing inventory that names systems and an approximate Data Principal count.",
    options: [
      { value: "known", label: "Yes, and it is reviewed", exposure: 0 },
      { value: "rough", label: "Only a rough estimate", exposure: 1 },
      { value: "no", label: "No working estimate", exposure: 3 },
    ],
  },
  {
    id: "volume",
    step: "Processing",
    weight: 6,
    prompt: "How broad is the personal data you process for those people?",
    help: "More categories and longer retention raise the practical impact of a control failure.",
    recommendation: "Cut collection to what each purpose needs, and record a retention period per category.",
    options: [
      { value: "narrow", label: "A few categories, short retention", exposure: 0 },
      { value: "mixed", label: "Several categories or longer retention", exposure: 2 },
      { value: "wide", label: "Broad profiles, history, or identifiers kept for a long time", exposure: 3 },
    ],
  },
  {
    id: "nature",
    step: "Processing",
    weight: 8,
    prompt: "What kind of processing is central to the service?",
    help: "Advertising, profiling, and decisions about people need a clearer purpose and consent story than a simple account login.",
    recommendation: "Separate essential processing from optional analytics, advertising, or profiling, each with its own purpose.",
    options: [
      { value: "account", label: "Mostly account, order, or support operations", exposure: 0 },
      { value: "analytics", label: "Meaningful analytics or personalisation", exposure: 1 },
      { value: "ads", label: "Advertising, profiling, or decisions that affect people", exposure: 3 },
    ],
  },
  {
    id: "children",
    step: "Processing",
    weight: 12,
    prompt: "Do you process personal data of children (under 18)?",
    help: "The Act sets specific duties for children's data, including verifiable guardian consent and limits on tracking and targeted advertising.",
    recommendation: "If the service is child-directed, stop optional tracking until a verifiable guardian flow is in place.",
    options: [
      { value: "no", label: "No", exposure: 0 },
      { value: "controlled", label: "Yes, with a guardian-consent process", exposure: 1 },
      { value: "open", label: "Yes, without a verified guardian process", exposure: 3 },
    ],
  },
  {
    id: "sensitive",
    step: "Processing",
    weight: 8,
    prompt: "Does processing include higher-impact data such as financial, health, biometric, or precise location data?",
    help: "This is a risk screen, not a finding that a special statutory category applies.",
    recommendation: "Give higher-impact data its own purpose, access limit, and retention rule.",
    options: [
      { value: "no", label: "No", exposure: 0 },
      { value: "some", label: "Yes, and it is limited to a stated purpose", exposure: 1 },
      { value: "broad", label: "Yes, and the purpose or access is broad", exposure: 3 },
    ],
  },
  {
    id: "notice",
    step: "Controls",
    weight: 10,
    prompt: "How mature is the privacy notice shown at the point of choice?",
    help: "A notice should itemise personal data and purpose, and explain withdrawal, rights, and complaints.",
    recommendation: "Replace a generic policy link with an itemised notice tied to the consent request.",
    options: [
      { value: "itemised", label: "Itemised, versioned, and shown with the request", exposure: 0 },
      { value: "policy", label: "A privacy policy exists, but it is not itemised at the choice", exposure: 2 },
      { value: "weak", label: "No reliable notice", exposure: 3 },
    ],
  },
  {
    id: "consent",
    step: "Controls",
    weight: 10,
    prompt: "How are optional purposes consented to?",
    help: "Where consent is the ground, it needs a clear affirmative action for a specified purpose.",
    recommendation: "Stop relying on pre-ticked boxes, bundled purposes, or continued browsing as consent.",
    options: [
      { value: "granular", label: "People choose purpose by purpose", exposure: 0 },
      { value: "bundled", label: "One accept covers several optional purposes", exposure: 2 },
      { value: "implied", label: "Consent is implied, pre-ticked, or not asked", exposure: 3 },
    ],
  },
  {
    id: "evidence",
    step: "Controls",
    weight: 9,
    prompt: "Can you show what was asked, what was agreed, and which notice version was live?",
    help: "Evidence is how you demonstrate a choice later. It is not itself a legal conclusion.",
    recommendation: "Store the choice, time, purposes, and notice or policy version, and keep later withdrawals.",
    options: [
      { value: "provable", label: "Yes, including withdrawal history", exposure: 0 },
      { value: "partial", label: "Some records, incomplete versioning", exposure: 2 },
      { value: "none", label: "No reliable record", exposure: 3 },
    ],
  },
  {
    id: "security",
    step: "Controls",
    weight: 12,
    prompt: "Are reasonable security safeguards defined and operated for personal data?",
    help: "Failure to take reasonable security safeguards is one of the higher statutory penalty ceilings. This question does not measure whether your safeguards are reasonable.",
    recommendation: "Map safeguards to the Rules that apply to you, and test breach detection and access control.",
    options: [
      { value: "operated", label: "Safeguards are defined, owned, and reviewed", exposure: 0 },
      { value: "partial", label: "Some controls, uneven coverage", exposure: 2 },
      { value: "weak", label: "No documented safeguard programme", exposure: 3 },
    ],
  },
  {
    id: "rights",
    step: "Controls",
    weight: 8,
    prompt: "Can you receive and track access, correction, erasure, and grievance requests?",
    help: "A mailbox without an owner and a status trail is a weak rights process.",
    recommendation: "Give each request a type, an owner, and a status from intake to completion.",
    options: [
      { value: "tracked", label: "Yes, with owners and statuses", exposure: 0 },
      { value: "inbox", label: "Requests arrive, but tracking is informal", exposure: 2 },
      { value: "none", label: "No process", exposure: 3 },
    ],
  },
  {
    id: "breach",
    step: "Controls",
    weight: 10,
    prompt: "Is there a breach path that can inform the Board and affected people in the prescribed way?",
    help: "The Act requires intimation of a personal-data breach. The form and timeline come from the Rules.",
    recommendation: "Write the intake, assessment, Board intimation, and Data Principal notice steps before an incident.",
    options: [
      { value: "ready", label: "Yes, and it has been rehearsed", exposure: 0 },
      { value: "draft", label: "A draft exists and has not been rehearsed", exposure: 2 },
      { value: "none", label: "No breach path", exposure: 3 },
    ],
  },
  {
    id: "processors",
    step: "Controls",
    weight: 7,
    prompt: "Are processors and vendors listed, with contracts that cover personal-data handling?",
    help: "A Data Fiduciary remains responsible for processors it engages.",
    recommendation: "Inventory vendors, the purposes they serve, and whether a contract is in place.",
    options: [
      { value: "listed", label: "Inventoried and contracted", exposure: 0 },
      { value: "partial", label: "A partial list or uneven contracts", exposure: 2 },
      { value: "none", label: "Vendors are not governed", exposure: 3 },
    ],
  },
  {
    id: "transfers",
    step: "Organisation",
    weight: 6,
    prompt: "Do you know which personal data is processed outside India?",
    help: "The government may restrict transfers to specified countries. You still need to know where data goes.",
    recommendation: "Mark each vendor and system as in-country or overseas, and watch notified restrictions.",
    options: [
      { value: "known", label: "Overseas flows are known", exposure: 0 },
      { value: "unsure", label: "Some overseas tools, not fully mapped", exposure: 2 },
      { value: "unknown", label: "We do not know", exposure: 3 },
    ],
  },
];
