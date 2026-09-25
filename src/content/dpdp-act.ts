import type { FaqItem } from "@/content/faqs";

export const DPDP_PAGE_PATH = "/dpdp-act";

export const DPDP_PAGE_TITLE = "Digital Personal Data Protection Act (DPDP)";

export const DPDP_PAGE_DESCRIPTION =
  "A practical guide to India's Digital Personal Data Protection Act, 2023: consent, notices, Data Principal rights, Data Fiduciary duties, and how a consent management platform can support them. Informational only — not legal advice.";

export const DPDP_SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "what-is-the-dpdp-act", label: "What the Act is" },
  { id: "key-concepts", label: "Key concepts" },
  { id: "consent", label: "Consent" },
  { id: "consent-management", label: "Consent management" },
  { id: "notice", label: "Notice" },
  { id: "rights", label: "Data Principal rights" },
  { id: "duties", label: "Data Fiduciary duties" },
  { id: "children", label: "Children's data" },
  { id: "consent-manager", label: "Consent Manager" },
  { id: "cmp", label: "How ConsentGuru helps" },
  { id: "lifecycle", label: "Consent lifecycle" },
  { id: "faq", label: "FAQ" },
] as const;

export const DPDP_FACTS = [
  {
    term: "Digital personal data",
    detail:
      "The Act applies to personal data in digital form, including personal data collected offline and later digitised.",
  },
  {
    term: "People and organisations",
    detail:
      "The Data Principal is the individual. The Data Fiduciary decides why and how that person's data is processed.",
  },
  {
    term: "A lawful basis",
    detail:
      "Processing needs the Data Principal's consent, or a legitimate use the Act specifically lists. Consent is not the only path, and it is not a catch-all.",
  },
  {
    term: "Two different roles",
    detail:
      "A registered Consent Manager is a statutory role. A consent management platform is software a fiduciary can use. They are not the same thing.",
  },
] as const;

export const DPDP_CONCEPTS = [
  {
    title: "Personal data",
    body: "Information about an individual who is identifiable by, or in relation to, that information. The Act is concerned with that information when it is digital, or when it is digitised from a non-digital source.",
  },
  {
    title: "Data Principal",
    body: "The individual to whom the personal data relates. For a child, the parent or lawful guardian acts in that role. For a person with a disability who has a lawful guardian, the guardian acts in that role.",
  },
  {
    title: "Data Fiduciary",
    body: "The person or organisation that decides the purpose and means of processing. A website operator, app publisher, or service provider is often the fiduciary for the data it chooses to collect.",
  },
  {
    title: "Data Processor",
    body: "A person who processes personal data on behalf of a Data Fiduciary. Tag managers, analytics vendors, cloud hosts, and agencies commonly sit here. The fiduciary remains responsible for engaging them under a valid contract.",
  },
  {
    title: "Consent",
    body: "A free, specific, informed, unconditional, and unambiguous indication that the Data Principal agrees to processing of their personal data for a specified purpose. It must be given by a clear affirmative action.",
  },
  {
    title: "Notice",
    body: "An itemised explanation, presented with a request for consent, of the personal data and the purpose of processing. It also covers how to withdraw consent, how to exercise rights, and how to complain to the Board.",
  },
  {
    title: "Purpose of processing",
    body: "The specific reason the data is requested. Purpose limitation means the data should be limited to what is necessary for that purpose, and should not be quietly reused for a different one.",
  },
  {
    title: "Consent Manager",
    body: "A person registered with the Data Protection Board who enables a Data Principal to give, manage, review, and withdraw consent through an accessible, transparent, and interoperable platform. The Consent Manager is accountable to the Data Principal.",
  },
  {
    title: "Children",
    body: "Individuals under 18. Processing their personal data requires verifiable consent of a parent or lawful guardian, and the Act restricts tracking, behavioural monitoring, and targeted advertising directed at children.",
  },
] as const;

