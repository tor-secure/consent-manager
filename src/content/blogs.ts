import { SEO_ARTICLES } from "@/content/seo-articles";

export type BlogSection = {
  heading?: string;
  paragraphs: string[];
};

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  region: string;
  publishedAt: string;
  readMinutes: number;
  cover: string;
  imageAlt: string;
  sections: BlogSection[];
};

export const BLOGS: BlogPost[] = [
  {
    slug: "india-dpdp-act-consent-manager",
    title: "India’s DPDP Act: what consent managers must get right",
    excerpt:
      "The Digital Personal Data Protection Act, 2023 recasts consent as a recorded, purpose-bound choice. Here is how platforms should operationalize it.",
    category: "DPDP",
    region: "India",
    publishedAt: "2026-09-02",
    readMinutes: 8,
    cover: "/images/blogs/india-dpdp-act-consent-manager.png",
    imageAlt: "Illustrated cover for India’s DPDP Act and consent managers",
    sections: [
      {
        paragraphs: [
          "India’s Digital Personal Data Protection Act, 2023 (DPDP Act) is one of the most consequential privacy statutes of this decade. It applies to digital personal data processed in India, and in many cases to processing outside India when it is connected with offering goods or services to people in India.",
          "Unlike a purely notice-and-cookie model, DPDP treats consent as a specific, informed, unconditional, and unambiguous indication of the Data Principal’s wishes. That consent must be tied to a stated purpose. A consent manager is not a nice-to-have overlay — it is the system of record for those choices.",
        ],
      },
      {
        heading: "Consent that can be proven later",
        paragraphs: [
          "Data Fiduciaries must be able to demonstrate that consent was obtained. That means storing more than a banner checkbox. Capture the policy version, purpose list, language, timestamp, user agent, and the Data Principal identifier that your product actually uses.",
          "DPDP also expects withdrawal to be as easy as giving consent. If users can accept in one tap, they should be able to reverse that decision from a preference center without calling support.",
        ],
      },
      {
        heading: "Where a consent manager helps",
        paragraphs: [
          "A dedicated consent manager translates legal purposes into runtime signals: which tags fire, which vendors receive data, and which processing activities remain lawful. It also gives India-facing teams a single place to update notices when purposes change, instead of editing every property by hand.",
          "This is not legal advice. Work with counsel on fiduciary classifications, children’s data, and Significant Data Fiduciary duties. Use the product to make those decisions enforceable once they are written.",
        ],
      },
    ],
  },
  {
    slug: "gdpr-consent-vs-legitimate-interest",
    title: "GDPR consent vs legitimate interest: pick the lawful basis you can defend",
    excerpt:
      "Article 6 is not a menu of convenience. Consent and legitimate interest have different tests, different UX, and different failure modes.",
    category: "GDPR",
    region: "European Union",
    publishedAt: "2026-08-28",
    readMinutes: 7,
    cover: "/images/blogs/gdpr-consent-vs-legitimate-interest.png",
    imageAlt: "Illustrated cover comparing GDPR consent and legitimate interest",
    sections: [
      {
        paragraphs: [
          "The GDPR requires a lawful basis before you process personal data. Marketing teams sometimes treat “consent” and “legitimate interest” as interchangeable. Supervisory authorities do not.",
          "Consent under Article 4(11) must be freely given, specific, informed, and unambiguous. Pre-ticked boxes, bundled purposes, and “take it or leave it” cookie walls fail that test. Legitimate interest under Article 6(1)(f) requires a balancing test, documentation, and a real opt-out where the interest is not compelling.",
        ],
      },
      {
        heading: "Cookies, ads, and ePrivacy",
        paragraphs: [
          "For non-essential cookies and similar tracking technologies, the ePrivacy Directive (as implemented in Member States) generally pushes you toward prior consent. Legitimate interest is rarely a clean fit for third-party advertising cookies.",
          "A consent manager should map each purpose to an explicit lawful basis so the banner, the preference center, and the vendor contracts tell the same story.",
        ],
      },
      {
        heading: "Operational takeaway",
        paragraphs: [
          "If you cannot explain the balancing test in writing, do not claim legitimate interest. If you cannot honor a withdrawal instantly, do not claim GDPR consent. Your CMP is the control plane that makes those claims true at runtime.",
        ],
      },
    ],
  },
  {
    slug: "why-businesses-need-a-consent-manager",
    title: "Why every multi-site business needs a consent manager",
    excerpt:
      "Privacy policies describe intent. A consent manager enforces it — across banners, SDKs, vendors, and audits.",
    category: "Consent manager",
    region: "Global",
    publishedAt: "2026-08-22",
    readMinutes: 6,
    cover: "/images/blogs/why-businesses-need-a-consent-manager.png",
    imageAlt: "Illustrated cover on why businesses need a consent manager",
    sections: [
      {
        paragraphs: [
          "A privacy policy is a document. A consent manager is a system. When those two drift apart, you get banners that say one thing while tags do another.",
          "Teams outgrow a single GTM checkbox the moment they add a second brand, a mobile app, a new ad vendor, or a second country. The consent manager becomes the shared source of truth for purposes, vendors, and evidence.",
        ],
      },
      {
        heading: "What “good” looks like",
        paragraphs: [
          "Good CMPs collect granular choices, persist them, propagate them to scripts and SDKs, and keep an audit trail. They also let legal update copy without a full engineering release.",
          "Consent Guru is built for that loop: publish a policy, install the SDK, record decisions, and prove them later. That is how consent moves from a homepage widget to an operational control.",
        ],
      },
    ],
  },
  {
    slug: "ccpa-cpra-california-opt-out",
    title: "CCPA and CPRA: designing opt-out that actually works",
    excerpt:
      "California’s privacy law is opt-out first for sale and sharing. Your banner, GPC handling, and “Do Not Sell” link have to agree.",
    category: "CCPA / CPRA",
    region: "United States",
    publishedAt: "2026-08-18",
    readMinutes: 7,
    cover: "/images/blogs/ccpa-cpra-california-opt-out.png",
    imageAlt: "Illustrated cover for CCPA and CPRA opt-out design",
    sections: [
      {
        paragraphs: [
          "The California Consumer Privacy Act, as amended by the CPRA, gives consumers rights to know, delete, correct, and opt out of sale or sharing of personal information, including cross-context behavioral advertising.",
          "Unlike GDPR, California does not always require prior opt-in for analytics. It does require a clear opt-out path, honoring Global Privacy Control (GPC) signals, and careful treatment of sensitive personal information.",
        ],
      },
      {
        heading: "Sale, sharing, and service providers",
        paragraphs: [
          "If adtech partners receive identifiers for advertising, you may be “selling” or “sharing” even if no money changes hands. Service-provider contracts and purpose limitation become as important as the banner UI.",
          "A consent manager should translate “Do Not Sell or Share” into vendor-level suppression, not just a footer link that emails legal.",
        ],
      },
    ],
  },
  {
    slug: "lgpd-brazil-consent-requirements",
    title: "LGPD in Brazil: consent, ANPD expectations, and multilingual notices",
    excerpt:
      "Brazil’s LGPD looks familiar to GDPR teams, but ANPD guidance, Portuguese notices, and children’s rules still catch global brands off guard.",
    category: "LGPD",
    region: "Brazil",
    publishedAt: "2026-08-12",
    readMinutes: 6,
    cover: "/images/blogs/lgpd-brazil-consent-requirements.png",
    imageAlt: "Illustrated cover for Brazil LGPD consent requirements",
    sections: [
      {
        paragraphs: [
          "The Lei Geral de Proteção de Dados (LGPD) sets out lawful bases similar to GDPR, including consent and legitimate interest. ANPD has been increasingly active on cookies, incident response, and international transfers.",
          "If you serve Brazilian users, Portuguese-language notices and an easy withdrawal path are not optional extras. Consent must be free, informed, and unambiguous — and you must keep records.",
        ],
      },
      {
        heading: "Practical CMP setup",
        paragraphs: [
          "Geolocate carefully, show the correct policy version, and do not reuse an EU banner verbatim. Map LGPD purposes to the same vendor graph you use for GDPR so one SDK can enforce both.",
        ],
      },
    ],
  },
  {
    slug: "pipeda-canada-meaningful-consent",
    title: "PIPEDA and meaningful consent in Canada",
    excerpt:
      "Canada’s federal private-sector law asks whether a reasonable person would understand what they agreed to — not whether a box was ticked.",
    category: "PIPEDA",
    region: "Canada",
    publishedAt: "2026-08-06",
    readMinutes: 6,
    cover: "/images/blogs/pipeda-canada-meaningful-consent.png",
    imageAlt: "Illustrated cover for PIPEDA meaningful consent in Canada",
    sections: [
      {
        paragraphs: [
          "PIPEDA’s “meaningful consent” guidance focuses on what a reasonable person would understand about the nature, purpose, and consequences of collection. Buried purposes in a 4,000-word policy fail that test.",
          "Quebec’s Law 25 adds stricter consent, privacy impact assessments, and biometric rules. National brands often need a CMP that can vary notices by province without forking the entire stack.",
        ],
      },
      {
        heading: "Design for understanding",
        paragraphs: [
          "Layered notices, plain language, and purpose-level toggles help more than a single “I agree.” Keep evidence of what was shown, in which language, at the time of the choice.",
        ],
      },
    ],
  },
  {
    slug: "pdpa-singapore-consent-obligations",
    title: "Singapore PDPA: consent, notification, and purpose limitation",
    excerpt:
      "Singapore’s PDPA allows exceptions, but notification and purpose limitation still require a disciplined consent and preference layer.",
    category: "PDPA",
    region: "Singapore",
    publishedAt: "2026-07-30",
    readMinutes: 6,
    cover: "/images/blogs/pdpa-singapore-consent-obligations.png",
    imageAlt: "Illustrated cover for Singapore PDPA consent obligations",
    sections: [
      {
        paragraphs: [
          "The Personal Data Protection Act in Singapore is built around consent, notification, and purpose limitation, with notable exceptions for legitimate interests and business improvement in defined cases.",
          "PDPC guidance on cookies and online tracking still expects organizations to be transparent. If you rely on consent, withdrawal must be straightforward.",
        ],
      },
      {
        heading: "Regional platforms",
        paragraphs: [
          "Many APAC products serve Singapore, Malaysia, and Indonesia from one codebase. A consent manager lets you attach jurisdiction rules to the same purpose catalog instead of maintaining three banners in three repos.",
        ],
      },
    ],
  },
  {
    slug: "pdpa-thailand-cross-border-rules",
    title: "Thailand’s PDPA and cross-border data transfers",
    excerpt:
      "Thailand’s PDPA is now an enforcement reality. Transfers, cookies, and consent records need the same rigor as EU programs.",
    category: "PDPA",
    region: "Thailand",
    publishedAt: "2026-07-24",
    readMinutes: 6,
    cover: "/images/blogs/pdpa-thailand-cross-border-rules.png",
    imageAlt: "Illustrated cover for Thailand PDPA cross-border rules",
    sections: [
      {
        paragraphs: [
          "Thailand’s Personal Data Protection Act requires a lawful basis for processing and sets conditions for sending personal data outside the country. Adequacy, appropriate safeguards, and exceptions should be documented — not improvised in a vendor form.",
          "Consent remains a common basis for marketing and cookies. If you collect consent, you must be able to show it and honor withdrawal.",
        ],
      },
      {
        heading: "CMP as transfer hygiene",
        paragraphs: [
          "Tag a vendor as in-country or out-of-country, bind it to purposes, and block it when the user declines. That is simpler than discovering a transfer path during an audit.",
        ],
      },
    ],
  },
  {
    slug: "pipa-south-korea-consent-banners",
    title: "South Korea’s PIPA: high-friction consent done well",
    excerpt:
      "Korea’s PIPA is known for detailed, purpose-specific consent. Generic EU banners usually fail on day one.",
    category: "PIPA",
    region: "South Korea",
    publishedAt: "2026-07-18",
    readMinutes: 7,
    cover: "/images/blogs/pipa-south-korea-consent-banners.png",
    imageAlt: "Illustrated cover for South Korea PIPA consent banners",
    sections: [
      {
        paragraphs: [
          "The Personal Information Protection Act in South Korea expects granular notice: what you collect, why, how long you keep it, and who you share it with. Optional items should be separable from required items.",
          "Overseas transfers and marketing often need distinct consent. A single “accept all” control is a poor fit unless it still exposes those distinctions.",
        ],
      },
      {
        heading: "Product implication",
        paragraphs: [
          "Your consent manager should support purpose grouping that matches Korean notice tables, not only IAB stacks. Store the exact notice version shown to the user.",
        ],
      },
    ],
  },
  {
    slug: "appi-japan-cookie-consent",
    title: "Japan’s APPI and the cookie consent conversation",
    excerpt:
      "APPI amendments tightened sharing rules. Cookie and advertising programs still need a clear, Japan-specific story.",
    category: "APPI",
    region: "Japan",
    publishedAt: "2026-07-12",
    readMinutes: 6,
    cover: "/images/blogs/appi-japan-cookie-consent.png",
    imageAlt: "Illustrated cover for Japan APPI cookie consent",
    sections: [
      {
        paragraphs: [
          "Japan’s Act on the Protection of Personal Information has been amended several times to address data breaches, foreign transfers, and “personally referable information” used in advertising.",
          "Even where a classic GDPR-style cookie wall is not copied verbatim, transparency and user choice are now expected by partners, platforms, and customers.",
        ],
      },
      {
        heading: "What to implement",
        paragraphs: [
          "Offer a preference center in Japanese, document third-party sharing, and keep a record of opt-outs. A CMP keeps that record aligned with tag firing on .jp properties.",
        ],
      },
    ],
  },
  {
    slug: "australia-privacy-act-reforms",
    title: "Australia’s Privacy Act reforms and the rise of enforceable consent",
    excerpt:
      "Reforms around children’s privacy, consent, and OAIC enforcement are pushing Australian programs beyond a static policy page.",
    category: "Privacy Act",
    region: "Australia",
    publishedAt: "2026-07-06",
    readMinutes: 6,
    cover: "/images/blogs/australia-privacy-act-reforms.png",
    imageAlt: "Illustrated cover for Australia Privacy Act reforms",
    sections: [
      {
        paragraphs: [
          "Australia’s Privacy Act 1988 is no longer a quiet background statute. Reform debates have focused on a fair and reasonable test, children’s privacy, and stronger OAIC powers.",
          "APP 5 and APP 6 still require notice and use limitation. Direct marketing and targeting of children are under particular scrutiny.",
        ],
      },
      {
        heading: "Build the control now",
        paragraphs: [
          "Waiting for every amendment to pass is a poor strategy if you already collect analytics, ads, and account data. A consent manager lets you tighten purposes as the law hardens without rebuilding the site.",
        ],
      },
    ],
  },
  {
    slug: "uk-gdpr-post-brexit-cmp",
    title: "UK GDPR after Brexit: same vocabulary, different regulator",
    excerpt:
      "UK GDPR still looks like EU GDPR, but ICO guidance, PECR cookies, and the Data (Use and Access) trajectory deserve their own configuration.",
    category: "UK GDPR",
    region: "United Kingdom",
    publishedAt: "2026-06-28",
    readMinutes: 6,
    cover: "/images/blogs/uk-gdpr-post-brexit-cmp.png",
    imageAlt: "Illustrated cover for UK GDPR and consent management",
    sections: [
      {
        paragraphs: [
          "The UK retained GDPR in domestic law. The Information Commissioner’s Office remains the primary regulator, and PECR still governs cookies and electronic marketing.",
          "ICO cookie guidance has long emphasized rejecting as easily as accepting, and avoiding dark patterns. That is a UX requirement as much as a legal one.",
        ],
      },
      {
        heading: "Do not clone the EU banner blindly",
        paragraphs: [
          "Transfers from the EU to the UK and back still need a transfer story. Keep UK and EU policy versions distinct in your CMP even if the copy looks similar today.",
        ],
      },
    ],
  },
  {
    slug: "popia-south-africa-consent",
    title: "POPIA in South Africa: consent, operators, and accountable processing",
    excerpt:
      "POPIA puts a premium on responsible parties, operator agreements, and conditions for processing. Consent is only one of several paths.",
    category: "POPIA",
    region: "South Africa",
    publishedAt: "2026-06-20",
    readMinutes: 6,
    cover: "/images/blogs/popia-south-africa-consent.png",
    imageAlt: "Illustrated cover for South Africa POPIA consent",
    sections: [
      {
        paragraphs: [
          "The Protection of Personal Information Act requires a lawful justification, including consent, contract, legal obligation, or legitimate interest of the responsible party or a third party — with conditions.",
          "Direct marketing by electronic means generally needs opt-in after a first approach. That is a classic CMP use case.",
        ],
      },
      {
        heading: "Operators and evidence",
        paragraphs: [
          "If vendors process on your behalf, operator agreements must match the purposes you actually enable in the SDK. Consent records help you show the Information Regulator what was authorized.",
        ],
      },
    ],
  },
  {
    slug: "uae-pdpl-consent-management",
    title: "UAE PDPL: federal privacy rules meet free-zone regimes",
    excerpt:
      "The UAE’s PDPL sits alongside DIFC and ADGM regimes. Multi-entity groups need jurisdiction-aware consent, not one Gulf-wide banner.",
    category: "PDPL",
    region: "United Arab Emirates",
    publishedAt: "2026-06-12",
    readMinutes: 6,
    cover: "/images/blogs/uae-pdpl-consent-management.png",
    imageAlt: "Illustrated cover for UAE PDPL consent management",
    sections: [
      {
        paragraphs: [
          "The UAE Personal Data Protection Law introduced federal rules on processing, consent, and data subject rights, while DIFC and ADGM continue to operate sophisticated free-zone regimes.",
          "Consent should be distinct from other bases, and withdrawal should be possible. Cross-border transfers need extra care when processors sit outside the UAE.",
        ],
      },
      {
        heading: "Configuration, not copy-paste",
        paragraphs: [
          "Identify which entity is the controller, which law applies to the property, and which vendors are in scope. A consent manager encodes that map so marketing cannot accidentally enable a blocked processor.",
        ],
      },
    ],
  },
  {
    slug: "saudi-pdpl-data-protection",
    title: "Saudi PDPL: national data, consent, and localization pressure",
    excerpt:
      "Saudi Arabia’s PDPL and SDAIA regulations raise the bar on consent quality, sensitive data, and when data should stay in-kingdom.",
    category: "PDPL",
    region: "Saudi Arabia",
    publishedAt: "2026-06-04",
    readMinutes: 6,
    cover: "/images/blogs/saudi-pdpl-data-protection.png",
    imageAlt: "Illustrated cover for Saudi PDPL data protection",
    sections: [
      {
        paragraphs: [
          "Saudi Arabia’s Personal Data Protection Law, overseen with SDAIA, emphasizes lawful processing, data subject rights, and controls around sensitive data and transfers.",
          "Marketing consent should be explicit. Government and regulated sectors may face additional localization or registration expectations.",
        ],
      },
      {
        heading: "Consent as a gate",
        paragraphs: [
          "Use the CMP to gate optional analytics and advertising independently from account login. Keep Arabic and English notices versioned. Record who accepted what.",
        ],
      },
    ],
  },
  {
    slug: "china-pipl-separate-consent",
    title: "China PIPL: separate consent is not a slogan",
    excerpt:
      "PIPL expects separate consent for sensitive personal information, public disclosure, and many cross-border transfers. Bundling is a liability.",
    category: "PIPL",
    region: "China",
    publishedAt: "2026-05-28",
    readMinutes: 7,
    cover: "/images/blogs/china-pipl-separate-consent.png",
    imageAlt: "Illustrated cover for China PIPL separate consent",
    sections: [
      {
        paragraphs: [
          "China’s Personal Information Protection Law is among the world’s strictest on “separate consent.” Sensitive personal information, sharing with other processors, and overseas transfers often need a distinct, informed choice.",
          "CAC rules around standard contracts and security assessments sit on top of that consent layer. A Western cookie banner is not a PIPL program.",
        ],
      },
      {
        heading: "Engineering the split",
        paragraphs: [
          "Model separate consent as first-class purposes in your manager. Do not infer PIPL consent from a GDPR accept-all. Keep China properties on a policy that legal has actually signed off.",
        ],
      },
    ],
  },
  {
    slug: "cookie-consent-best-practices",
    title: "Cookie consent best practices that still hold up in 2026",
    excerpt:
      "Reject as easily as accept, no pre-ticked boxes, real blocking before consent, and receipts you can produce in an investigation.",
    category: "Cookies",
    region: "Global",
    publishedAt: "2026-05-20",
    readMinutes: 7,
    cover: "/images/blogs/cookie-consent-best-practices.png",
    imageAlt: "Illustrated cover for cookie consent best practices",
    sections: [
      {
        paragraphs: [
          "Cookie enforcement across the EU, UK, and increasingly APAC has converged on a few non-negotiables: equal-prominence choices, purpose-level information, and no tracking before consent for non-essential storage.",
          "Dark patterns — hiding reject, using confirm-shaming, or re-prompting every session until the user surrenders — are now a documented enforcement theme.",
        ],
      },
      {
        heading: "Technical blocking",
        paragraphs: [
          "A pretty banner that does not block tags is theater. Your SDK or tag manager must wait for a signal from the consent manager. Scan your sites. Then scan them again after marketing adds a pixel.",
        ],
      },
    ],
  },
  {
    slug: "recording-consent-evidence-audits",
    title: "Consent evidence: what auditors actually ask for",
    excerpt:
      "When a regulator or customer asks “prove it,” screenshots of a banner are not enough. Here is the evidence pack a CMP should produce.",
    category: "Consent manager",
    region: "Global",
    publishedAt: "2026-05-12",
    readMinutes: 8,
    cover: "/images/blogs/recording-consent-evidence-audits.png",
    imageAlt: "Illustrated cover for consent evidence and audits",
    sections: [
      {
        paragraphs: [
          "Proof of consent usually includes: who the user was (or a durable pseudonymous ID), when they chose, what they saw, which purposes they accepted or rejected, which policy version applied, and how withdrawal was later honored.",
          "IP addresses and user agents can support integrity but are themselves personal data. Minimize what you store and lock retention to a defensible period.",
        ],
      },
      {
        heading: "Make export boring",
        paragraphs: [
          "The best audit is a boring export: a consent ID, a JSON of decisions, and a link to the policy snapshot. Consent Guru is designed so that record is a product feature, not a forensic project.",
        ],
      },
    ],
  },
  {
    slug: "withdrawing-consent-without-friction",
    title: "Withdrawal of consent should be as easy as saying yes",
    excerpt:
      "DPDP, GDPR, and LGPD all expect withdrawal without detriment. That is a preference-center problem, not a help-desk ticket.",
    category: "Consent manager",
    region: "Global",
    publishedAt: "2026-05-04",
    readMinutes: 6,
    cover: "/images/blogs/withdrawing-consent-without-friction.png",
    imageAlt: "Illustrated cover for withdrawing consent without friction",
    sections: [
      {
        paragraphs: [
          "If users must email a DPO to turn off marketing cookies, you do not have lawful consent — you have a maze. Withdrawal must be reachable from the same surfaces where consent was collected.",
        ],
      },
      {
        heading: "Propagate immediately",
        paragraphs: [
          "Withdrawal is only real when tags stop, vendors are notified, and downstream caches expire. A consent manager should broadcast the new state to every property that shares the ID space.",
          "Tell the user what happens next: ads may become less relevant, some features may degrade, and required processing continues where a different lawful basis applies.",
        ],
      },
    ],
  },
  {
    slug: "preference-centers-and-consent-managers",
    title: "Preference centers: the missing half of the consent banner",
    excerpt:
      "Banners capture a moment. Preference centers manage a relationship — channels, purposes, and vendors over the life of an account.",
    category: "Consent manager",
    region: "Global",
    publishedAt: "2026-04-26",
    readMinutes: 6,
    cover: "/images/blogs/preference-centers-and-consent-managers.png",
    imageAlt: "Illustrated cover for preference centers and consent managers",
    sections: [
      {
        paragraphs: [
          "A banner is optimized for first visit. A preference center is optimized for returning customers who want email but not ads, or analytics but not sale of data.",
          "Wire channel consents (email, SMS, push) to the same purpose model as cookies. Otherwise CRM and the website will disagree, and both will be wrong in an audit.",
        ],
      },
      {
        heading: "Keep it honest",
        paragraphs: [
          "Do not hide vendor lists. Do not reset preferences on login. Do not require account creation solely to say no. The preference center is where trust is either compounded or spent.",
        ],
      },
    ],
  },
  {
    slug: "iab-tcf-and-global-privacy-platform",
    title: "IAB TCF and the Global Privacy Platform, explained for product teams",
    excerpt:
      "TCF strings are how many European ad ecosystems hear consent. GPP extends that idea to US state signals. Your CMP should speak both.",
    category: "IAB / TCF",
    region: "EU & United States",
    publishedAt: "2026-04-18",
    readMinutes: 8,
    cover: "/images/blogs/iab-tcf-and-global-privacy-platform.png",
    imageAlt: "Illustrated cover for IAB TCF and Global Privacy Platform",
    sections: [
      {
        paragraphs: [
          "The IAB Europe Transparency and Consent Framework encodes purposes, special features, and vendor IDs into a TC string that bidders and tags can parse. It is not a substitute for GDPR compliance, but it is how large parts of the open web operationalize consent.",
          "The IAB’s Global Privacy Platform (GPP) adds sections for US state privacy signals so a single string can carry more than EU TCF.",
        ],
      },
      {
        heading: "Use the framework; own the policy",
        paragraphs: [
          "Load a Global Vendor List, map only the vendors you actually use, and still write a human-readable notice. A TCF string without a truthful banner is just a compact lie.",
        ],
      },
    ],
  },
  {
    slug: "childrens-privacy-coppa-and-dpdp",
    title: "Children’s privacy: COPPA, DPDP, and GDPR age gates",
    excerpt:
      "Minors’ data is not a smaller GDPR. It is a different regime — parental authority, restricted processing, and age assurance.",
    category: "Children’s privacy",
    region: "US, EU, India",
    publishedAt: "2026-04-10",
    readMinutes: 7,
    cover: "/images/blogs/childrens-privacy-coppa-and-dpdp.png",
    imageAlt: "Illustrated cover for children’s privacy under COPPA and DPDP",
    sections: [
      {
        paragraphs: [
          "COPPA in the United States restricts collection from children under 13 without verifiable parental consent for many online services. GDPR sets a range of digital consent ages by Member State. India’s DPDP Act has specific rules for children and persons with disability, including guardian consent.",
          "Age gates that simply ask “are you 18?” without any integrity checks will not carry a serious program.",
        ],
      },
      {
        heading: "Design for restriction",
        paragraphs: [
          "Default to the stricter path: disable behavioral ads, limit profiling, and route guardian workflows through a dedicated flow. Consent managers should support a child profile that cannot silently inherit an adult’s marketing opt-in.",
        ],
      },
    ],
  },
  {
    slug: "cross-border-transfers-and-consent",
    title: "Cross-border transfers: consent is not your only (or best) tool",
    excerpt:
      "SCCs, adequacy, and localization sit beside consent. Mixing them up is how global products fail DPIAs.",
    category: "Transfers",
    region: "Global",
    publishedAt: "2026-04-02",
    readMinutes: 7,
    cover: "/images/blogs/cross-border-transfers-and-consent.png",
    imageAlt: "Illustrated cover for cross-border transfers and consent",
    sections: [
      {
        paragraphs: [
          "GDPR Chapter V, PIPL, DPDP, and many APAC laws restrict exporting personal data. Consent can sometimes legitimize a transfer, but it is brittle: it must be informed about the destination and risks, and it can be withdrawn.",
          "Standard contractual clauses, adequacy decisions, and certification mechanisms are usually more durable for core infrastructure.",
        ],
      },
      {
        heading: "Still connect it to the CMP",
        paragraphs: [
          "Even when SCCs carry the transfer, the user may still need to consent to the purpose that causes the transfer (for example, a US ad network). Show that honestly. Block the vendor when consent is absent.",
        ],
      },
    ],
  },
  {
    slug: "vendor-management-under-privacy-laws",
    title: "Vendor management is privacy management",
    excerpt:
      "Most “consent failures” are actually vendor-graph failures: a pixel nobody owned, on a purpose nobody mapped.",
    category: "Vendors",
    region: "Global",
    publishedAt: "2026-03-24",
    readMinutes: 6,
    cover: "/images/blogs/vendor-management-under-privacy-laws.png",
    imageAlt: "Illustrated cover for vendor management under privacy laws",
    sections: [
      {
        paragraphs: [
          "Processors, independent controllers, and joint controllers all show up in a modern tag inventory. Laws care about the distinction. Your scanner might only see a script URL.",
          "A consent manager should list vendors, purposes, and contracts in one graph. When marketing adds a tool, it should fail closed until legal maps it.",
        ],
      },
      {
        heading: "Discovery first",
        paragraphs: [
          "Run regular scans. Compare discovered trackers to approved vendors. The gap is your real risk register.",
        ],
      },
    ],
  },
  {
    slug: "mobile-app-consent-sdks",
    title: "Mobile app consent: ATT, consent SDKs, and store policies",
    excerpt:
      "Web banners do not cover iOS App Tracking Transparency or Play policy. Apps need the same purpose model with a different runtime.",
    category: "Mobile",
    region: "Global",
    publishedAt: "2026-03-16",
    readMinutes: 6,
    cover: "/images/blogs/mobile-app-consent-sdks.png",
    imageAlt: "Illustrated cover for mobile app consent SDKs",
    sections: [
      {
        paragraphs: [
          "Apple’s App Tracking Transparency prompt is not GDPR consent, and GDPR consent is not ATT. You may need both, in a lawful order, with copy that does not contradict itself.",
          "Google Play and privacy manifests add disclosure requirements for data collection. Your in-app preference center should match the store listing.",
        ],
      },
      {
        heading: "One policy, two runtimes",
        paragraphs: [
          "Keep web and mobile on the same purpose catalog so a user who opted out on the site is not re-targeted in the app. That is the promise of a real consent manager SDK.",
        ],
      },
    ],
  },
  {
    slug: "multi-jurisdiction-consent-orchestration",
    title: "Orchestrating consent across GDPR, DPDP, CPRA, and LGPD",
    excerpt:
      "One product, many laws. The winning pattern is a shared purpose catalog plus jurisdiction rules — not 12 unrelated banners.",
    category: "Consent manager",
    region: "Global",
    publishedAt: "2026-03-08",
    readMinutes: 8,
    cover: "/images/blogs/multi-jurisdiction-consent-orchestration.png",
    imageAlt: "Illustrated cover for multi-jurisdiction consent orchestration",
    sections: [
      {
        paragraphs: [
          "Global companies fail when each region forks a WordPress plugin. Purposes drift. Vendor lists diverge. Evidence cannot be joined.",
          "A better model: define purposes once (analytics, ads, personalization, strict necessities), then attach jurisdiction rules: opt-in vs opt-out, GPC, children’s flags, language, and retention.",
        ],
      },
      {
        heading: "Geolocation with humility",
        paragraphs: [
          "IP geolocation is imperfect. When unsure, apply the stricter rule. Let users self-identify region in the preference center if needed. Log which rule set fired.",
        ],
      },
    ],
  },
  {
    slug: "data-subject-rights-and-your-cmp",
    title: "Data subject rights work better when consent data is structured",
    excerpt:
      "Access, deletion, and portability requests stall when consent logs live in a tag manager and CRM lives somewhere else.",
    category: "Data rights",
    region: "Global",
    publishedAt: "2026-02-28",
    readMinutes: 6,
    cover: "/images/blogs/data-subject-rights-and-your-cmp.png",
    imageAlt: "Illustrated cover for data subject rights and consent managers",
    sections: [
      {
        paragraphs: [
          "GDPR Articles 15–22, CPRA, DPDP, and LGPD all create rights workflows. Teams that cannot find a person’s consent history cannot complete an access request with confidence.",
          "Bind consent records to the same identifiers you use for accounts — with a clear rule for anonymous IDs that later log in.",
        ],
      },
      {
        heading: "Close the loop",
        paragraphs: [
          "A deletion request should also suppress future processing and notify vendors where contracts require it. Your CMP and rights-request queue should share a tenant, not a spreadsheet.",
        ],
      },
    ],
  },
  {
    slug: "age-assurance-and-parental-consent",
    title: "Age assurance and parental consent without wrecking UX",
    excerpt:
      "Regulators want age-appropriate design. Users want to finish signup. The middle path is risk-based assurance plus a guardian flow.",
    category: "Age assurance",
    region: "Global",
    publishedAt: "2026-02-18",
    readMinutes: 6,
    cover: "/images/blogs/age-assurance-and-parental-consent.png",
    imageAlt: "Illustrated cover for age assurance and parental consent",
    sections: [
      {
        paragraphs: [
          "Age assurance ranges from self-declaration to document checks. The right level depends on the risk of the service. Over-collecting identity documents creates its own privacy problem.",
          "When a user is a child, pause optional processing and start a guardian-consent workflow with proof of authority.",
        ],
      },
      {
        heading: "Keep it in the platform",
        paragraphs: [
          "Do not bolt age checks onto a marketing CMP as an afterthought. Treat age status as an input to the same decision engine that allows or blocks vendors.",
        ],
      },
    ],
  },
  {
    slug: "ai-agents-permissioning-and-privacy",
    title: "AI agents, permissioning, and the next consent frontier",
    excerpt:
      "When software acts on a user’s behalf, yesterday’s cookie toggle is not enough. Agent permissioning needs purpose, scope, and revocation.",
    category: "AI & privacy",
    region: "Global",
    publishedAt: "2026-02-08",
    readMinutes: 7,
    cover: "/images/blogs/ai-agents-permissioning-and-privacy.png",
    imageAlt: "Illustrated cover for AI agents and privacy permissioning",
    sections: [
      {
        paragraphs: [
          "Privacy laws were written for organizations processing data about people. Agent-based products invert that: software requests permission to act as the person across services.",
          "You still need a lawful basis, minimization, and logs. You also need scopes that expire, and a way for the human to revoke an agent without hunting through 20 OAuth grants.",
        ],
      },
      {
        heading: "Consent manager as policy runtime",
        paragraphs: [
          "The same engine that decides whether a tag may fire can decide whether an agent may read a preference or submit a privacy request. Start with explicit purposes and human-readable receipts.",
        ],
      },
    ],
  },
  {
    slug: "privacy-laws-around-the-world-2026",
    title: "Privacy laws around the world in 2026: a field guide for CMP teams",
    excerpt:
      "From DPDP and GDPR to CPRA, LGPD, PIPL, and PDPL regimes, the common thread is choice you can enforce. Here is the map.",
    category: "Global survey",
    region: "Worldwide",
    publishedAt: "2026-01-28",
    readMinutes: 9,
    cover: "/images/blogs/privacy-laws-around-the-world-2026.png",
    imageAlt: "Illustrated cover for a 2026 global privacy law field guide",
    sections: [
      {
        paragraphs: [
          "By 2026, “we have a cookie banner” is not a privacy program. Comprehensive laws exist in the EU and UK, Brazil, India, China, many APAC states, Gulf jurisdictions, South Africa, and a growing list of US states.",
          "They disagree on opt-in versus opt-out, children’s ages, transfer tools, and private rights of action. They agree that organizations must know their purposes, vendors, and user choices.",
        ],
      },
      {
        heading: "What to standardize anyway",
        paragraphs: [
          "Standardize a purpose catalog, a vendor inventory, multilingual notices, evidence export, and withdrawal. Localize the rule set. That split is how a consent manager scales without pretending every law is GDPR.",
        ],
      },
      {
        heading: "Where Consent Guru fits",
        paragraphs: [
          "Consent Guru is built so product, legal, and engineering share one workspace: policies, purposes, websites, SDKs, and records. Use these articles as context, then encode the decisions your counsel actually makes.",
          "This series is educational, not legal advice. Privacy statutes change. Confirm obligations for your sector and markets before you ship.",
        ],
      },
    ],
  },
];

function allBlogs(): BlogPost[] {
  return [...SEO_ARTICLES, ...BLOGS];
}

export function getAllBlogs(): BlogPost[] {
  return allBlogs().sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

export function getBlogBySlug(slug: string): BlogPost | undefined {
  return allBlogs().find((post) => post.slug === slug);
}

export function getRelatedBlogs(slug: string, limit = 3): BlogPost[] {
  const current = getBlogBySlug(slug);
  if (!current) return getAllBlogs().slice(0, limit);
  return getAllBlogs()
    .filter((post) => post.slug !== slug)
    .sort((a, b) => {
      const aScore = a.category === current.category || a.region === current.region ? 1 : 0;
      const bScore = b.category === current.category || b.region === current.region ? 1 : 0;
      return bScore - aScore;
    })
    .slice(0, limit);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatBlogDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const monthLabel = MONTHS[(month ?? 1) - 1] ?? MONTHS[0];
  return `${monthLabel} ${day}, ${year}`;
}
