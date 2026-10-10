import type { SeoLanding } from "@/content/seo-landings";

const crumb = (name: string, path: string) => ({ name, path });

/**
 * Pages with a distinct search intent from the original landings.
 * Near-duplicate URLs are redirects in next.config.ts, not extra copies of the same article.
 */
export const SEO_TOPIC_PAGES: SeoLanding[] = [
  {
    path: "/dpdp-compliance",
    title: "DPDP Compliance",
    description:
      "How organizations operationalize DPDP Act duties: purpose-bound notices, consent records, withdrawal, and Data Principal requests. Not a compliance guarantee.",
    kicker: "India",
    h1: "DPDP compliance for businesses that process digital personal data",
    lede:
      "DPDP compliance is the work of meeting the Digital Personal Data Protection Act, 2023 for the processing you actually do. Consent Guru helps teams run the consent and rights parts of that work.",
    directAnswer: {
      question: "What is DPDP compliance?",
      answer:
        "DPDP compliance means handling digital personal data in line with India’s Digital Personal Data Protection Act, 2023: a lawful ground, a clear notice where consent is used, a way to withdraw consent, and a way for people to exercise Data Principal rights. Software can help operate those steps. It does not, by itself, make an organization compliant.",
    },
    breadcrumb: [crumb("DPDP", "/dpdp"), crumb("DPDP compliance", "/dpdp-compliance")],
    problemTitle: "Compliance is a set of duties, not a banner setting",
    problem: [
      "The Act applies to digital personal data processed in India and, in defined cases, to processing outside India that is connected with offering goods or services to people in India. A Data Fiduciary decides the purpose and means of that processing. A Data Processor acts on the fiduciary’s behalf.",
      "Consent is one lawful ground. The Act also lists specific legitimate uses where consent is not the basis. Treating every cookie or every form as “DPDP consent” misstates the statute. Counsel still has to decide which ground applies.",
      "Consent Guru is consent management software for the operational layer: the notice you publish, the choice you store, withdrawal, and Data Principal request intake. Registration as a Consent Manager with the Data Protection Board is a separate statutory process. Shipping this product is not that registration.",
    ],
    howTitle: "An operational sequence teams can actually run",
    steps: [
      {
        title: "Name the processing",
        body: "List the personal data and the purpose. Mark what is necessary for the service and what is optional, such as analytics or advertising.",
      },
      {
        title: "Choose the ground",
        body: "For each purpose, decide whether you are asking for consent or relying on a legitimate use the Act lists. Do not relabel one as the other inside the banner.",
      },
      {
        title: "Publish the notice",
        body: "Present the personal data, the purpose, how to withdraw, how to exercise rights, and how to complain to the Board, in language the person can follow.",
      },
      {
        title: "Record, honor, and review",
        body: "Store the choice with the notice version. Let the person withdraw as easily as they agreed. Route access, correction, erasure, nomination, and grievance requests through a tracked path.",
      },
    ],
    features: [
      {
        title: "DPDP compliance for websites",
        body: "Publish a purpose-level banner and preference center on a verified domain, then apply the recorded choice to the scripts you have mapped.",
      },
      {
        title: "DPDP compliance for SaaS",
        body: "Use the consent API when the choice is collected in an account settings page instead of, or as well as, a public cookie banner.",
      },
      {
        title: "Consent records under DPDP",
        body: "Keep an identifier, timestamp, locale, and a snapshot of the notice that was shown, so a later question is not answered from memory.",
      },
      {
        title: "Data Principal rights",
        body: "The public Privacy Centre intakes access, correction, erasure, nomination, grievance, and consent-withdrawal requests, with a tracking reference.",
      },
    ],
    benefits: [
      "Notices and records that refer to the same purposes.",
      "Withdrawal that writes a new decision instead of silently deleting the history.",
      "A separation between product configuration and a legal opinion.",
      "A longer statute guide when the team needs the map of the Act, not the workspace tour.",
    ],
    useCases: [
      {
        title: "DPDP compliance for businesses",
        body: "Give privacy, legal, and engineering one published policy to implement for an India-facing service.",
      },
      {
        title: "Global companies with users in India",
        body: "Run a DPDP-oriented configuration on the properties that need it without copying that wording onto a GDPR or CPRA site.",
      },
      {
        title: "Children’s services",
        body: "Add age assurance and guardian consent before optional processing on a property directed at children.",
      },
    ],
    considerations: [
      "This page is an operational guide, not legal advice. The Act, the DPDP Rules, sector rules, and any Consent Manager registration requirements should be confirmed with counsel.",
      "Consent Guru helps organizations manage and operationalize consent requirements. It does not guarantee DPDP compliance, and it does not determine Significant Data Fiduciary status.",
      "Public readiness tools on this site are preliminary checks. They are not a finding of the Data Protection Board.",
    ],
    faqs: [
      {
        question: "What is DPDP compliance software?",
        answer:
          "It is software that helps a team present notices, collect and store purpose-level choices, support withdrawal, and intake Data Principal requests. It is an aid to a compliance program, not a certificate that the program is complete.",
      },
      {
        question: "How can organizations manage consent under DPDP?",
        answer:
          "Publish a specific notice, collect a clear affirmative action for each purpose that relies on consent, store the notice version with the choice, and make withdrawal as easy as the original request. Stop processing that depended on the withdrawn consent unless another ground the Act allows still applies.",
      },
      {
        question: "Is Consent Guru a registered Consent Manager?",
        answer:
          "No. A Consent Manager under the Act is a person registered with the Data Protection Board, accountable to the Data Principal. Consent Guru is software a Data Fiduciary can use. Those are different roles.",
      },
    ],
    related: [
      { href: "/dpdp-consent-requirements", label: "DPDP consent requirements", text: "What the Act expects of a valid consent and notice." },
      { href: "/dpdp", label: "DPDP consent management", text: "How the product maps notice, consent, records, and rights." },
      { href: "/dpdp-act", label: "DPDP Act guide", text: "A longer explanation of the statute." },
      { href: "/consent-records", label: "Consent records", text: "What is stored with a choice, and what withdrawal does not erase." },
      { href: "/e-learning", label: "DPDP Act training", text: "A 30-module course and a certificate of completion." },
      { href: "/tools", label: "DPDP tools", text: "Preliminary readiness and notice checks." },
    ],
    software: true,
  },
  {
    path: "/dpdp-consent-requirements",
    title: "DPDP Act Consent Requirements",
    description:
      "What consent under the DPDP Act requires: a clear affirmative action, a purpose-bound notice, withdrawal, and records. Educational only, not legal advice.",
    kicker: "India",
    h1: "Consent requirements under the DPDP Act",
    lede:
      "When a Data Fiduciary relies on consent, the Digital Personal Data Protection Act, 2023 sets a standard for how that consent is asked for, limited, and withdrawn. This page explains that standard in operational language.",
    directAnswer: {
      question: "What is consent under the DPDP Act?",
      answer:
        "Consent is a free, specific, informed, unconditional, and unambiguous indication that the Data Principal agrees to the processing of their personal data for a specified purpose. It must be given by a clear affirmative action, and it is limited to the personal data necessary for that purpose.",
    },
    breadcrumb: [crumb("DPDP Act", "/dpdp-act"), crumb("Consent requirements", "/dpdp-consent-requirements")],
    problemTitle: "A bundled accept click does not meet the standard by itself",
    problem: [
      "The Act allows processing with the Data Principal’s consent or for a legitimate use it specifically lists. If you are in the consent path, silence, a pre-ticked box, or a single unavoidable accept for unrelated purposes is not the clear agreement the statute describes.",
      "The request for consent is accompanied or preceded by a notice. The notice should let the person understand the personal data and the purpose, how they can withdraw, how they can exercise their rights, and how they can complain to the Board. The DPDP Rules can specify how that notice is presented. Confirm the current particulars with counsel before you freeze the copy.",
      "Withdrawal has to be as easy as giving consent. Processing that was lawful before withdrawal does not become unlawful because the person later withdraws. After withdrawal, the fiduciary must stop processing that relied on the consent, and cause its processors to stop, unless the Act or another law still requires that processing.",
    ],
    howTitle: "How the requirements show up in a consent workflow",
    steps: [
      {
        title: "Identify the Data Principal",
        body: "The Data Principal is the individual the personal data relates to. For a child, the parent or lawful guardian acts in that role. The same is true for a person with a disability who has a lawful guardian.",
      },
      {
        title: "Limit the ask",
        body: "Ask only for the personal data necessary for the stated purpose. Keep a purpose that is necessary for the service separate from an optional purpose such as advertising.",
      },
      {
        title: "Take a clear action",
        body: "The person does something that indicates agreement. Inactivity is not that action.",
      },
      {
        title: "Keep the path open",
        body: "The same person can review and withdraw the choice later, with no harder steps than the original request.",
      },
    ],
    features: [
      {
        title: "Notice and consent under DPDP",
        body: "Banner and preference-center text can be published in English or a configured Eighth Schedule language, and the consent record points at the version that was live.",
      },
      {
        title: "Digital consent under DPDP",
        body: "The choice can be collected in the browser SDK or written from your own application through the consent API. Either way, it is tied to purposes you defined.",
      },
      {
        title: "Withdrawal of consent under DPDP",
        body: "The preference center is the returning path. The new decision becomes what enforcement follows. The earlier evidence remains according to retention and any legal hold.",
      },
      {
        title: "Where a Consent Manager fits",
        body: "The Act lets a Data Principal give, manage, review, and withdraw consent through a registered Consent Manager. That role is accountable to the Data Principal. A website’s consent platform is not automatically that role.",
      },
    ],
    benefits: [
      "A shared vocabulary for legal and engineering.",
      "Purpose-level choices instead of one site-wide flag.",
      "A record of the notice that was actually shown.",
      "A public guide teams can read before they open the workspace.",
    ],
    useCases: [
      {
        title: "Website notices",
        body: "Draft purpose copy that matches the processing the site performs, then publish it as the version the SDK serves.",
      },
      {
        title: "Product and privacy reviews",
        body: "Check a new vendor or tag against an existing purpose before it is added to the live notice.",
      },
      {
        title: "Training",
        body: "Pair this page with the DPDP Act guide and the 30-module course when a team is learning the statute.",
      },
    ],
    considerations: [
      "This is not a restatement of every section, and it is not legal advice. Legitimate uses, children’s data, cross-border transfers, and breach duties sit outside a consent banner.",
      "Do not describe a record as consent if the organization is relying on a different ground.",
    ],
    faqs: [
      {
        question: "What is a Data Principal?",
        answer:
          "The Data Principal is the individual to whom the personal data relates. Where the individual is a child, or a person with a disability who has a lawful guardian, the parent or guardian acts as the Data Principal.",
      },
      {
        question: "What information should a consent notice contain?",
        answer:
          "With a request for consent, the notice should explain the personal data and the purpose of processing, how the person may withdraw consent, how they may exercise their rights, and how they may complain to the Data Protection Board. Present it in clear language. Check the current Rules for any itemised form the notice must take.",
      },
      {
        question: "How can users withdraw consent?",
        answer:
          "The Act gives the Data Principal the right to withdraw consent at any time, with ease comparable to giving it. In Consent Guru, that path is the privacy preference center, or an API call from a settings page you operate. Withdrawal updates the current choice.",
      },
      {
        question: "How should consent records be maintained?",
        answer:
          "Keep the choice together with when it was made, the purposes it covered, and the notice version that was shown. Retain it for the period your policy sets. Do not delete historical evidence merely because the person later withdraws, unless retention rules and legal holds allow that deletion.",
      },
      {
        question: "What is consent evidence?",
        answer:
          "Consent evidence is the retained proof of what was asked and what was decided. In this product that includes a consent identifier, a policy snapshot, and, when you export a receipt, cryptographic proof of that snapshot. It shows what your system recorded. It does not by itself prove that the underlying processing was lawful.",
      },
    ],
    related: [
      { href: "/dpdp-compliance", label: "DPDP compliance", text: "How teams operationalize these requirements." },
      { href: "/dpdp", label: "DPDP consent management", text: "The product workflow for notice, consent, and rights." },
      { href: "/consent-records", label: "Consent records", text: "Identifiers, snapshots, receipts, and retention." },
      { href: "/privacy-preference-center", label: "Privacy preference center", text: "Where a person reviews or withdraws a choice." },
      { href: "/dpdp-act", label: "Full DPDP Act guide", text: "Concepts, rights, duties, and children’s data." },
    ],
  },
  {
    path: "/consent-records",
    title: "Consent Records and Evidence",
    description:
      "Consent records, logs, receipts, and an audit trail: what Consent Guru stores with a choice, and what a withdrawal does not erase.",
    kicker: "Evidence",
    h1: "Consent records, receipts, and evidence",
    lede:
      "A consent record is the operational memory of a choice. Consent evidence is what you can show later: which notice was live, what the person selected, and when that state changed.",
    directAnswer: {
      question: "What is a consent record?",
      answer:
        "A consent record is the stored decision for a person, site, and policy: an identifier, the time, the locale, the purposes, and the status, such as granted, denied, or withdrawn. Consent evidence adds the notice snapshot and, when you export it, cryptographic proof of that recorded decision.",
    },
    breadcrumb: [crumb("Consent management", "/consent-management"), crumb("Consent records", "/consent-records")],
    problemTitle: "A current toggle is not an audit trail",
    problem: [
      "Privacy teams are often asked what someone agreed to six months ago, not what the banner says today. If the only artifact is the latest cookie, that question cannot be answered.",
      "Consent Guru stores the decision with a consent identifier, timestamp, locale, and a snapshot of the notice that was shown. Changing or withdrawing a choice writes the new decision. It does not rewrite the earlier snapshot. Automated cleanup follows the retention settings you configure, and it skips records under a legal hold.",
    ],
    howTitle: "How a record moves through its life",
    steps: [
      {
        title: "Collect",
        body: "The banner, preference center, or consent API records a specific action against the purposes on the published policy.",
      },
      {
        title: "Store",
        body: "The record keeps the identifier and the policy snapshot so a reviewer can see the wording that was presented.",
      },
      {
        title: "Prove",
        body: "A consent receipt can carry cryptographic proof: a SHA-256 hash of the canonical decision payload, then an HMAC-SHA256 signature.",
      },
      {
        title: "Update",
        body: "Withdrawal or a later preference change becomes the state enforcement follows. Historical evidence stays until retention, or a legal hold, says otherwise.",
      },
    ],
    features: [
      {
        title: "Consent logs",
        body: "Workspace views and audit logs cover the decision itself and the configuration or access changes around it.",
      },
      {
        title: "Consent receipts",
        body: "An export can show the recorded decision and the notice snapshot, for the person or the team that needs to explain it.",
      },
      {
        title: "Consent history",
        body: "The current choice and the historical snapshot are different objects. One can change while the other remains.",
      },
      {
        title: "Retention you can describe",
        body: "Retention windows cover consent evidence, consent records, audit events, and rights requests separately.",
      },
    ],
    benefits: [
      "A lookup by consent identifier when someone asks what they agreed to.",
      "Proof that is tied to a notice version, not a screenshot of today’s banner.",
      "Withdrawal that downstream systems can follow.",
      "Legal holds when a matter requires the record to stay.",
    ],
    useCases: [
      {
        title: "Privacy reviews",
        body: "Show the snapshot and the audit entry instead of reconstructing a campaign from memory.",
      },
      {
        title: "Support",
        body: "Find the decision a person refers to without opening every tag manager.",
      },
      {
        title: "Regulatory questions",
        body: "Explain what was recorded. The record does not replace a lawyer’s view of whether the processing was lawful.",
      },
    ],
    considerations: [
      "Evidence of a click is not evidence that every downstream vendor honored it. Pair records with consent enforcement for the tags you control.",
      "Retention of consent evidence is itself processing of personal data. Set it to match the policy you have adopted.",
    ],
    technical: [
      {
        title: "Hashes and signatures",
        body: "Notice snapshots can be hashed with SHA-256. Receipts can be signed with HMAC so a later export can be checked against tampering of the stored decision.",
      },
      {
        title: "API lookup",
        body: "Authenticated API keys can read or record consent from your backend. The browser SDK uses a different path and a site key.",
      },
    ],
    faqs: [
      {
        question: "What is a consent receipt?",
        answer:
          "A consent receipt is an export of a recorded decision and the circumstances stored with it: purposes, time, and the policy snapshot. In Consent Guru it can include cryptographic proof of that payload.",
      },
      {
        question: "What is a consent audit trail?",
        answer:
          "It is the retained history of the decision plus the workspace audit log of configuration and access changes. Together they show what was recorded and what an administrator later changed.",
      },
      {
        question: "Does withdrawal delete the old record?",
        answer:
          "No. The current choice updates. Historical consent evidence is kept according to your retention settings and any legal hold.",
      },
    ],
    related: [
      { href: "/consent-management", label: "Consent management", text: "Collection, storage, withdrawal, and enforcement as one lifecycle." },
      { href: "/consent-enforcement", label: "Consent enforcement", text: "How the current record is applied to scripts and trackers." },
      { href: "/security", label: "Security controls", text: "Signatures, access control, and retention." },
      { href: "/dpdp-consent-requirements", label: "DPDP consent requirements", text: "Why the notice version matters under the Act." },
      { href: "/blogs/recording-consent-evidence-audits", label: "Evidence article", text: "A longer note on recording consent for audits." },
    ],
    software: true,
  },
  {
    path: "/consent-enforcement",
    title: "Consent Enforcement",
    description:
      "Consent enforcement applies a recorded choice to mapped scripts and trackers. It does not recall a request that already left the browser.",
    kicker: "Enforcement",
    h1: "Consent enforcement for the choices you record",
    lede:
      "Consent enforcement is how a recorded allow or deny reaches the tags, cookies, and scripts that would otherwise run on their own.",
    directAnswer: {
      question: "What is consent enforcement?",
      answer:
        "Consent enforcement means applying the current consent record to the technologies you have mapped, so optional scripts and trackers wait on the purposes the person allowed. It covers what the SDK can see and what you configured. It cannot undo a request that already left the browser.",
    },
    breadcrumb: [crumb("Consent management", "/consent-management"), crumb("Consent enforcement", "/consent-enforcement")],
    problemTitle: "A stored choice that never reaches the tag is only a log",
    problem: [
      "Teams often collect a banner click and leave the tag manager unchanged. The person refused advertising, and the advertising tag still loaded. Enforcement is the step that connects those two facts.",
      "Consent Guru’s SDK can pause known optional script URLs when the mapped purpose is denied, and it can update Google consent signals when Consent Mode is enabled for that website. Tags already inside a container, or injected before the SDK runs, still need their own checks.",
    ],
    howTitle: "How enforcement runs on a page",
    steps: [
      {
        title: "Map",
        body: "Classify cookies, scripts, and vendors against purposes. Unmapped tags are a review list, not a silent allow.",
      },
      {
        title: "Default",
        body: "Optional purposes stay off until there is a recorded choice, when that is the experience you published.",
      },
      {
        title: "Apply",
        body: "After the person chooses, the SDK follows the record: allowed purposes can load, denied purposes stay paused.",
      },
      {
        title: "Update",
        body: "A later withdrawal changes the current record. Enforcement follows the update. It does not rewrite the evidence of the earlier choice.",
      },
    ],
    features: [
      {
        title: "Script and tracker control",
        body: "The bootstrap can pause known optional loader URLs. It is not a promise that every unknown tracker on the internet is blocked.",
      },
      {
        title: "Consent-aware tags",
        body: "Google Consent Mode, when you enable it, maps purposes to signals such as analytics_storage and ad_storage.",
      },
      {
        title: "Consent enforcement API",
        body: "Your backend can read the same choice through an API key and apply it in systems the browser SDK never sees.",
      },
      {
        title: "Scanner as a review aid",
        body: "Discovery lists cookies and script patterns. It does not recategorize production tags without a published policy.",
      },
    ],
    benefits: [
      "Fewer optional tags firing before a choice.",
      "One purpose model for the banner and the tag decision.",
      "A server-side path when the browser is not the system of record.",
      "A clear limit: enforcement follows configuration, not an invisible guarantee.",
    ],
    useCases: [
      {
        title: "Marketing sites",
        body: "Hold analytics and advertising loaders until the matching purpose is allowed.",
      },
      {
        title: "Tag managers",
        body: "Pause the loader URL you know about, and keep consent checks inside the container for tags that are already there.",
      },
      {
        title: "Logged-in products",
        body: "Read the record from the API and gate server-side processing the same way.",
      },
    ],
    considerations: [
      "Enforcement does not decide whether you needed consent in the first place. It applies the model you configured.",
      "A tag that runs from a domain you did not map, or that fired before the SDK, is outside what this control can retract.",
    ],
    technical: [
      {
        title: "Early blocking",
        body: "The embed runs a blocking bootstrap so mapped optional scripts can wait. Requests that already left the browser stay sent.",
      },
      {
        title: "Webhooks",
        body: "Signed webhooks can tell your systems that a choice changed, so warehouses and apps are not left on the previous state.",
      },
    ],
    faqs: [
      {
        question: "Does consent enforcement block every cookie?",
        answer:
          "No. It applies the purposes you published to the scripts and cookies you mapped. Strictly necessary technologies that you have marked as required are not treated as optional. Unknown tags still need a review.",
      },
      {
        question: "What is consent-based tracking?",
        answer:
          "It means measurement or advertising tags run only when the purpose they are mapped to has been allowed. The mapping is yours to configure and to keep current.",
      },
      {
        question: "Can enforcement replace a privacy review?",
        answer:
          "No. It is a control in the browser and, through the API, in your systems. Contracts, notices, and the choice of lawful ground remain separate work.",
      },
    ],
    related: [
      { href: "/cookie-consent-manager", label: "Cookie consent management", text: "Discover cookies and map them to purposes." },
      { href: "/google-consent-mode", label: "Google Consent Mode", text: "Purpose-to-signal mapping for Google tags." },
      { href: "/consent-records", label: "Consent records", text: "The decision enforcement is applying." },
      { href: "/developers", label: "Consent SDK", text: "Install the script that performs browser enforcement." },
      { href: "/consent-api", label: "Consent API", text: "Read the same choice from your backend." },
    ],
    software: true,
  },
  {
    path: "/enterprise-consent-management",
    title: "Enterprise Consent Management",
    description:
      "Enterprise consent management for multiple sites, roles, consent records, an API, and an SDK. Plan limits apply. Compliance is not guaranteed.",
    kicker: "Enterprise",
    h1: "Enterprise consent management across sites and teams",
    lede:
      "Enterprise consent management is the same lifecycle — notice, choice, record, enforcement, withdrawal — run across more than one property, with access control and a way for your own systems to participate.",
    directAnswer: {
      question: "What is enterprise consent management?",
      answer:
        "Enterprise consent management is how an organization governs consent across websites, brands, or products: shared purpose models where you want them, separate policies where you do not, roles for who can publish, and records and APIs the rest of the stack can use.",
    },
    breadcrumb: [
      crumb("Consent management platform", "/consent-management-platform"),
      crumb("Enterprise", "/enterprise-consent-management"),
    ],
    problemTitle: "A single-site banner does not scale to a group of properties",
    problem: [
      "A group with several brands usually has several domains, several tag stacks, and several people who can change a notice. Copying a banner snippet into each template, with no record of who published it, breaks the first time counsel asks for the version that was live.",
      "Consent Guru keeps a website record per property, checks that a site key is used on the host it was registered for, and stores consent per published policy. Roles limit who can change configuration. The consent API and signed webhooks carry the choice to systems outside the browser.",
    ],
    howTitle: "How a multi-site rollout is structured",
    steps: [
      {
        title: "Separate properties",
        body: "Register each website and domain. Publish the policy that belongs to that property instead of one global file for every brand.",
      },
      {
        title: "Share only what should be shared",
        body: "Purposes can be modeled per site. Portable consent across domains happens only where you have explicitly configured it.",
      },
      {
        title: "Control who publishes",
        body: "Organization members have roles. Dashboard changes are tied to the organization, and private routes are not indexed.",
      },
      {
        title: "Connect the stack",
        body: "Install the SDK on each verified site. Use API keys and webhooks where a product backend or warehouse must see the same state.",
      },
    ],
    features: [
      {
        title: "Multi-domain consent",
        body: "Each property has its own site key, domain check, and published version. How many domains a workspace includes depends on the plan.",
      },
      {
        title: "Consent governance",
        body: "Audit logs record configuration and access changes next to the consent evidence, so a publish is not an unlogged edit.",
      },
      {
        title: "Consent management API and SDK",
        body: "The SDK runs the banner and browser enforcement. The API is the authenticated path for servers. They are not interchangeable credentials.",
      },
      {
        title: "Regional configurations",
        body: "A property can run a DPDP-oriented notice, a GDPR-style consent experience, or a CCPA/CPRA opt-out. The labels should not be copied across regimes.",
      },
    ],
    benefits: [
      "A published version per site, with history.",
      "Roles instead of a shared password for the banner.",
      "Records and enforcement that travel with the property, not a slide.",
      "A quote path for Silver, Gold, and Platinum rather than a guessed enterprise price on this page.",
    ],
    useCases: [
      {
        title: "Multi-brand groups",
        body: "Keep notice copy and vendor mappings aligned with each brand’s actual processing.",
      },
      {
        title: "SaaS with customer sites",
        body: "Collect in-product preferences through the API, and use the SDK where a marketing site needs a banner.",
      },
      {
        title: "Privacy and engineering",
        body: "Legal reviews the purposes. Engineering installs the SDK. Both look at the same record.",
      },
    ],
    considerations: [
      "Enterprise features do not include a promise of compliance. The organization still decides lawful grounds, contracts, and notices.",
      "Plan limits for domains, page views, and features are on the pricing page and can change. This page does not restate a quota.",
    ],
    faqs: [
      {
        question: "What is an enterprise CMP?",
        answer:
          "It is a consent management platform used across an organization’s properties, with administration, records, and integrations sized for more than a single brochure site. Consent Guru is that kind of platform. The fit depends on the plan and on how you configure it.",
      },
      {
        question: "Can one policy cover every domain?",
        answer:
          "You can model purposes consistently, but each website is registered and published on its own. Use one policy across domains only when the processing and the notice are actually the same.",
      },
      {
        question: "Where do we see plan differences?",
        answer:
          "The pricing page compares Silver, Gold, and Platinum and asks you to request a quote. Do not treat a marketing sentence as the contract.",
      },
    ],
    related: [
      { href: "/consent-management-platform", label: "Consent management platform", text: "The product overview." },
      { href: "/developers", label: "Consent SDK", text: "Domain verification and installation." },
      { href: "/consent-api", label: "Consent API", text: "Keys and signed webhooks." },
      { href: "/consent-records", label: "Consent records", text: "Evidence across the properties you publish." },
      { href: "/pricing", label: "Pricing", text: "Plans and a quote, including domain limits." },
      { href: "/security", label: "Security", text: "Roles, audit logs, and retention." },
    ],
    software: true,
  },
  {
    path: "/compare",
    title: "Compare Consent Platforms",
    description:
      "How to compare consent management platforms: records, enforcement, preference centers, and DPDP workflows. Verify every vendor claim.",
    kicker: "Buying guide",
    h1: "How to compare consent management platforms",
    lede:
      "A useful comparison asks whether a platform can run the consent lifecycle you need, and whether you can prove that later. A grid of checkmarks is only a start.",
    directAnswer: {
      question: "How should you compare consent management platforms?",
      answer:
        "Compare how each platform collects a purpose-level choice, stores consent records, lets people withdraw, enforces the choice on tags you control, and supports the privacy workflows you actually have — including DPDP where you process data in India. Confirm current behavior in the product, not only in a marketing matrix.",
    },
    breadcrumb: [crumb("Compare", "/compare")],
    problemTitle: "Feature checklists go stale, and some of them over-claim",
    problem: [
      "Searchers looking for the best consent management platform usually need a short list of differences: records, enforcement, administration, and the laws the team must operate under. They do not need a page that invents another vendor’s roadmap.",
      "Consent Guru’s homepage includes a capability matrix against other products. Treat that matrix as a prompt for questions. Confirm each row against current documentation from every vendor, including ours. This guide does not assign scores to named competitors.",
    ],
    howTitle: "Questions that separate a banner from a platform",
    steps: [
      {
        title: "What is recorded?",
        body: "Ask for a sample consent record: identifier, time, purposes, and the notice version. A yes/no flag with no snapshot is a weaker log.",
      },
      {
        title: "What is enforced?",
        body: "Ask which scripts the tool can pause, and which tags still fire if they load before the script or live inside a container.",
      },
      {
        title: "Who can change it?",
        body: "Ask how publishing, roles, and audit logs work when more than one person edits the notice.",
      },
      {
        title: "Which regime is it really for?",
        body: "A GDPR opt-in, a CPRA opt-out, and DPDP purpose-bound consent are different experiences. A vendor that uses one label for all three needs a closer look.",
      },
    ],
    features: [
      {
        title: "Consent records",
        body: "Look for a snapshot of the notice, not only the latest toggle, and for retention and legal holds you can explain.",
      },
      {
        title: "Preference center",
        body: "Withdrawal should be a normal path, with ease comparable to the original choice where the DPDP Act applies.",
      },
      {
        title: "API and SDK",
        body: "Browser collection and server-to-server access should be different credentials.",
      },
      {
        title: "Limits of the claim",
        body: "No platform on this list, including Consent Guru, should be described as guaranteeing legal compliance.",
      },
    ],
    benefits: [
      "A buying conversation grounded in artifacts.",
      "Room to reject a tool that only stores a cookie.",
      "A path into the pages that document what Consent Guru actually does.",
      "No invented rankings.",
    ],
    useCases: [
      {
        title: "Privacy leads",
        body: "Use the questions in a vendor review before a proof of concept.",
      },
      {
        title: "Procurement",
        body: "Ask for records, enforcement limits, and role models in the same questionnaire.",
      },
      {
        title: "India-facing programs",
        body: "Add DPDP notice, withdrawal, and Data Principal requests to the list. Do not stop at a GDPR cookie demo.",
      },
    ],
    considerations: [
      "Competitor capabilities change. This site does not publish a page that claims to know another company’s current product better than that company does.",
      "If a matrix and a product page disagree, trust the product page and the behavior in a workspace you control.",
    ],
    faqs: [
      {
        question: "What is a CMP comparison?",
        answer:
          "It is a structured look at consent management platforms on the jobs they perform: collection, records, preference management, enforcement, and administration. It is not a trophy list.",
      },
      {
        question: "Does Consent Guru publish competitor reviews?",
        answer:
          "The homepage matrix is a capability checklist. This page tells you how to read it. We do not publish scored reviews of named competitors.",
      },
      {
        question: "Where is the longer checklist?",
        answer:
          "The consent management platform comparison page walks through records, enforcement, DPDP workflows, and enterprise administration in more detail.",
      },
    ],
    related: [
      { href: "/compare/consent-management-platforms", label: "Platform comparison", text: "A checklist for records, enforcement, DPDP, and enterprise fit." },
      { href: "/consent-management-platform", label: "Consent management platform", text: "What Consent Guru implements." },
      { href: "/pricing", label: "Pricing", text: "Silver, Gold, and Platinum, then a quote." },
      { href: "/disclaimer", label: "Comparison disclaimer", text: "How to read capability comparisons on this site." },
    ],
  },
  {
    path: "/compare/consent-management-platforms",
    title: "Consent Management Platform Comparison",
    description:
      "A practical comparison checklist for consent management software: records, cookie consent, enforcement, analytics, and DPDP workflows.",
    kicker: "Buying guide",
    h1: "Consent management platform comparison",
    lede:
      "Use this checklist when you evaluate consent management software. It describes the jobs a platform should do, and how Consent Guru approaches each one, without scoring other vendors.",
    directAnswer: {
      question: "What should a consent management platform comparison include?",
      answer:
        "Include consent collection, cookie and preference management, consent records, enforcement, analytics, administration, and the specific privacy workflows you need, such as DPDP consent. Exclude any claim that a product creates legal compliance on its own.",
    },
    breadcrumb: [crumb("Compare", "/compare"), crumb("Platform comparison", "/compare/consent-management-platforms")],
    problemTitle: "The useful differences are operational",
    problem: [
      "Two products can both say “cookie banner” and still differ on whether the choice is stored with the notice text, whether a later withdrawal is a new record, and whether a tag that loads early is actually paused.",
      "For organizations in India, also ask how purpose-bound notices, withdrawal, language, and Data Principal requests are handled. A GDPR demo does not answer the DPDP Act.",
    ],
    howTitle: "Checklist",
    steps: [
      {
        title: "Collection",
        body: "Purpose-level accept, reject, and a preference center. Required purposes stay distinct from optional ones.",
      },
      {
        title: "Records",
        body: "Identifier, timestamp, locale, policy snapshot, and a receipt path. History survives a withdrawal, subject to retention and legal holds.",
      },
      {
        title: "Enforcement",
        body: "Mapped scripts follow the record. Ask what is outside that control: unknown domains, in-container tags, and requests that already fired.",
      },
      {
        title: "Operations",
        body: "Analytics for your own rates, roles, audit logs, an SDK, an API, and webhooks signed so you can reject a fake event.",
      },
    ],
    features: [
      {
        title: "Cookie consent",
        body: "Scanner findings are a review aid. Categories in the banner are the purposes you publish, not an automatic legal classification.",
      },
      {
        title: "DPDP consent management",
        body: "Notices, purpose-level consent, withdrawal, and rights intake are product workflows. Board registration as a Consent Manager is not included.",
      },
      {
        title: "GDPR and CPRA",
        body: "The same components can present an opt-in or an opt-out. The wording and the defaults have to match the regime you chose. They should not be copied blindly.",
      },
      {
        title: "Enterprise administration",
        body: "Per-website publishing, domain checks, and plan-based limits. Read the pricing page for quotas.",
      },
    ],
    benefits: [
      "A short list you can take into a proof of concept.",
      "Explicit non-goals, so a demo is not mistaken for a legal opinion.",
      "Links into the pages that document each capability.",
      "No fabricated market rank.",
    ],
    useCases: [
      {
        title: "Replacing a banner plugin",
        body: "Test whether you can export a record that includes the notice version, not only a cookie name.",
      },
      {
        title: "Adding India",
        body: "Read the DPDP requirements page, then configure one property before you roll the wording out.",
      },
      {
        title: "Security review",
        body: "Ask about API keys, webhook signatures, audit logs, and retention before you ask about dashboard charts.",
      },
    ],
    considerations: [
      "This comparison describes Consent Guru. It does not assert that another named product lacks a feature.",
      "Using any consent management platform, including this one, does not by itself satisfy GDPR, CCPA, CPRA, the DPDP Act, or any other law.",
    ],
    faqs: [
      {
        question: "What is the best consent management platform?",
        answer:
          "The best fit is the one that records the notice you showed, enforces the tags you mapped, and matches the regimes you operate, at a plan you can administer. That is a procurement decision. This page does not crown a winner.",
      },
      {
        question: "How is Consent Guru different from a cookie banner script?",
        answer:
          "The banner is one surface. The platform also keeps the published policy, the consent record, the preference center, analytics, and an API. A script that only sets a cookie does not do that list.",
      },
      {
        question: "Do you guarantee DPDP or GDPR compliance?",
        answer:
          "No. The product helps organizations manage and operationalize consent requirements. Compliance depends on your processing, your configuration, and the law that applies.",
      },
    ],
    related: [
      { href: "/compare", label: "How to compare", text: "The questions to ask before you trust a matrix." },
      { href: "/consent-management-platform", label: "Product overview", text: "Collection, records, and enforcement in one workspace." },
      { href: "/dpdp-compliance", label: "DPDP compliance", text: "India-specific operational steps." },
      { href: "/consent-records", label: "Consent records", text: "What a serious log contains." },
      { href: "/consent-enforcement", label: "Consent enforcement", text: "What the SDK can and cannot pause." },
      { href: "/enterprise-consent-management", label: "Enterprise", text: "Multi-site administration, API, and SDK." },
    ],
    software: true,
  },
];