export const DPDP_CONSENT_POINTS = [
  {
    label: "Required by the framework",
    title: "Free and unconditional",
    body: "Consent should not be bundled into a contract for something unrelated, and it should not be forced by a pre-ticked box or a take-it-or-leave-it wall where the Act expects a real choice.",
  },
  {
    label: "Required by the framework",
    title: "Specific and purpose-limited",
    body: "Each request should name the purpose. Personal data collected on that basis should be limited to what is necessary for the purpose the person agreed to.",
  },
  {
    label: "Required by the framework",
    title: "Informed",
    body: "The person should be able to understand what is being asked, from the notice that accompanies the request, before they act.",
  },
  {
    label: "Required by the framework",
    title: "Clear affirmative action",
    body: "Silence, inactivity, or a default opt-in is not a clear agreement. The person takes an action that indicates consent.",
  },
  {
    label: "Required by the framework",
    title: "Withdrawal",
    body: "The Data Principal may withdraw consent at any time. Withdrawal is to be as easy as giving consent. Processing done lawfully before withdrawal is not made unlawful by the withdrawal itself. After withdrawal, the fiduciary must stop processing that relied on the consent, unless another lawful ground applies, and must erase the data when the Act requires erasure.",
  },
  {
    label: "Recommended practice",
    title: "Granular choices and evidence",
    body: "Separate optional purposes, such as analytics and advertising, from processing that is actually necessary for the service. Keep a record of what was asked, which policy version was shown, what was chosen, and when. The Act expects consent to be demonstrable in practice. A tidy archive is how an organisation shows that.",
  },
] as const;

export const DPDP_NOTICE_POINTS = [
  {
    title: "Clear and itemised",
    body: "State the personal data and the purpose in language a visitor can follow. A wall of legal text that hides the purpose does not meet the point of a notice.",
  },
  {
    title: "Withdrawal, rights, and complaints",
    body: "The notice that accompanies a consent request should explain how to withdraw consent, how to exercise Data Principal rights, and how to make a complaint to the Data Protection Board.",
  },
  {
    title: "Contact information",
    body: "A Data Fiduciary publishes the business contact details of a person who can answer questions about processing. That contact belongs in the notice, not only in an internal roster.",
  },
  {
    title: "Versioning",
    body: "When the notice changes, keep the earlier text. A later consent record should point at the notice the person actually saw. That is sound accountability practice, and it is what makes a dispute reviewable.",
  },
  {
    title: "Language",
    body: "Where the people you serve read a language other than English, present the notice in a language they can use. The Rules and any language directions should be checked for the form of notice that applies to you.",
  },
] as const;

export const DPDP_RIGHTS = [
  {
    title: "Access to information",
    body: "A Data Principal may ask for a summary of personal data being processed and the processing activities undertaken, and for the identities of other fiduciaries and processors with whom the data has been shared, along with related information the Act and Rules provide.",
  },
  {
    title: "Correction and completion",
    body: "A Data Principal may ask the fiduciary to correct inaccurate or misleading personal data, complete incomplete data, and update personal data.",
  },
  {
    title: "Erasure",
    body: "A Data Principal may request erasure. The fiduciary must erase personal data when consent is withdrawn or the specified purpose is no longer served, unless retention is necessary for compliance with law.",
  },
  {
    title: "Grievance redressal",
    body: "A Data Principal may raise a grievance with the Data Fiduciary. The Act also provides a path to the Data Protection Board. The fiduciary is expected to respond within the period prescribed.",
  },
  {
    title: "Nomination",
    body: "A Data Principal may nominate another individual who will exercise the principal's rights in the event of death or incapacity, in the manner prescribed.",
  },
  {
    title: "Withdrawal of consent",
    body: "Where processing is based on consent, the Data Principal may withdraw it. The mechanism should be as easy as the one used to give consent. Withdrawal is a consent right. It sits alongside the rights above.",
  },
] as const;

