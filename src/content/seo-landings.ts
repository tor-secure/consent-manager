export type SeoBlock = { title: string; body: string };
export type SeoLink = { href: string; label: string; text: string };
export type SeoFaq = { question: string; answer: string };

export type SeoLanding = {
  path: string;
  title: string;
  description: string;
  kicker: string;
  h1: string;
  lede: string;
  breadcrumb: { name: string; path: string }[];
  problemTitle: string;
  problem: string[];
  howTitle: string;
  steps: SeoBlock[];
  features: SeoBlock[];
  benefits: string[];
  useCases: SeoBlock[];
  considerations: string[];
  technical?: SeoBlock[];
  faqs: SeoFaq[];
  related: SeoLink[];
  software?: boolean;
};

const product = (name: string, path: string) => ({ name, path });

export const SEO_LANDINGS: SeoLanding[] = [
  {
    path: "/consent-management-platform",
    title: "Consent Management Platform Overview",
    description:
      "A consent management platform for collecting choices, storing consent records, and applying them to cookies, tags, and privacy preferences.",
    kicker: "Product",
    h1: "A consent management platform for recorded choices",
    lede:
      "Consent Guru helps organizations present a choice, store the consent record, and apply that choice to cookies, tags, and later privacy requests.",
    breadcrumb: [product("Consent management platform", "/consent-management-platform")],
    problemTitle: "A banner is not a system of record",
    problem: [
      "Many sites collect a click and then lose the context: which notice version was shown, which purposes were optional, and whether the person later withdrew. A consent management platform keeps that context with the decision.",
      "Consent Guru is built as that system for websites. Legal and product teams publish a policy. The SDK presents it. The workspace keeps the consent log, the preference center, and the signals other tools are allowed to use.",
    ],
    howTitle: "How the platform works",
    steps: [
      { title: "Define purposes", body: "Mark what is required for the service and what is optional, then map vendors and trackers to those purposes." },
      { title: "Publish a notice", body: "Draft the banner and preference-center copy, then publish a version. The live site uses the last published version." },
      { title: "Record the choice", body: "The SDK stores the decision with a consent identifier, timestamp, locale, and a snapshot of the notice that was shown." },
      { title: "Apply and review", body: "Optional scripts wait on the recorded choice. Teams review consent analytics, audit logs, and later withdrawals from the same workspace." },
    ],
    features: [
      { title: "Consent records", body: "Each decision keeps an identifier and a policy snapshot so a later review can see what was actually presented." },
      { title: "Cookie and tracker discovery", body: "Scan a site for cookies, scripts, and third-party trackers, then classify them against purposes and vendors." },
      { title: "Privacy preference center", body: "Returning visitors can review purposes and change an earlier choice without contacting support." },
      { title: "Consent API and webhooks", body: "Issue API keys and deliver consent and rights events to endpoints you operate." },
    ],
    benefits: [
      "One published policy for the banner, the preference center, and the SDK.",
      "Evidence that includes the notice version, not only a yes or no.",
      "A place to review rates, withdrawals, and configuration changes.",
      "Separate organization workspaces, roles, and retention settings.",
    ],
    useCases: [
      { title: "Multi-site teams", body: "Publish per website, with domain checks so a site key is used on the host it was registered for." },
      { title: "Privacy operations", body: "Connect consent records with rights-request intake in the public Privacy Centre." },
      { title: "India and global properties", body: "Use the same workspace for DPDP-oriented notices and for GDPR or CCPA/CPRA preference flows." },
    ],
    considerations: [
      "A consent management platform helps you implement a process. It does not decide your lawful basis, and it does not make an organization compliant by itself.",
      "You still need notices, contracts, and a retention position that match the processing you actually do.",
    ],
    technical: [
      { title: "Browser SDK", body: "Install the SDK so the recorded choice can be applied before optional scripts run." },
      { title: "Google Consent Mode", body: "When enabled for a website, purpose choices can be mapped to Google consent signals, including ad_storage and analytics_storage." },
    ],
    faqs: [
      { question: "What is a consent management platform?", answer: "It is software that helps an organization present privacy choices, store the resulting consent records, and pass those choices to the tags, cookies, and systems that depend on them." },
      { question: "Does Consent Guru replace a privacy policy?", answer: "No. The platform publishes the notice you configure and records the choice. Your privacy policy, contracts, and legal review remain your responsibility." },
      { question: "Can consent records be audited?", answer: "Yes. Decisions keep a consent identifier, timestamp, locale, and policy snapshot. Workspace audit logs also record configuration and access changes." },
    ],
    related: [
      { href: "/consent-management", label: "User consent management", text: "How collection, withdrawal, and consent logs fit together." },
      { href: "/cookie-consent-manager", label: "Cookie consent manager", text: "Cookies, categories, and scanner findings." },
      { href: "/pricing", label: "Platform pricing", text: "Silver, Gold, and Platinum plans are quoted after an enquiry." },
    ],
    software: true,
  },
  {
    path: "/cookie-consent-manager",
    title: "Cookie Consent Manager",
    description:
      "Cookie consent software for banner choices, cookie categories, scans, and first-party and third-party cookie controls.",
    kicker: "Cookies",
    h1: "Cookie consent manager for sites that need a record",
    lede:
      "Use Consent Guru to present cookie choices, group them into purposes, and keep a consent record of what the visitor selected.",
    breadcrumb: [product("Product", "/consent-management-platform"), product("Cookie consent manager", "/cookie-consent-manager")],
    problemTitle: "Cookie lists drift from the banner",
    problem: [
      "A cookie policy that lists one set of cookies, and a tag manager that fires another, is a common failure. Cookie consent software has to connect the scan, the categories, and the runtime block.",
      "Consent Guru scans for cookies, scripts, and third-party trackers, then lets you classify them. The published policy is what the cookie banner and the SDK use.",
    ],
    howTitle: "How cookie management works",
    steps: [
      { title: "Discover", body: "Run a scan to find cookies and script patterns on a registered site." },
      { title: "Categorize", body: "Map findings to purposes such as necessary, functional, analytics, or advertising, and to the vendors you have catalogued." },
      { title: "Ask", body: "The cookie consent banner collects an accept, reject, or purpose-level choice." },
      { title: "Enforce", body: "The SDK applies the recorded choice. Optional loaders can be paused when the mapped purpose is denied." },
    ],
    features: [
      { title: "Cookie scanner", body: "Discovery is a review aid. It does not silently recategorize production tags without a published policy." },
      { title: "First-party and third-party cookies", body: "Treat cookies set by your own site and cookies set by vendors as separate findings you can map." },
      { title: "Preference center", body: "Visitors can reopen cookie preferences and change a category later." },
      { title: "Consent evidence", body: "The choice is stored with the policy version that described those categories." },
    ],
    benefits: [
      "A shared category model for the banner and the scanner.",
      "Fewer tags firing before a choice exists.",
      "A cookie consent log you can export with the decision context.",
      "Room to update copy without editing every page template by hand.",
    ],
    useCases: [
      { title: "Marketing sites", body: "Hold analytics and advertising tags until the matching purpose is allowed." },
      { title: "Multi-brand groups", body: "Keep a separate website record, domain, and published policy per property." },
      { title: "Vendor reviews", body: "Tie third-party cookies back to a vendor entry instead of an unlabeled script URL." },
    ],
    considerations: [
      "Cookie consent rules depend on the visitor’s location and on whether a cookie is strictly necessary. The product records and enforces the model you configure. It does not classify a cookie’s legal status for you.",
      "Scanning coverage can miss cookies that appear only after login or inside a tag container. Review unmapped findings before you rely on a scan.",
    ],
    faqs: [
      { question: "What is a cookie consent manager?", answer: "It is the part of a consent platform that collects cookie choices, stores them, and can suppress optional cookies or scripts when consent is withheld." },
      { question: "Does a CMP manage cookies automatically?", answer: "Consent Guru can discover cookies and block configured optional scripts. Someone on your team still maps findings to purposes and publishes the policy." },
      { question: "What is the difference between first-party and third-party cookies?", answer: "First-party cookies are set by the site the person is visiting. Third-party cookies are set by another domain, often an analytics or advertising vendor. Both can require a choice depending on their purpose." },
    ],
    related: [
      { href: "/cookie-banner", label: "Cookie banner", text: "How the banner presents accept, reject, and purpose choices." },
      { href: "/google-consent-mode", label: "Google Consent Mode", text: "Map purposes to Google’s consent signals when you enable it." },
      { href: "/blogs/cookie-consent-best-practices", label: "Cookie consent guide", text: "A longer explanation of practical cookie-consent design." },
    ],
  },
  {
    path: "/cookie-banner",
    title: "Cookie Consent Banner",
    description:
      "Publish a customizable cookie consent banner with accept, reject, and purpose choices, tied to a preference center and SDK.",
    kicker: "Banner",
    h1: "A cookie banner tied to a published policy",
    lede:
      "Consent Guru’s cookie consent banner presents the notice you publish and writes the visitor’s choice into a consent record.",
    breadcrumb: [product("Product", "/consent-management-platform"), product("Cookie banner", "/cookie-banner")],
    problemTitle: "Banners that cannot be withdrawn are incomplete",
    problem: [
      "A banner that only offers Accept, or that hides Reject, is difficult to defend when a law expects a genuine choice. The banner also has to match the preference center people use later.",
      "Banner Studio edits a draft. The site shows the last published version, so a copy change is deliberate rather than an unpublished edit.",
    ],
    howTitle: "How the banner is published",
    steps: [
      { title: "Write the notice", body: "Explain the purposes in the language you configure. English and the 22 Eighth Schedule languages are supported for banner and preference-center text." },
      { title: "Choose the actions", body: "Collect accept, reject, or a purpose-level selection. Required purposes stay distinct from optional ones." },
      { title: "Publish", body: "Publishing creates the version the SDK serves. Rollback copies an older version forward. It does not rewrite history." },
      { title: "Reopen later", body: "The preference center is the path for changing the choice the banner recorded." },
    ],
    features: [
      { title: "Customizable cookie banner", body: "Adjust copy and structure in Banner Studio so the banner can match the site’s brand without a separate code release for every wording change." },
      { title: "Purpose-level choices", body: "Visitors can allow some optional purposes and refuse others, instead of a single bundled consent." },
      { title: "Policy snapshot", body: "The consent record references the notice that was live, which matters when copy changes later." },
      { title: "Region-aware configuration", body: "Regulation settings on a website can change which experience you publish. The product does not guess the legal test for you." },
    ],
    benefits: [
      "The same source for the banner and the preference center.",
      "A clear reject path alongside accept.",
      "Version history for the text people actually saw.",
      "A banner that can stay in front of optional tags.",
    ],
    useCases: [
      { title: "GDPR-style opt-in", body: "Hold non-essential categories until there is a recorded choice." },
      { title: "Notice updates", body: "Publish a new version when purposes change, and keep the old version in history." },
      { title: "Brand consistency", body: "Keep banner copy in the workspace instead of hard-coding it into each template." },
    ],
    considerations: [
      "A cookie banner is an interface. Whether consent is valid still depends on the wording, the absence of bundled purposes, and how easy withdrawal is.",
      "Consent Guru does not claim that displaying a banner makes a site GDPR compliant.",
    ],
    faqs: [
      { question: "What is a cookie banner?", answer: "It is the notice a site shows to explain cookie or tracker purposes and to collect a choice before optional technologies run." },
      { question: "Why do websites need cookie consent?", answer: "Some laws require a prior choice before non-essential cookies or similar trackers are stored or read. Other laws emphasize opt-out. The banner is how you present the choice your counsel specifies." },
      { question: "Can visitors change a banner choice?", answer: "Yes. The privacy preference center is where a returning visitor reviews purposes and updates the recorded decision." },
    ],
    related: [
      { href: "/privacy-preference-center", label: "Privacy preference center", text: "Where people review and withdraw cookie choices." },
      { href: "/gdpr", label: "GDPR consent management", text: "How consent collection relates to GDPR cookie duties." },
      { href: "/blogs/how-a-cookie-banner-works", label: "How a cookie banner works", text: "A short guide to banner behavior and records." },
    ],
  },
  {
    path: "/privacy-preference-center",
    title: "Privacy Preference Center",
    description:
      "Open a privacy preference center where people review purposes, update cookie preferences, and withdraw an earlier consent choice.",
    kicker: "Preferences",
    h1: "A privacy preference center people can reopen",
    lede:
      "The preference center is where a person reviews consent preferences after the banner, including cookie categories and purpose-level choices.",
    breadcrumb: [product("Product", "/consent-management-platform"), product("Privacy preference center", "/privacy-preference-center")],
    problemTitle: "Consent that cannot be changed is hard to honor",
    problem: [
      "If the only way to withdraw is an email to support, the organization will be slow and the record will be incomplete. A preference center gives the person the same granularity they were offered at collection.",
      "Consent Guru serves the published preference center with the banner. An updated choice becomes the record the SDK and connected webhooks use.",
    ],
    howTitle: "How preference management works",
    steps: [
      { title: "Show current purposes", body: "The center lists the purposes on the published policy, including which ones are required." },
      { title: "Accept an update", body: "The visitor can allow, refuse, or withdraw optional purposes." },
      { title: "Write a new record", body: "The new decision is stored. It does not erase the historical evidence of the earlier choice." },
      { title: "Propagate", body: "The SDK uses the updated state. Webhooks can notify your systems when you have configured them." },
    ],
    features: [
      { title: "Cookie preference center", body: "Cookie categories are the same purposes used by the banner and the scanner mapping." },
      { title: "Consent preferences", body: "People see what they already chose instead of starting from a blank banner every visit." },
      { title: "Public Privacy Centre", body: "Consent Guru also hosts a privacy centre for its own site, including a preferences page and rights requests." },
      { title: "Language", body: "Preference-center text can be served in English or a configured Indian language pack." },
    ],
    benefits: [
      "Withdrawal is available in the product, not only in a mailbox.",
      "Historical consent evidence stays intact when the current state changes.",
      "Support teams see the latest choice without reconstructing a banner click.",
      "Copy stays aligned with the published policy version.",
    ],
    useCases: [
      { title: "Returning visitors", body: "Let someone who accepted analytics later turn that purpose off." },
      { title: "Campaign changes", body: "When a new vendor is added, publish an updated center rather than a silent tag." },
      { title: "Proof of withdrawal", body: "Keep the updated record as the signal downstream systems should follow." },
    ],
    considerations: [
      "Stopping a tag is not the same as erasing personal data already sent to a vendor. Erasure is a separate rights workflow.",
      "Make the link to the preference center easy to find. A center that visitors cannot reopen does not meet a “as easy to withdraw” standard.",
    ],
    faqs: [
      { question: "What is a privacy preference center?", answer: "It is the page or panel where a person reviews and changes the privacy and cookie choices an organization recorded." },
      { question: "Is a preference center the same as a cookie banner?", answer: "No. The banner collects the initial choice. The preference center is where that choice is reviewed or withdrawn later." },
      { question: "What is consent logging?", answer: "Consent logging is the practice of storing the decision, when it happened, and which notice version was shown, so the organization can explain it later." },
    ],
    related: [
      { href: "/consent-management", label: "Consent records", text: "What is stored when a preference changes." },
      { href: "/privacy-center/consent-preferences", label: "Manage preferences", text: "Consent Guru’s own preference page." },
      { href: "/blogs/preference-centers-and-consent-managers", label: "Preference center article", text: "Why the center has to match the banner." },
    ],
  },
  {
    path: "/consent-management",
    title: "User Consent Management",
    description:
      "User consent management for collecting choices, tracking consent status, and keeping consent records, logs, and withdrawal history.",
    kicker: "Consent",
    h1: "User consent management with a history",
    lede:
      "Collect a choice once, keep the consent log, and let the person withdraw without losing the audit trail of what was agreed.",
    breadcrumb: [product("Product", "/consent-management-platform"), product("Consent management", "/consent-management")],
    problemTitle: "Collection without history does not travel",
    problem: [
      "Teams often store a boolean on a profile and call it consent. That boolean cannot show the notice, the purposes, or a later withdrawal. Consent tracking needs those fields.",
      "Consent Guru records the decision, the policy snapshot, and subsequent changes. Current state and historical evidence are not the same row rewritten in place.",
    ],
    howTitle: "From collection to withdrawal",
    steps: [
      { title: "Collect", body: "The banner or preference center asks for a specific action against the purposes you defined." },
      { title: "Store", body: "The consent record includes an identifier, timestamp, locale, and the notice snapshot." },
      { title: "Track", body: "Status can move from granted to denied or withdrawn. Analytics summarizes outcomes. The evidence snapshot remains." },
      { title: "Prove", body: "A consent receipt can carry cryptographic proof of the recorded decision for the snapshot that was signed." },
    ],
    features: [
      { title: "Consent records", body: "The operational record of a person’s current choice for a site and policy." },
      { title: "Consent history", body: "Changing a choice writes the new decision. Automated cleanup does not delete historical evidence unless retention is explicitly configured and no legal hold applies." },
      { title: "Consent audit trail", body: "Workspace audit logs cover configuration and access changes alongside the consent evidence itself." },
      { title: "Withdrawal", body: "A visitor can change or withdraw optional purposes in the preference center. The SDK follows the updated record." },
    ],
    benefits: [
      "Purpose-level consent instead of one site-wide flag.",
      "A receipt path for the decision you need to explain.",
      "Retention settings for evidence, records, audit events, and rights requests.",
      "Portable consent export between domains you configure.",
    ],
    useCases: [
      { title: "Regulated products", body: "Show a purpose list that matches the processing the product actually performs." },
      { title: "Support and privacy teams", body: "Look up a consent identifier when someone asks what they agreed to." },
      { title: "Cross-domain journeys", body: "Exchange portable consent across domains that you have explicitly configured." },
    ],
    considerations: [
      "Consent is only one lawful ground. Do not label a record as consent if the organization is relying on another basis.",
      "Retention of evidence can itself be personal data processing. Set retention in the product to match the policy you have adopted, and use legal holds when a matter requires preservation.",
    ],
    technical: [
      { title: "Consent API", body: "Server-side collection and lookup go through authenticated API keys, separate from the public SDK endpoints the browser calls." },
      { title: "Webhooks", body: "Consent and rights events can be posted to your endpoint with an HMAC SHA-256 signature." },
    ],
    faqs: [
      { question: "What is user consent management?", answer: "It is the ongoing process of collecting, storing, updating, and enforcing a person’s choices about specific purposes." },
      { question: "What is a consent audit trail?", answer: "It is the retained history of the decision and of administrative changes, so a reviewer can see what was recorded and what was later configured." },
      { question: "Does withdrawal delete the old record?", answer: "No. The current choice updates, and historical consent evidence is kept according to your retention settings and any legal hold." },
    ],
    related: [
      { href: "/consent-analytics", label: "Consent analytics", text: "Rates and outcomes across recorded choices." },
      { href: "/consent-api", label: "Consent management API", text: "Keys, records, and webhooks for your stack." },
      { href: "/security", label: "Security and evidence", text: "How records, signatures, and retention are handled." },
    ],
  },
  {
    path: "/consent-analytics",
    title: "Consent Analytics",
    description:
      "Consent analytics, reporting, and a dashboard for consent rates and preference outcomes your privacy team can review.",
    kicker: "Analytics",
    h1: "Consent analytics for the choices you record",
    lede:
      "See how often people allow, refuse, or withdraw purposes, and use that reporting alongside the consent records themselves.",
    breadcrumb: [product("Product", "/consent-management-platform"), product("Consent analytics", "/consent-analytics")],
    problemTitle: "A consent rate without a definition is not a report",
    problem: [
      "Marketing dashboards often show an accept rate that ignores dismissals, partial purposes, and withdrawals. Privacy teams need the same definitions the banner used.",
      "Consent Guru’s consent dashboard summarizes recorded outcomes. It is not a substitute for the underlying consent log when someone asks about a specific person.",
    ],
    howTitle: "How reporting is produced",
    steps: [
      { title: "Record", body: "Analytics reads the choices the SDK and APIs have stored for your websites." },
      { title: "Filter", body: "Review ranges and sites inside the workspace rather than exporting a single blended number." },
      { title: "Interpret", body: "Granted, denied, withdrawn, and no-response states stay distinct." },
      { title: "Act", body: "If a category is rarely understood, revise the published notice. The report does not change the legal basis by itself." },
    ],
    features: [
      { title: "Consent reporting", body: "Summaries of rates and preference outcomes for the properties in the workspace." },
      { title: "Consent dashboard", body: "A workspace view for privacy and marketing stakeholders who need the same figures." },
      { title: "Consent audit", body: "Pair aggregate analytics with audit logs when you need to know who changed a policy or a retention setting." },
      { title: "No invented benchmarks", body: "The product shows your workspace’s data. Public pages do not publish customer totals or industry rankings." },
    ],
    benefits: [
      "A shared definition of allow, deny, and withdraw.",
      "A reason to fix notice copy when a purpose is consistently refused.",
      "Separation between aggregate reporting and individual evidence.",
      "Support for reviews that ask both “how many” and “show me this record”.",
    ],
    useCases: [
      { title: "Privacy reviews", body: "Check whether a new banner version changed withdrawal patterns." },
      { title: "Purpose design", body: "See which optional purposes people actually select." },
      { title: "Stakeholder updates", body: "Give leadership a dashboard without handing over raw evidence by default." },
    ],
    considerations: [
      "Aggregate consent analytics can still be sensitive. Limit dashboard access with workspace roles.",
      "A high accept rate is not evidence that consent was valid. Look at the notice, the reject path, and the record format as well.",
    ],
    faqs: [
      { question: "What is consent analytics?", answer: "It is reporting on recorded privacy choices, such as how often purposes are allowed, refused, or later withdrawn." },
      { question: "Is the consent dashboard the audit trail?", answer: "No. The dashboard summarizes outcomes. The consent record and workspace audit log are what you use for a specific decision or configuration change." },
      { question: "Can I export a report?", answer: "Workspace users can review analytics in the product. Individual evidence can be retrieved for a consent identifier, including a receipt where that export is available." },
    ],
    related: [
      { href: "/consent-management", label: "Consent records", text: "The individual decisions behind the charts." },
      { href: "/security", label: "Access control", text: "Roles that limit who can open the workspace." },
      { href: "/blogs/recording-consent-evidence-audits", label: "Evidence article", text: "What to keep when an audit asks for proof." },
    ],
  },
  {
    path: "/dsar",
    title: "DSAR Management",
    description:
      "DSAR and privacy request management for access, correction, and erasure, with verification and a status people can track.",
    kicker: "Rights",
    h1: "Privacy request management for access and erasure",
    lede:
      "Consent Guru includes workflows for data subject access requests and related rights, from intake through a status the person can check.",
    breadcrumb: [product("Solutions", "/privacy-compliance"), product("DSAR", "/dsar")],
    problemTitle: "Rights requests are not the same as consent clicks",
    problem: [
      "A DSAR asks what data you hold, or asks you to correct or delete it. A cookie choice does not answer that request. The two workflows should meet, but they should not be collapsed into one checkbox.",
      "The public Privacy Centre accepts Data Principal requests and grievances. The workspace is where your team verifies the request and records the outcome.",
    ],
    howTitle: "How a request moves",
    steps: [
      { title: "Intake", body: "People submit access, correction, erasure, nomination, grievance, or consent-withdrawal requests through the Privacy Centre." },
      { title: "Verify", body: "The workflow supports email-token verification and, where configured, an agent-attested path. Verification exists to reduce unauthorized disclosure." },
      { title: "Fulfill", body: "Your team updates status, including correction and deletion steps recorded in the rights workspace." },
      { title: "Track", body: "The person can check progress with a tracking reference instead of an open-ended email thread." },
    ],
    features: [
      { title: "Data subject access request intake", body: "A public form for the requests you enable, separate from the marketing site’s cookie banner." },
      { title: "Privacy request management", body: "Statuses, verification method, and audit metadata stay on the request record." },
      { title: "Grievances", body: "A grievance path sits beside access and erasure, which matters for DPDP-style complaint handling." },
      { title: "Retention", body: "Rights-request retention is configurable and is distinct from consent-evidence retention." },
    ],
    benefits: [
      "One queue for privacy requests instead of a shared inbox.",
      "A visible status for the person who asked.",
      "An audit trail of verification and status changes.",
      "A clean separation from cookie consent records.",
    ],
    useCases: [
      { title: "Access requests", body: "Confirm identity, then record what was provided and when." },
      { title: "Deletion", body: "Track erasure work without pretending the CMP deleted every downstream system." },
      { title: "India-facing services", body: "Use Data Principal language in the public centre alongside the DSAR-style rights your other markets use." },
    ],
    considerations: [
      "Deadlines, exemptions, and the scope of a request come from the law that applies, not from the form. This page is not legal advice.",
      "Deletion of personal data is separate from withdrawal of consent. Withdrawing a cookie purpose does not automatically erase data a vendor already received.",
    ],
    faqs: [
      { question: "What is DSAR?", answer: "A data subject access request is a person’s request to know whether an organization holds personal data about them and, where the law provides it, to receive a copy or related details." },
      { question: "What is privacy request management?", answer: "It is the operational process of receiving, verifying, fulfilling, and recording access, correction, deletion, and similar requests." },
      { question: "Where do people submit a request?", answer: "Use the Data Principal request page in the Privacy Centre. Consent Guru’s own contact for privacy questions is support@consentguru.com." },
    ],
    related: [
      { href: "/privacy-center/data-principal-request", label: "Submit a request", text: "The public intake form." },
      { href: "/privacy-center/track-request", label: "Track a request", text: "Check the status of a submitted request." },
      { href: "/dpdp", label: "DPDP and Data Principal rights", text: "How India’s law frames these requests." },
    ],
  },
  {
    path: "/privacy-compliance",
    title: "Privacy Compliance",
    description:
      "Privacy compliance software for consent, cookie choices, preference centers, and request workflows across GDPR, CCPA/CPRA, and DPDP.",
    kicker: "Solutions",
    h1: "Privacy compliance software for consent operations",
    lede:
      "Consent Guru helps teams operate consent, cookie choices, and privacy requests. It does not replace a legal assessment of which duties apply.",
    breadcrumb: [product("Privacy compliance", "/privacy-compliance")],
    problemTitle: "Compliance programs fail when the notice and the tags disagree",
    problem: [
      "Privacy compliance work is spread across a policy, a banner, vendor contracts, and a request inbox. When those artifacts diverge, the organization cannot explain a choice.",
      "The platform is a control plane for the consent-related parts of that work: purposes, notices, records, enforcement, and rights intake.",
    ],
    howTitle: "A practical operating loop",
    steps: [
      { title: "Decide the rule", body: "Counsel or your privacy lead chooses the purposes, regions, and request types." },
      { title: "Configure", body: "Encode that decision in a policy, a banner, and vendor or tracker mappings." },
      { title: "Run", body: "The SDK and preference center apply it on the site." },
      { title: "Review", body: "Use records, analytics, and audit logs when the program is questioned." },
    ],
    features: [
      { title: "Multi-regime workflows", body: "Configure experiences for GDPR-style consent, CCPA/CPRA opt-out preferences, and DPDP consent duties without mixing their labels." },
      { title: "Data privacy management", body: "Purposes, vendors, transfers, and rights requests sit in one workspace rather than unrelated spreadsheets." },
      { title: "Children’s flows", body: "Child-directed properties can add age assurance and a guardian-consent step before optional processing." },
      { title: "Assessments", body: "Public DPDP tools offer preliminary readiness and notice checks. They are not an official determination." },
    ],
    benefits: [
      "A single published version of the notice.",
      "Records that match the purposes you named.",
      "A request path that is not buried in a contact form.",
      "Language that avoids promising automatic compliance.",
    ],
    useCases: [
      { title: "Global sites", body: "Serve people in India, the EEA, and California from configurations you control per website." },
      { title: "Privacy teams", body: "Give legal a record and engineering an SDK, instead of a slide deck." },
      { title: "Vendors", body: "Keep a catalog of processors and the purposes they are allowed to support." },
    ],
    considerations: [
      "Using this privacy management platform does not, by itself, make an organization compliant. Duties depend on your role, your data, and the statute.",
      "Significant Data Fiduciary status under India’s DPDP Act is a government designation. The product does not decide it.",
    ],
    faqs: [
      { question: "What is privacy compliance software?", answer: "It is tooling that helps an organization implement privacy processes such as notices, consent, vendor limits, and rights requests. It is not a legal opinion." },
      { question: "Which laws can Consent Guru support?", answer: "The workspace is designed for consent and privacy workflows related to the DPDP framework, GDPR, CCPA/CPRA, and other regimes you configure. Support means operational features, not a compliance guarantee." },
      { question: "Where should we start?", answer: "Publish one website, one purpose model, and one banner. Add analytics, rights requests, and regional variants after that loop works." },
    ],
    related: [
      { href: "/gdpr", label: "GDPR consent", text: "Consent collection, records, and withdrawal in a GDPR context." },
      { href: "/ccpa", label: "CCPA and CPRA", text: "Opt-out preferences and sale or sharing signals." },
      { href: "/dpdp", label: "DPDP Act", text: "Consent management for India’s data protection law." },
    ],
  },
  {
    path: "/gdpr",
    title: "GDPR Consent Management",
    description:
      "GDPR consent management for purpose-level choices, cookie consent, consent records, and withdrawal from a preference center.",
    kicker: "GDPR",
    h1: "Consent management for GDPR programs",
    lede:
      "When your counsel decides that consent is the right basis, Consent Guru helps you collect it, record it, and honor a withdrawal.",
    breadcrumb: [product("Solutions", "/privacy-compliance"), product("GDPR", "/gdpr")],
    problemTitle: "GDPR consent is specific, and it has to be reversible",
    problem: [
      "Article 4(11) describes consent as freely given, specific, informed, and unambiguous. A pre-ticked box or a bundle of unrelated purposes fights that definition. Non-essential cookies are often handled under ePrivacy rules that expect a prior choice.",
      "Consent Guru can present those purposes separately, store the consent record, and let the person withdraw from the preference center. That supports a GDPR workflow. It does not complete one.",
    ],
    howTitle: "What the product helps you operate",
    steps: [
      { title: "Separate purposes", body: "Define optional analytics or advertising apart from what the site needs to function." },
      { title: "Inform", body: "Publish the notice text and the vendor context you want shown before the choice." },
      { title: "Record", body: "Keep the policy version with the decision so you can show what “informed” referred to." },
      { title: "Withdraw", body: "Treat withdrawal as a first-class update, then stop optional scripts that depended on the withdrawn purpose." },
    ],
    features: [
      { title: "GDPR cookie consent", body: "Hold mapped optional tags until a choice allows them, and keep the cookie banner aligned with the preference center." },
      { title: "Consent records", body: "Identifier, timestamp, locale, and notice snapshot for the decision you may need to demonstrate." },
      { title: "Lawful-basis hygiene", body: "Do not mark a purpose as consent in the product if you are actually relying on another Article 6 basis." },
      { title: "Rights requests", body: "Access and erasure requests are handled in the rights workflow, not as a cookie toggle." },
    ],
    benefits: [
      "A reject path next to accept.",
      "Evidence that names the notice version.",
      "Withdrawal that updates the SDK’s current state.",
      "Less drift between the privacy notice and the tags.",
    ],
    useCases: [
      { title: "EEA and UK properties", body: "Publish a consent experience for sites aimed at those visitors, and keep a record." },
      { title: "Advertising tags", body: "Map third-party advertising purposes separately from strictly necessary cookies." },
      { title: "Notice changes", body: "When purposes change, publish a new version instead of reusing an old record." },
    ],
    considerations: [
      "This page is not legal advice and does not cover every GDPR duty. Security, transfers, processor terms, and DPIAs are outside a banner.",
      "Consent Guru helps organizations implement and manage consent-related processes. It does not make a company GDPR compliant.",
    ],
    faqs: [
      { question: "What is GDPR consent?", answer: "Under the GDPR, consent is a freely given, specific, informed, and unambiguous indication of agreement to processing for a stated purpose. It must be as easy to withdraw as to give." },
      { question: "Does a cookie banner satisfy the GDPR?", answer: "A banner can be the interface for a consent choice. It satisfies a duty only if the underlying notice, granularity, record, and withdrawal also meet the standard your counsel applies." },
      { question: "What should the consent record include?", answer: "At a minimum, keep who or what identifier you use, when the choice was made, which purposes were covered, and which notice version was shown." },
    ],
    related: [
      { href: "/cookie-banner", label: "Cookie banner", text: "The interface for a prior cookie choice." },
      { href: "/blogs/gdpr-consent-vs-legitimate-interest", label: "Consent and legitimate interest", text: "Why those bases are not interchangeable." },
      { href: "/ccpa", label: "CCPA / CPRA", text: "A different model, based more often on opt-out." },
    ],
  },
  {
    path: "/ccpa",
    title: "CCPA and CPRA Consent",
    description:
      "CCPA and CPRA consent management for opt-out preferences, sale or sharing choices, and a privacy preference center people can reopen.",
    kicker: "California",
    h1: "CCPA and CPRA preference management",
    lede:
      "California’s rules emphasize the right to opt out of sale or sharing, including cross-context advertising. Consent Guru helps you present and record that preference.",
    breadcrumb: [product("Solutions", "/privacy-compliance"), product("CCPA / CPRA", "/ccpa")],
    problemTitle: "A footer link that no tag reads is not an opt-out",
    problem: [
      "The CCPA, as amended by the CPRA, gives consumers rights to know, delete, correct, and opt out of the sale or sharing of personal information. A Do Not Sell or Share link has to change what vendors receive.",
      "Consent Guru can express that preference as a purpose-level choice and apply it to mapped tags. Global Privacy Control handling still has to be configured to match the stance your counsel adopts.",
    ],
    howTitle: "How opt-out management is set up",
    steps: [
      { title: "Name the purposes", body: "Separate sale, sharing, or advertising purposes from service-provider processing that is not a sale." },
      { title: "Offer the control", body: "Put the opt-out in the banner or preference center where the visitor can actually use it." },
      { title: "Suppress", body: "Map the opted-out purpose to the tags that should stop." },
      { title: "Record", body: "Keep the preference with a timestamp and policy version, and accept a later change." },
    ],
    features: [
      { title: "Privacy preferences", body: "The preference center is the durable place for a California opt-out, not a one-time banner that disappears." },
      { title: "Vendor mapping", body: "Tie advertising tags to the purpose that represents sale or sharing, based on your own classification." },
      { title: "Rights intake", body: "Know, delete, and correction requests belong in the DSAR workflow." },
      { title: "No automatic “sale” verdict", body: "The product does not decide whether a disclosure is a sale. Your contracts and counsel do." },
    ],
    benefits: [
      "An opt-out that can reach mapped technologies.",
      "A record of the preference, not only a click event in a tag manager.",
      "A path for access and deletion that is separate from the opt-out.",
      "Copy you can align with a “Do Not Sell or Share” link.",
    ],
    useCases: [
      { title: "Advertising opt-out", body: "Stop mapped advertising purposes when the visitor opts out." },
      { title: "Multi-state US sites", body: "Use the California configuration where you have decided it applies, without relabeling it as GDPR consent." },
      { title: "Preference links", body: "Point footer links at the preference center rather than a mailbox." },
    ],
    considerations: [
      "CCPA and CPRA duties include notices at collection, service-provider terms, and sensitive-information limits. A preference center covers the choice, not the whole statute.",
      "This page is educational product information, not legal advice, and it does not guarantee CCPA or CPRA compliance.",
    ],
    faqs: [
      { question: "What is CCPA consent management?", answer: "In practice it means operating the notices and opt-out preferences California requires, especially for sale or sharing, and keeping a record of those choices." },
      { question: "How is CPRA different from a GDPR banner?", answer: "GDPR consent is often an opt-in before non-essential processing. CPRA is more often an opt-out of sale or sharing. The same banner component can present either model, but the wording and defaults must not be copied blindly." },
      { question: "Does Consent Guru honor Global Privacy Control by itself?", answer: "GPC is a browser signal you should account for in the experience you configure. Enabling a preference center does not automatically interpret every signal unless that behavior is turned on for the site." },
    ],
    related: [
      { href: "/privacy-preference-center", label: "Preference center", text: "Where an opt-out should remain available." },
      { href: "/dsar", label: "DSAR management", text: "Access, deletion, and correction requests." },
      { href: "/blogs/ccpa-cpra-california-opt-out", label: "California opt-out article", text: "Design notes for sale and sharing choices." },
    ],
  },
  {
    path: "/dpdp",
    title: "DPDP Consent Management",
    description:
      "DPDP Act consent management for purpose-bound notices, consent records, withdrawal, and Data Principal rights in India.",
    kicker: "India",
    h1: "Consent management for India’s DPDP Act",
    lede:
      "The Digital Personal Data Protection Act, 2023 expects consent to be specific and purpose-bound. Consent Guru helps you operate that consent, without offering a compliance guarantee.",
    breadcrumb: [product("Solutions", "/privacy-compliance"), product("DPDP", "/dpdp")],
    problemTitle: "India’s law treats consent as a recorded, reversible choice",
    problem: [
      "The DPDP Act applies to digital personal data processed in India and, in many cases, to processing outside India connected with offering goods or services to people in India. Consent is tied to a stated purpose and must be withdrawable.",
      "A consent manager in this context is the system that presents the notice, stores the Data Principal’s choice, and lets that choice be changed. Consent Guru is built for that operational role.",
    ],
    howTitle: "How DPDP consent operations map to the product",
    steps: [
      { title: "Notice", body: "Publish what personal data is used and for which purpose, in a language you have configured." },
      { title: "Consent", body: "Collect a clear, purpose-level action. Do not bundle unrelated purposes into one unavoidable accept." },
      { title: "Record", body: "Keep the consent record and the notice version so the fiduciary can demonstrate what was obtained." },
      { title: "Rights", body: "Route access, correction, erasure, nomination, and grievance requests through the Privacy Centre." },
    ],
    features: [
      { title: "Purpose-bound consent", body: "Purposes are explicit objects in the policy, not a paragraph buried in a footer." },
      { title: "Indian languages", body: "Banner and preference-center text can use English or the built-in Eighth Schedule language pack." },
      { title: "Consent Manager context", body: "The Act also contemplates Consent Managers as a registered role. Registration is a statutory process. Shipping this software is not that registration." },
      { title: "Children", body: "Child-directed sites can require age assurance and guardian consent before optional processing." },
    ],
    benefits: [
      "A notice and a record that refer to the same purposes.",
      "Withdrawal from the preference center.",
      "Data Principal request intake next to consent operations.",
      "A longer statute guide when teams need the legal map.",
    ],
    useCases: [
      { title: "India-facing products", body: "Collect purpose-level consent for services offered to people in India." },
      { title: "Global companies with Indian users", body: "Run a DPDP-oriented configuration without discarding GDPR or CCPA setups on other sites." },
      { title: "Fiduciary operations", body: "Give privacy and engineering one published policy to implement." },
    ],
    considerations: [
      "This is not legal advice. The DPDP Act, its rules, and any Consent Manager registration requirements should be confirmed with counsel.",
      "Consent Guru helps organizations implement consent and rights workflows related to the DPDP Act. It does not guarantee DPDP compliance, and it does not determine Significant Data Fiduciary status.",
    ],
    faqs: [
      { question: "What is DPDP compliance in this product?", answer: "It means using the platform to present purpose-bound notices, store consent records, honor withdrawal, and intake Data Principal requests. It is an operational aid, not a certification." },
      { question: "What is the Digital Personal Data Protection Act?", answer: "India’s DPDP Act, 2023 is the statute governing digital personal data. It sets duties for Data Fiduciaries and rights for Data Principals, including consent that can be withdrawn." },
      { question: "Where is the longer explanation?", answer: "The DPDP Act guide walks through concepts, notices, rights, and duties in more detail, and it is also not legal advice." },
    ],
    related: [
      { href: "/dpdp-act", label: "DPDP Act guide", text: "A longer explanation of the statute and product fit." },
      { href: "/tools", label: "DPDP tools", text: "Preliminary readiness and notice checks." },
      { href: "/blogs/india-dpdp-act-consent-manager", label: "DPDP article", text: "What consent managers need to get right." },
    ],
  },
  {
    path: "/google-consent-mode",
    title: "Google Consent Mode",
    description:
      "Google Consent Mode v2 support that maps your purposes to ad_storage, analytics_storage, and the other Google consent signals.",
    kicker: "Integrations",
    h1: "Google Consent Mode for recorded purposes",
    lede:
      "When you enable Google Consent Mode for a website, Consent Guru can translate purpose choices into the consent signals Google tags expect.",
    breadcrumb: [product("Developers", "/developers"), product("Google Consent Mode", "/google-consent-mode")],
    problemTitle: "Tags and banners that disagree create silent collection",
    problem: [
      "Google tags can read consent signals such as ad_storage, ad_user_data, ad_personalization, and analytics_storage. If the banner stores a choice that never reaches those signals, the tag stack and the notice diverge.",
      "Consent Guru’s SDK can set a default denied state for optional storage and update it after a recorded choice, when Consent Mode is enabled for that website.",
    ],
    howTitle: "How Consent Mode v2 is applied",
    steps: [
      { title: "Enable it", body: "Turn on Google Consent Mode in the website’s regulation settings. It is off until you enable it." },
      { title: "Map purposes", body: "Default mappings send analytics-style purposes to analytics_storage and advertising-style purposes to ad_storage, ad_user_data, and ad_personalization." },
      { title: "Default deny", body: "Before a choice, optional ad and analytics storage can start as denied, with a short wait for the CMP update." },
      { title: "Update", body: "After the visitor chooses, the SDK updates the signals to match the purposes they allowed." },
    ],
    features: [
      { title: "Consent Mode signals", body: "Supported signals include ad_storage, ad_user_data, ad_personalization, analytics_storage, functionality_storage, personalization_storage, and security_storage." },
      { title: "Purpose map", body: "You can adjust which purposes drive which signals instead of accepting the defaults blindly." },
      { title: "Tag loader control", body: "The SDK can also pause known Google tag loader URLs when the mapped purpose is denied. Tags already configured inside a container still need their own checks." },
      { title: "Ads data redaction", body: "Ads data redaction defaults to on in the Consent Mode configuration. URL passthrough is off unless you enable it." },
    ],
    benefits: [
      "Google tags see the same purposes the banner recorded.",
      "A default that does not treat optional storage as granted.",
      "A mapping you can inspect, not a hidden global switch.",
      "A path that still keeps your own consent record.",
    ],
    useCases: [
      { title: "Google Analytics", body: "Tie measurement purposes to analytics_storage." },
      { title: "Advertising tags", body: "Tie marketing purposes to ad storage and ad user-data signals." },
      { title: "Tag managers", body: "Use Consent Mode alongside, not instead of, consent checks inside the container." },
    ],
    considerations: [
      "Google Consent Mode is a signaling protocol. It does not decide whether you have a lawful basis, and enabling it is not GDPR or DPDP compliance.",
      "The integration updates signals for tags that respect Consent Mode. It cannot retract a request a tag already sent before the SDK ran.",
    ],
    technical: [
      { title: "Wait for update", body: "The default wait is 500 milliseconds and can be configured between 0 and 5000 milliseconds." },
      { title: "Region behavior", body: "You choose where the experience applies. The product does not infer a country rule unless you configure it." },
    ],
    faqs: [
      { question: "What is Google Consent Mode?", answer: "It is Google’s mechanism for tags to adjust storage and ads behavior based on consent signals such as analytics_storage and ad_storage." },
      { question: "What is Google Consent Mode v2?", answer: "Version 2 adds ad_user_data and ad_personalization alongside the earlier storage signals. Consent Guru’s signal list includes those fields when the integration is enabled." },
      { question: "Does Consent Mode replace a cookie banner?", answer: "No. The banner collects the choice. Consent Mode tells participating Google tags how to behave after that choice." },
    ],
    related: [
      { href: "/integrations", label: "Integrations", text: "Consent Mode, tag control, and webhooks." },
      { href: "/cookie-consent-manager", label: "Cookie consent manager", text: "The categories those signals should follow." },
      { href: "/blogs/google-consent-mode-v2-explained", label: "Consent Mode article", text: "A plain-language explanation of the signals." },
    ],
  },
  {
    path: "/developers",
    title: "Developer Consent Management",
    description:
      "Developer guidance for the consent SDK, consent API keys, signed webhooks, and installing the banner on a verified domain.",
    kicker: "Developers",
    h1: "Consent SDK, API, and webhooks",
    lede:
      "Install the browser SDK on a verified site, then use API keys and signed webhooks when your own systems need the same consent state.",
    breadcrumb: [product("Developers", "/developers")],
    problemTitle: "Consent that lives only in the browser will not reach your backend",
    problem: [
      "The banner can block a tag and still leave your server, app, or data warehouse unaware of the choice. Developer consent management means the same decision is available to those systems.",
      "Consent Guru splits the public SDK, which runs on the customer’s website, from authenticated APIs used by your backend.",
    ],
    howTitle: "How a technical integration starts",
    steps: [
      { title: "Register the site", body: "Add the website and verify the domain. A site key is meant for the host it was registered for." },
      { title: "Publish", body: "The SDK configuration is served after a policy version is published. Until then, config requests do not describe a live banner." },
      { title: "Install", body: "The embed runs a blocking bootstrap and loads the SDK so optional scripts can wait on the choice." },
      { title: "Subscribe", body: "Point a webhook at your endpoint if you need server-side notice of consent or rights events." },
    ],
    features: [
      { title: "Consent SDK", body: "A browser script that renders the published banner and preference center and applies the recorded choice." },
      { title: "Consent API", body: "API keys authenticate server-side access. Browser collection uses separate public SDK routes." },
      { title: "Consent webhooks", body: "Deliveries are signed with HMAC SHA-256 so your endpoint can reject unsigned bodies." },
      { title: "Workspace docs", body: "Installation snippets, keys, and webhook setup live in the signed-in developer area after you create a workspace." },
    ],
    benefits: [
      "A published policy as the runtime source of truth.",
      "Domain checks that resist using a site key on the wrong host.",
      "Signed events for systems you control.",
      "A receipt and proof path for a recorded decision.",
    ],
    useCases: [
      { title: "Marketing sites", body: "Install the SDK and keep tags behind the published purposes." },
      { title: "Product backends", body: "Read or record consent with an API key instead of scraping the banner." },
      { title: "Data pipelines", body: "Consume webhooks when a choice changes, and verify the signature." },
    ],
    considerations: [
      "Public SDK endpoints are intentionally callable from browsers on allowed origins. Do not treat a site key as a secret that grants dashboard access.",
      "API routes under /api are application endpoints. They are not marketing pages and are blocked for indexing.",
    ],
    technical: [
      { title: "Early blocking", body: "The bootstrap can pause known optional script URLs. It cannot undo requests that already left the browser." },
      { title: "IAB signals", body: "Where you enable them, the SDK can participate in IAB TCF and Global Privacy Platform style signaling alongside your purpose model." },
    ],
    faqs: [
      { question: "What is a consent SDK?", answer: "It is the script you install on a website so the published banner, preference center, and enforcement rules run in the visitor’s browser." },
      { question: "Where is the API documented?", answer: "Start with the consent API overview, then open the developer area inside a workspace for keys and endpoint setup." },
      { question: "Are webhooks required?", answer: "No. The SDK can run without a webhook. Add one when a system outside the browser must hear about a new or updated choice." },
    ],
    related: [
      { href: "/consent-api", label: "Consent management API", text: "Keys, records, and signed webhooks." },
      { href: "/integrations", label: "Integrations", text: "Consent Mode, tags, and customer endpoints." },
      { href: "/security", label: "Security", text: "Signatures, retention, and access control." },
    ],
  },
  {
    path: "/consent-api",
    title: "Consent Management API",
    description:
      "Consent management API and webhooks for recording choices, verifying HMAC signatures, and reading consent state from your systems.",
    kicker: "API",
    h1: "A consent API for your own systems",
    lede:
      "Use API keys when a backend needs to record or read consent, and use signed webhooks when you want events pushed to you.",
    breadcrumb: [product("Developers", "/developers"), product("Consent API", "/consent-api")],
    problemTitle: "The browser SDK is not your server API",
    problem: [
      "Public collection endpoints exist so the SDK can store a banner choice from the visitor’s browser. Server-to-server access is a different trust boundary and uses API keys.",
      "Putting marketing content on /api would collide with those endpoints, so this overview lives at /consent-api. The live API stays under /api and is not indexed.",
    ],
    howTitle: "How developers use it",
    steps: [
      { title: "Create a key", body: "Keys are issued inside the workspace and shown once. Store them in your secret manager." },
      { title: "Call with the key", body: "Authenticated routes reject requests that have no session and no machine credential." },
      { title: "Receive events", body: "Webhooks POST consent and rights events to an HTTPS endpoint you control." },
      { title: "Verify", body: "Check the HMAC SHA-256 signature before you trust the body. Signing secrets are stored encrypted with AES-256-GCM." },
    ],
    features: [
      { title: "Consent records over the API", body: "Record and look up decisions with the identifier, purposes, and policy context your integration needs." },
      { title: "Consent webhooks", body: "Your endpoint gets the event. You decide what to update in a CRM, warehouse, or app profile." },
      { title: "Receipts", body: "Evidence export can include cryptographic proof of the recorded decision and notice snapshot." },
      { title: "Rights events", body: "Rights-request changes can be delivered on the same webhook channel when you subscribe to them." },
    ],
    benefits: [
      "Backend consent state without scraping cookies.",
      "A signature check on inbound events.",
      "Keys that are separate from dashboard passwords.",
      "A clear split between public SDK routes and private APIs.",
    ],
    useCases: [
      { title: "Account portals", body: "Show the same purposes in a logged-in settings page and write the choice back through the API." },
      { title: "Warehouses", body: "Store webhook payloads you have verified, not unsigned copies." },
      { title: "Mobile or server rendering", body: "Collect a choice in your app and record it server-side when the browser SDK is not the right surface." },
    ],
    considerations: [
      "Do not embed API keys in public websites. The browser should use the site key and SDK.",
      "Rate limits and organization roles still apply. A key is not a bypass of retention or legal holds.",
    ],
    faqs: [
      { question: "What is a consent management API?", answer: "It is the authenticated interface for recording and reading consent, and for configuring the events your systems receive." },
      { question: "How are consent webhooks signed?", answer: "Deliveries include an HMAC SHA-256 signature computed with the webhook signing secret. Reject requests that do not match." },
      { question: "Why isn’t this page at /api?", answer: "The /api path is the application’s endpoint namespace, including the public SDK. Indexing or replacing it would break the product." },
    ],
    related: [
      { href: "/developers", label: "SDK and installation", text: "Domain verification, publish, and the browser script." },
      { href: "/google-consent-mode", label: "Google Consent Mode", text: "Browser-side signals for Google tags." },
      { href: "/security", label: "Security controls", text: "Encryption of webhook secrets and audit logs." },
    ],
  },
  {
    path: "/integrations",
    title: "Consent Integrations",
    description:
      "Connect consent choices to Google Consent Mode, tag controls, IAB signals, and signed webhooks from one purpose model.",
    kicker: "Integrations",
    h1: "Integrations that follow the recorded choice",
    lede:
      "Consent Guru connects a published purpose model to Google Consent Mode, script controls, and the endpoints you operate.",
    breadcrumb: [product("Developers", "/developers"), product("Integrations", "/integrations")],
    problemTitle: "An integration that ignores purposes will undo the banner",
    problem: [
      "Connecting a tag manager without mapping purposes just moves the compliance problem into another tool. The integration should read the same categories the visitor saw.",
      "In the workspace, connecting Google Consent Mode, Google tag, or IAB items updates runtime signals the SDK consumes. Other catalog entries store connection state for the tools you enable.",
    ],
    howTitle: "What you can connect",
    steps: [
      { title: "Purposes first", body: "Create the purpose catalog before you connect a tag. The mapping needs somewhere to point." },
      { title: "Consent Mode", body: "Enable Google Consent Mode per website when you use gtag or Consent Mode-aware tags." },
      { title: "Script control", body: "Known loader URLs can be paused when their purpose is denied. In-container tags still need consent checks." },
      { title: "Your stack", body: "Use webhooks or the API for CRMs, warehouses, and apps that are not in the browser." },
    ],
    features: [
      { title: "Google Consent Mode", body: "Purpose-to-signal mapping for ads and analytics storage, including Consent Mode v2 fields." },
      { title: "Tag manager loaders", body: "The SDK can pause GTM or gtag loader URLs. It does not rewrite tags that already live inside a container." },
      { title: "IAB TCF and GPP", body: "Where enabled, the SDK can emit IAB-style signals from the purposes and vendors you configure." },
      { title: "Webhooks", body: "A general integration path for systems that should hear about consent and rights events." },
    ],
    benefits: [
      "One purpose list for the banner and the integration.",
      "Fewer tags that fire before a choice.",
      "A webhook path when no native connector exists.",
      "Connection state you can see per website.",
    ],
    useCases: [
      { title: "Analytics tags", body: "Allow measurement only when the analytics purpose is granted." },
      { title: "Advertising", body: "Keep advertising signals aligned with an opt-in or opt-out purpose you defined." },
      { title: "Internal tools", body: "Push verified events into the systems your privacy team already uses." },
    ],
    considerations: [
      "A connector does not review your vendor contract. If a tag receives identifiers for advertising, your team still has to decide whether that is a sale, sharing, or consent-based purpose.",
      "Third-party scripts that run before the SDK, or from a domain you did not map, will not be controlled by the integration.",
    ],
    faqs: [
      { question: "Which integrations are built in?", answer: "Google Consent Mode, Google tag loader control, and IAB TCF/GPP signaling are product features you enable. Other tools are connected through webhooks or the API." },
      { question: "Will connecting GTM block every tag?", answer: "Pausing the loader URL stops that loader. Tags already present in the container, or injected another way, need their own consent checks." },
      { question: "Can we integrate a custom stack?", answer: "Yes. Use the consent API and signed webhooks rather than waiting for a named connector." },
    ],
    related: [
      { href: "/google-consent-mode", label: "Google Consent Mode", text: "Signal names and default mappings." },
      { href: "/developers", label: "Developers", text: "SDK installation and keys." },
      { href: "/cookie-consent-manager", label: "Cookie manager", text: "Categorize the tags you are about to connect." },
    ],
  },
  {
    path: "/security",
    title: "Consent Platform Security",
    description:
      "How Consent Guru handles consent security: access control, signed webhooks, audit logs, retention, and consent evidence.",
    kicker: "Trust",
    h1: "Security controls for consent evidence",
    lede:
      "Consent Guru protects workspace access, signs webhook deliveries, and keeps consent evidence separate from a rewritten current choice.",
    breadcrumb: [product("Security", "/security")],
    problemTitle: "Consent evidence is only useful if it is hard to quietly change",
    problem: [
      "A consent log that an anonymous client can edit, or that disappears when a person withdraws, is not evidence. The product separates the current choice from historical snapshots and limits who can change configuration.",
      "The controls below are the ones implemented in this application. They are not a certification, and they are not a promise about every customer’s own hosting environment.",
    ],
    howTitle: "Controls that exist in the product",
    steps: [
      { title: "Authenticate", body: "Dashboard access uses Clerk. Organization members have roles. Unauthenticated API calls to private routes are rejected." },
      { title: "Separate credentials", body: "API keys are for machine access. Site keys are for the browser SDK on a verified domain. Webhook secrets sign outbound events." },
      { title: "Record changes", body: "Audit logs capture configuration and access changes. Consent evidence snapshots keep the decision context." },
      { title: "Retain deliberately", body: "Retention windows cover consent evidence, consent records, audit events, and rights requests. Legal holds block automated deletion." },
    ],
    features: [
      { title: "Access control", body: "Workspace actions are tied to an organization and a role. Cross-site request checks apply to dashboard mutations." },
      { title: "Encryption of webhook secrets", body: "Stored webhook signing secrets are encrypted with AES-256-GCM. Deliveries are signed with HMAC SHA-256." },
      { title: "Consent proof", body: "Notice snapshots can be hashed with SHA-256 and decisions can be signed with HMAC so a receipt can be checked later." },
      { title: "Transport and browser headers", body: "Responses include baseline security headers. Production traffic sends HSTS. The product does not claim a third-party penetration-test report on this page." },
    ],
    benefits: [
      "Historical evidence is not erased just because the current choice changed.",
      "Webhook receivers can detect tampering.",
      "Domain verification limits where a site key is accepted.",
      "Retention is a setting you can explain, not an unbounded archive by accident.",
    ],
    useCases: [
      { title: "Audit questions", body: "Show the snapshot and the audit log entry instead of a screenshot of a banner." },
      { title: "Key handling", body: "Rotate API keys and webhook secrets without republishing the public banner." },
      { title: "Legal holds", body: "Pause automated cleanup when a matter requires the record to stay." },
    ],
    considerations: [
      "Customer websites that install the SDK remain responsible for their own transport security, tag configuration, and who they grant workspace roles to.",
      "These controls do not include a public SOC or ISO certificate on this page. Logos elsewhere on the marketing site should not be read as a certification of every control.",
    ],
    faqs: [
      { question: "Are consent records encrypted?", answer: "Webhook signing secrets are encrypted with AES-256-GCM. Consent decisions are stored as workspace data with access control, hashing of notice snapshots, and HMAC signatures on receipts. This page does not claim that every database column uses application-level encryption." },
      { question: "Who can see consent evidence?", answer: "People with access to the organization workspace, subject to roles. Private dashboard routes are not indexed and require authentication." },
      { question: "How long is evidence kept?", answer: "Retention is configurable per category. Changing the setting does not rewrite historical evidence. Automated deletion skips records under a legal hold." },
    ],
    related: [
      { href: "/consent-management", label: "Consent records", text: "What the evidence contains." },
      { href: "/developers", label: "Developers", text: "Keys, site keys, and webhooks." },
      { href: "/privacy-center/privacy-policy", label: "Privacy policy", text: "How Consent Guru describes its own processing." },
    ],
  },
  {
    path: "/resources",
    title: "Consent and Privacy Resources",
    description:
      "Guides and articles on consent management, cookie banners, GDPR, CCPA, the DPDP Act, Google Consent Mode, and DSARs.",
    kicker: "Resources",
    h1: "Guides to consent, cookies, and privacy requests",
    lede:
      "Read practical explanations of consent records, cookie banners, and privacy laws, then follow the product pages when you are ready to configure them.",
    breadcrumb: [product("Resources", "/resources")],
    problemTitle: "Searchers need an explanation before a product tour",
    problem: [
      "People looking up “what is a consent management platform” or “what is DSAR” need a definition, not only a signup form. The resource library collects those explanations.",
      "Articles are educational. They are not legal advice, and they do not describe a customer’s compliance status.",
    ],
    howTitle: "Where to start",
    steps: [
      { title: "Definitions", body: "Start with the platform, banner, and preference-center explainers if the vocabulary is new." },
      { title: "Regimes", body: "Read the GDPR, CCPA/CPRA, and DPDP pages for how the product maps to those duties." },
      { title: "Implementation", body: "Use the developer and API pages when you are ready to install the SDK." },
      { title: "News and courses", body: "The news feed and e-learning modules sit beside the articles for ongoing context." },
    ],
    features: [
      { title: "Blog", body: "Articles on cookie consent, consent evidence, regional laws, and Google Consent Mode." },
      { title: "FAQs", body: "Short answers about the product, including the limit that the tool does not guarantee compliance." },
      { title: "DPDP tools", body: "Preliminary assessments for readiness, notices, and timelines. Not an official finding." },
      { title: "Privacy Centre", body: "Consent Guru’s own privacy policy, cookie policy, and request forms." },
    ],
    benefits: [
      "Definitions that match the product’s actual behavior.",
      "Internal links into the feature you just read about.",
      "A separation between education and the workspace.",
      "No fabricated reviews or customer counts.",
    ],
    useCases: [
      { title: "Privacy leads", body: "Share a guide with engineering before a kickoff." },
      { title: "Implementers", body: "Jump from an article to the SDK or API page." },
      { title: "Buyers", body: "Compare capabilities on the product pages, then ask for pricing." },
    ],
    considerations: [
      "Statutes change. Confirm obligations for your sector and markets with counsel before you rely on an article.",
      "If an article and a product page disagree, the product page and the in-app behavior are the description of the software.",
    ],
    faqs: [
      { question: "Are these guides legal advice?", answer: "No. They explain common privacy operations and how Consent Guru fits. They do not apply the law to your organization." },
      { question: "Where are the latest articles?", answer: "The blog lists every published article, newest first." },
      { question: "Do you publish customer reviews here?", answer: "No. These resources do not include testimonials, ratings, or customer counts." },
    ],
    related: [
      { href: "/blogs", label: "Blog", text: "All consent and privacy articles." },
      { href: "/faqs", label: "FAQs", text: "Short answers about Consent Guru." },
      { href: "/e-learning", label: "E-learning", text: "Modules on privacy operations." },
      { href: "/news", label: "News", text: "A feed of privacy reporting from configured sources." },
      { href: "/blogs/what-is-a-consent-management-platform", label: "What is a CMP?", text: "A definition of a consent management platform." },
      { href: "/about", label: "About", text: "Who builds Consent Guru." },
    ],
  },
];

const byPath = new Map(SEO_LANDINGS.map((page) => [page.path, page]));

export function getSeoLanding(path: string): SeoLanding {
  const page = byPath.get(path);
  if (!page) {
    throw new Error(`Missing SEO landing for ${path}`);
  }
  return page;
}

export const SEO_PUBLIC_PATHS = SEO_LANDINGS.map((page) => page.path);

export const SEO_PUBLIC_MATCHERS = SEO_PUBLIC_PATHS.map((path) => `${path}(.*)`);
