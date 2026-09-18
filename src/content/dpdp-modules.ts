export const DPDP_MODULES = [
  {
    id: "01-what-is-dpdp",
    title: "What the DPDP Act is",
    minutes: 6,
    summary: "India’s Digital Personal Data Protection Act, 2023 is the national law for digital personal data.",
    body: [
      "The DPDP Act applies to digital personal data processed in India, and in many cases to processing outside India when it is linked to offering goods or services to people in India.",
      "It is purpose-bound: you collect and use data for a stated reason, not an open-ended “we may use this later” clause.",
      "A consent manager is how those purposes become records, banners, and runtime controls — not only a privacy policy PDF.",
    ],
  },
  {
    id: "02-roles",
    title: "Data Principal and Data Fiduciary",
    minutes: 5,
    summary: "The person the data is about, and the organisation that decides why it is processed.",
    body: [
      "The Data Principal is the individual. The Data Fiduciary decides purpose and means of processing.",
      "Data Processors act on the fiduciary’s instructions. Your vendors, tag managers, and cloud tools often sit here.",
      "Consent Guru maps fiduciaries (your organisation / websites) to processors (vendors) and purposes so roles stay explicit.",
    ],
  },
  {
    id: "03-consent",
    title: "Valid consent under DPDP",
    minutes: 7,
    summary: "Consent must be free, specific, informed, unconditional, and unambiguous.",
    body: [
      "Pre-ticked boxes, bundled purposes, and “take it or leave it” cookies fail the DPDP consent test.",
      "Notice must say what you collect, why, and who you share it with — in language the principal can understand.",
      "Store the policy version, purpose list, timestamp, and identity you actually use, so consent can be proven later.",
    ],
  },
  {
    id: "04-consent-manager",
    title: "Why a consent manager matters",
    minutes: 6,
    summary: "DPDP treats consent as a system of record, not a one-time checkbox.",
    body: [
      "A consent manager lets principals give, review, and withdraw consent through a registered, interoperable layer.",
      "Even before registration regimes mature, you still need a product that records choice and honours withdrawal as easily as accept.",
      "Consent Guru is built as that control plane: banners, preference centre, SDK blocking, and evidence export.",
    ],
  },
  {
    id: "05-children",
    title: "Children’s data and verifiable guardian consent",
    minutes: 6,
    summary: "Processing children’s data needs guardian consent and extra restrictions.",
    body: [
      "Tracking or targeting children for advertising is tightly restricted. Age gates that only ask “are you 18?” are weak.",
      "When the user is a child, pause optional processing and start a guardian-consent flow with proof of authority.",
      "Consent Guru supports age assurance and guardian workflows so a child profile cannot inherit an adult marketing opt-in.",
    ],
  },
  {
    id: "06-legitimate-uses",
    title: "Consent vs legitimate uses",
    minutes: 5,
    summary: "Some processing can proceed without consent — but only for listed legitimate uses.",
    body: [
      "Employment, legal claims, medical emergencies, and certain state functions may be legitimate uses. Marketing cookies usually are not.",
      "Do not label advertising as a legitimate use to skip the banner. Document the basis per purpose.",
      "In the product, mark required purposes separately from optional ones so the SDK never fires ads on a legitimate-use excuse.",
    ],
  },
  {
    id: "07-rights",
    title: "Data Principal rights",
    minutes: 6,
    summary: "Access, correction, erasure, and grievance redressal have timelines.",
    body: [
      "Principals can seek information about processing, correction, erasure, and nomination in many cases.",
      "Withdrawal of consent must be as easy as giving it. That is a preference-centre requirement, not a help-desk ticket.",
      "Consent Guru binds consent IDs to rights-request workflows so access and deletion are not a spreadsheet hunt.",
    ],
  },
  {
    id: "08-transfers",
    title: "Sharing and cross-border transfers",
    minutes: 6,
    summary: "Sending personal data outside India needs a lawful story and honest notices.",
    body: [
      "The Central Government may restrict transfers to specified countries. Fiduciaries still need purpose limitation.",
      "Consent can support some transfers, but it is brittle if the user can withdraw. Contracts and localisation may be stronger for core systems.",
      "Tag vendors as in-country or overseas and block them when the purpose is declined.",
    ],
  },
  {
    id: "09-sdf",
    title: "Significant Data Fiduciaries",
    minutes: 5,
    summary: "Scale, sensitivity, and risk can trigger extra duties: DPO, audits, DPIA-style assessments.",
    body: [
      "Significant Data Fiduciaries face tighter governance: data protection officer, independent audits, and periodic assessments.",
      "Even if you are not designated yet, scanner findings, retention, and vendor graphs are the same hygiene.",
      "Use monitoring, audit logs, and policy versions so an SDF designation is an operational upgrade, not a scramble.",
    ],
  },
  {
    id: "10-penalties",
    title: "Penalties, including ₹250 crore",
    minutes: 7,
    summary: "The Act provides for financial penalties that can reach two hundred and fifty crore rupees.",
    body: [
      "Failure to take reasonable security safeguards, children’s data breaches, and certain consent failures sit among the highest-penalty buckets.",
      "₹250 crore is the upper end for specified offences — it is not a typical “cookie fine,” but it is why evidence and withdrawal matter.",
      "A consent manager does not replace counsel. It is how you show the Board what was asked, what was granted, and what was stopped.",
    ],
  },
] as const;