export const DPDP_DUTIES = [
  {
    title: "Lawful processing",
    body: "Process personal data only for a lawful purpose, and only with consent or under a legitimate use the Act specifies. Document which ground applies to each purpose. Do not describe advertising as a legitimate use in order to skip a consent request.",
  },
  {
    title: "Security safeguards",
    body: "Take reasonable security safeguards to prevent a personal-data breach. The Rules set out what those safeguards include. A breach must be intimated to the Board and to each affected Data Principal in the prescribed manner.",
  },
  {
    title: "Accuracy where it matters",
    body: "Where personal data is likely to be used to make a decision that affects the Data Principal, or is disclosed to another fiduciary, make reasonable efforts to ensure the data is complete, accurate, and consistent.",
  },
  {
    title: "Consent handling",
    body: "Ask for consent in the form the Act requires, honour withdrawal, and stop processing that depended on consent once it is withdrawn, unless a different lawful ground applies.",
  },
  {
    title: "Rights and grievances",
    body: "Provide a way to receive and respond to access, correction, erasure, nomination, and grievance requests. Publish a contact who can answer questions about processing.",
  },
  {
    title: "Processors",
    body: "Engage a Data Processor only under a valid contract. The fiduciary does not transfer away its own duties by hiring a vendor.",
  },
  {
    title: "Retention and deletion",
    body: "Erase personal data when the purpose is no longer served or consent is withdrawn, unless the law requires you to keep it. Keep a retention schedule your teams can actually follow.",
  },
  {
    title: "Significant Data Fiduciaries",
    body: "The Central Government may designate Significant Data Fiduciaries by volume, sensitivity, and risk. Those organisations have additional duties, including a Data Protection Officer based in India, an independent data auditor, and periodic assessments. Designation is a government act. This page does not decide whether any organisation is one.",
  },
] as const;

export const CMP_CAPABILITIES = [
  {
    title: "Consent banner and Banner Studio",
    body: "Publish a banner that presents the notice and collects an accept, reject, or purpose-level choice. Banner Studio edits the draft. The live site uses the last published policy version.",
  },
  {
    title: "Preference center",
    body: "Give returning visitors a place to review purposes and change an earlier choice without contacting support.",
  },
  {
    title: "Granular purposes",
    body: "Define purposes, mark what is required and what is optional, and map those purposes to vendors and trackers.",
  },
  {
    title: "Consent records and receipts",
    body: "Store the decision with a consent identifier, timestamp, locale, and policy snapshot. Export a consent receipt with cryptographic proof of the recorded decision.",
  },
  {
    title: "Policy versioning",
    body: "Draft, publish, schedule, and roll back policy versions. Rollback copies an older version forward. It does not rewrite the history of what was live.",
  },
  {
    title: "Notice translations",
    body: "Serve banner and preference-center text in English and the 22 Eighth Schedule languages, using your translations or the built-in Indian language pack.",
  },
  {
    title: "Cookie and tracker discovery",
    body: "Scan a site for cookies, scripts, and third-party trackers, classify them against purposes and vendors, and review findings when coverage drifts.",
  },
  {
    title: "Script and SDK control",
    body: "The installed SDK applies the recorded choice before optional scripts run. The consent firewall shows which trackers would be blocked when consent is withheld.",
  },
  {
    title: "APIs, webhooks, and integrations",
    body: "Issue API keys, deliver consent and rights events to your endpoints, and connect consent signals to the tools you configure, including Google Consent Mode where that integration is enabled.",
  },
  {
    title: "Audit trail and analytics",
    body: "Review workspace audit logs for configuration and access changes, and use consent analytics for rates and preference outcomes.",
  },
  {
    title: "Organisations, roles, and retention",
    body: "Run separate organisation workspaces, invite members with roles, and set how long evidence and operational records are kept.",
  },
  {
    title: "Rights-request workflows",
    body: "Intake and track access, correction, erasure, nomination, grievance, and consent-withdrawal requests through the privacy-rights workspace and the public Privacy Centre.",
  },
  {
    title: "Children and guardian consent",
    body: "For a child-directed property, configure age assurance and a guardian-consent step so optional processing waits for a verified parent or guardian.",
  },
  {
    title: "Vendors, transfers, and cross-domain consent",
    body: "Catalog processors, record cross-border transfer activities, and exchange portable consent across domains you configure.",
  },
] as const;

export const CONSENT_LIFECYCLE = [
  {
    title: "Notice",
    body: "The organisation explains the personal data and the purpose before asking for a choice.",
  },
  {
    title: "Consent request",
    body: "A banner or preference center asks for a clear action, purpose by purpose.",
  },
  {
    title: "User choice",
    body: "The person accepts, rejects, or selects the purposes they agree to.",
  },
  {
    title: "Consent recorded",
    body: "The decision, time, notice version, and purposes are stored as evidence.",
  },
  {
    title: "Consent applied",
    body: "Optional scripts and vendors run only for purposes the record allows.",
  },
  {
    title: "Change or withdraw",
    body: "The person can reopen preferences and withdraw as readily as they consented.",
  },
  {
    title: "Consent updated",
    body: "The new decision is stored and sent to the systems you have connected.",
  },
] as const;

export const DPDP_FAQS: FaqItem[] = [
  {
    question: "What is the DPDP Act?",
    answer:
      "The Digital Personal Data Protection Act, 2023 is India's law on the processing of digital personal data. It sets rules for when personal data may be processed, how consent and notice work, what rights a Data Principal has, and what duties a Data Fiduciary must meet. The Rules notified under the Act fill in procedure, forms, and timelines. Commencement and some operational details depend on government notification. This page is a general explanation, not legal advice.",
  },
  {
    question: "Who does the DPDP Act apply to?",
    answer:
      "It applies to processing of digital personal data in India. It can also apply to processing outside India if that processing is in connection with offering goods or services to people in India. Some processing, including certain State functions, research, and other cases listed in the Act, is exempt or treated differently. Whether a specific activity is in scope is a legal question for that organisation.",
  },
  {
    question: "What is personal data?",
    answer:
      "Personal data is any data about an individual who is identifiable by, or in relation to, that data. Under this Act the focus is digital personal data: data already in digital form, or data collected in another form and then digitised.",
  },
  {
    question: "Who is a Data Principal?",
    answer:
      "The Data Principal is the individual the personal data is about. Where the individual is a child, the parent or lawful guardian acts for them. Where the individual is a person with a disability who has a lawful guardian, that guardian acts for them.",
  },
  {
    question: "What is a Data Fiduciary?",
    answer:
      "A Data Fiduciary is the person who alone or with others decides the purpose and means of processing personal data. If your organisation chooses why the data is collected and how it will be used, you are likely the fiduciary for that processing. A Data Processor handles data for the fiduciary and does not become the decision-maker merely by hosting or tagging it.",
  },
  {
    question: "What is consent under the DPDP framework?",
    answer:
      "Consent is a free, specific, informed, unconditional, and unambiguous indication of the Data Principal's agreement to process their personal data for a specified purpose. It must be given through a clear affirmative action, and it is limited to the personal data necessary for that purpose. Some processing can instead rely on a legitimate use the Act lists. Those uses are specific. They are not a general permission to skip consent for marketing or optional cookies.",
  },
  {
    question: "Can consent be withdrawn?",
    answer:
      "Yes, where processing is based on consent. The Data Principal may withdraw consent at any time, and the withdrawal route must be as easy as the route used to give consent. Withdrawal does not undo processing that was lawful before the withdrawal. After withdrawal, the fiduciary stops the processing that depended on that consent, unless another ground in the Act applies, and erases the data when erasure is required.",
  },
  {
    question: "What is a Consent Manager?",
    answer:
      "Under the Act, a Consent Manager is a person registered with the Data Protection Board of India. Through that platform, a Data Principal can give, manage, review, and withdraw consent. The Consent Manager acts on the principal's behalf and is accountable to them. Registration conditions are set out in the Rules. A software product that collects consent for one company's websites is a consent management platform. It is not, by that fact alone, a registered Consent Manager.",
  },
  {
    question: "Why is consent management important?",
    answer:
      "The Act ties consent to a stated purpose, expects a real choice, and expects withdrawal to be straightforward. Organisations also need to show what was asked and what was granted if a person, a customer, or the Board asks later. A consent record, a current notice, and a working withdrawal path are how those duties are operated day to day. They do not exhaust every duty in the Act.",
  },
  {
    question: "What is a privacy notice?",
    answer:
      "In this framework, the notice that accompanies a request for consent is an itemised description of the personal data and the purpose of processing. It should also explain how to withdraw consent, how to exercise Data Principal rights, and how to complain to the Board. A privacy policy page can hold the wider explanation. The notice at the moment of choice still has to stand on its own.",
  },
  {
    question: "What rights do Data Principals have?",
    answer:
      "The Act provides a right to obtain information about personal data being processed, a right to correction and erasure, a right of grievance redressal, and a right to nominate another person to exercise rights on death or incapacity. Withdrawal of consent is available where processing relies on consent. These rights have conditions and procedures in the Act and the Rules. Rights that exist in other laws, such as a general right of data portability, should be claimed under the law that actually grants them.",
  },
  {
    question: "How should organisations manage children's data?",
    answer:
      "Before processing a child's personal data, the Data Fiduciary must obtain verifiable consent of the parent or lawful guardian. The Act also restricts processing that is likely to cause a detrimental effect on the child, and it restricts tracking, behavioural monitoring, and targeted advertising directed at children. The Central Government may prescribe exemptions and the manner of verification. A checkbox that asks a child to confirm they are an adult is a weak control. The exact verification method should follow the Rules and current Board guidance.",
  },
  {
    question: "How does a CMP help with DPDP compliance?",
    answer:
      "A consent management platform can present the notice, collect purpose-level choices, store the record, block optional scripts that lack consent, offer a preference center for withdrawal, and pass the decision to systems you integrate. ConsentGuru provides those workflows. Compliance still depends on whether the organisation's purposes, notices, contracts, security, retention, and grievance handling meet the Act.",
  },
  {
    question: "Does a CMP automatically make an organisation DPDP compliant?",
    answer:
      "No. Installing ConsentGuru does not make an organisation compliant, and it does not register the organisation as a Consent Manager. The platform is a control for notices, choices, evidence, and enforcement of those choices. The Data Fiduciary remains responsible for its processing, its vendors, its security safeguards, and its responses to Data Principals.",
  },
  {
    question: "What happens when a user withdraws consent?",
    answer:
      "The new decision should be recorded, and processing that relied on the withdrawn consent should stop unless a different lawful ground applies. In ConsentGuru, a visitor can change or withdraw choices in the preference center. The updated record is what the SDK and connected webhooks use. Erasure of the underlying personal data is a separate fiduciary duty, subject to any legal requirement to retain it. The product's retention settings control how long consent evidence and operational logs are kept. They do not, by themselves, erase every system the organisation operates.",
  },
  {
    question: "How should organisations maintain consent records?",
    answer:
      "Keep enough detail to show who, or which visitor identifier you actually use, agreed to which purposes, under which notice and policy version, and when. Store later changes, including withdrawal, without deleting the earlier event. ConsentGuru keeps consent records, policy snapshots, and exportable receipts for that purpose. How long you retain them, and whether a given identifier is personal data, should be decided with your retention schedule and counsel.",
  },
];

export const DPDP_DISCLAIMER =
  "This page explains the Digital Personal Data Protection Act, 2023 in general terms for organisations evaluating consent management. It is not legal advice, a legal opinion, or a compliance certification. Duties, exemptions, timelines, notice format, breach intimation, children's-data verification, Consent Manager registration, and penalties depend on the Act, the Rules, government notifications, and guidance from the Data Protection Board. ConsentGuru does not warrant that this summary is complete or current. Use of ConsentGuru does not, by itself, make an organisation compliant. Obtain advice from qualified counsel for your own processing.";
