import type { BlogPost } from "@/content/blogs";

const cover = (slug: string) => `/images/blogs/${slug}.svg`;

export const SEO_ARTICLES: BlogPost[] = [
  {
    slug: "what-is-a-consent-management-platform",
    title: "What is a consent management platform?",
    excerpt:
      "A consent management platform collects privacy choices, stores the record, and passes that choice to the tags and systems that need it.",
    category: "Consent manager",
    region: "Global",
    publishedAt: "2026-09-20",
    readMinutes: 6,
    cover: cover("what-is-a-consent-management-platform"),
    imageAlt: "Geometric cover for an article defining a consent management platform",
    sections: [
      {
        paragraphs: [
          "A consent management platform, often called a CMP, is software that helps an organization present a privacy choice, store what the person selected, and apply that selection to cookies, tags, and downstream systems.",
          "The banner is only the visible part. The platform also keeps the notice version, the purposes, and a way for the person to change their mind. Without those pieces, a click is not a record you can explain later.",
        ],
      },
      {
        heading: "What a CMP is not",
        paragraphs: [
          "It is not a privacy policy, a legal opinion, or a guarantee of compliance. Counsel still decides which purposes need consent, which can rely on another basis, and which requests you must fulfill.",
          "It is also not a substitute for vendor contracts. If a tag receives data, the CMP can only suppress the tags you have mapped. It cannot rewrite a contract you never signed.",
        ],
      },
      {
        heading: "How Consent Guru approaches it",
        paragraphs: [
          "Consent Guru publishes a policy version, serves it through a browser SDK, and stores the decision with a consent identifier and a notice snapshot. Analytics summarize outcomes. The API and webhooks carry the same choice to systems outside the browser.",
          "This article is educational, not legal advice.",
        ],
      },
    ],
  },
  {
    slug: "how-a-cookie-banner-works",
    title: "How does a cookie banner work?",
    excerpt:
      "A cookie banner explains purposes, collects a choice, and should leave a record that the preference center can reopen.",
    category: "Cookies",
    region: "Global",
    publishedAt: "2026-09-18",
    readMinutes: 5,
    cover: cover("how-a-cookie-banner-works"),
    imageAlt: "Geometric cover for an article on how a cookie banner works",
    sections: [
      {
        paragraphs: [
          "A cookie banner is the notice a site shows before, or as, it asks to store or read non-essential cookies and similar trackers. A useful banner names the purposes, offers a real choice, and writes down what happened.",
          "Accept-only banners fail that test. So do banners whose text no longer matches the tags on the page.",
        ],
      },
      {
        heading: "From draft to published version",
        paragraphs: [
          "In Consent Guru, Banner Studio edits a draft. The live site uses the last published policy version. Rollback copies an older version forward. It does not pretend the older text was never replaced.",
          "The preference center uses that same published version, so withdrawal is not a different story from the banner.",
        ],
      },
      {
        heading: "What the banner cannot do",
        paragraphs: [
          "It cannot classify a cookie’s legal status by itself, and it cannot block a script that already ran. Install the SDK early, map the tags you care about, and treat the banner as the interface for a choice you have already defined.",
        ],
      },
    ],
  },
  {
    slug: "google-consent-mode-v2-explained",
    title: "Google Consent Mode v2 explained",
    excerpt:
      "Consent Mode tells Google tags how to treat ads and analytics storage. Version 2 adds ad user data and ad personalization signals.",
    category: "Integrations",
    region: "Global",
    publishedAt: "2026-09-16",
    readMinutes: 6,
    cover: cover("google-consent-mode-v2-explained"),
    imageAlt: "Geometric cover for an article explaining Google Consent Mode v2",
    sections: [
      {
        paragraphs: [
          "Google Consent Mode is a way for tags to adjust their behavior based on signals such as analytics_storage and ad_storage. Consent Mode v2 adds ad_user_data and ad_personalization, which matter for advertising measurement that uses user data.",
          "The banner still collects the choice. Consent Mode only informs tags that know how to read it.",
        ],
      },
      {
        heading: "What Consent Guru sends",
        paragraphs: [
          "When you enable Google Consent Mode on a website, optional ad and analytics storage can start denied. After the visitor chooses, the SDK updates the signals from your purpose map. Analytics-style purposes default to analytics_storage. Advertising-style purposes default to the ad signals, including the v2 fields.",
          "You can change that map. The default wait for an update is 500 milliseconds.",
        ],
      },
      {
        heading: "Limits",
        paragraphs: [
          "Consent Mode does not decide whether you have a lawful basis. It also cannot recall a request a tag sent before the SDK loaded, and it does not configure tags that live only inside a tag-manager container.",
          "This explanation is not legal advice.",
        ],
      },
    ],
  },
  {
    slug: "what-is-a-privacy-preference-center",
    title: "What is a privacy preference center?",
    excerpt:
      "A privacy preference center lets people review and change the cookie and consent choices a site already recorded.",
    category: "Consent manager",
    region: "Global",
    publishedAt: "2026-09-14",
    readMinutes: 5,
    cover: cover("what-is-a-privacy-preference-center"),
    imageAlt: "Geometric cover for an article on privacy preference centers",
    sections: [
      {
        paragraphs: [
          "A privacy preference center is the place a person returns to after the banner. It lists the purposes already offered and lets them allow, refuse, or withdraw an optional one.",
          "If withdrawal requires an email to support, the organization will be slow, and the record of the change will be weak.",
        ],
      },
      {
        heading: "Current choice versus history",
        paragraphs: [
          "Updating a preference should change what tags are allowed to do now. It should not erase the fact that a different choice was recorded earlier. Consent Guru keeps historical evidence according to your retention settings and any legal hold.",
        ],
      },
      {
        heading: "Make it findable",
        paragraphs: [
          "Link the center from the footer or a persistent control. A center that visitors cannot reopen does not meet a standard that withdrawal be as easy as the original choice.",
        ],
      },
    ],
  },
  {
    slug: "first-party-vs-third-party-cookies",
    title: "First-party and third-party cookies",
    excerpt:
      "First-party cookies are set by the site you are on. Third-party cookies are set by someone else’s domain. Purpose matters more than the label.",
    category: "Cookies",
    region: "Global",
    publishedAt: "2026-09-12",
    readMinutes: 5,
    cover: cover("first-party-vs-third-party-cookies"),
    imageAlt: "Geometric cover comparing first-party and third-party cookies",
    sections: [
      {
        paragraphs: [
          "A first-party cookie is stored by the site in the address bar. A third-party cookie is stored by another domain, often an analytics or advertising vendor loaded on that page.",
          "The party label does not tell you whether a cookie is strictly necessary. A first-party analytics cookie can still be optional. A third-party cookie that only keeps a login on an embedded service might be essential in a narrow case. Your purpose model has to say which.",
        ],
      },
      {
        heading: "How a scan helps",
        paragraphs: [
          "Consent Guru’s scanner lists cookies and script patterns so you can map them to purposes and vendors. Coverage is incomplete for cookies that appear only after login or only inside a tag container. Review unmapped findings before you treat a scan as a full inventory.",
        ],
      },
      {
        heading: "Enforcement",
        paragraphs: [
          "Mapping a finding does not block it until the published policy and the SDK say so. Classify first, publish second, then confirm the optional scripts wait.",
        ],
      },
    ],
  },
  {
    slug: "how-cookie-scanning-works",
    title: "How cookie scanning works",
    excerpt:
      "A cookie scan lists cookies and scripts it can see. Classification and enforcement still require a published policy.",
    category: "Cookies",
    region: "Global",
    publishedAt: "2026-09-10",
    readMinutes: 5,
    cover: cover("how-cookie-scanning-works"),
    imageAlt: "Geometric cover for an article on cookie scanning",
    sections: [
      {
        paragraphs: [
          "Cookie scanning, sometimes called cookie discovery, visits or observes a site and reports cookies, scripts, and known third-party tracker patterns. It is a review aid, not a legal classification.",
          "Consent Guru lets you attach findings to purposes and vendors. The banner does not change just because a scan finished. You publish a policy when the mapping is ready.",
        ],
      },
      {
        heading: "What scans miss",
        paragraphs: [
          "Cookies set after authentication, inside iframes, or by tags that fire only in a specific region may not appear. Schedule reviews when the site changes, and treat “unmapped” as a queue rather than a clean bill of health.",
        ],
      },
      {
        heading: "From finding to block",
        paragraphs: [
          "Once a script URL is mapped to an optional purpose, the SDK can pause that loader when consent is withheld. Pausing a loader does not reconfigure tags that were already injected another way.",
        ],
      },
    ],
  },
  {
    slug: "what-is-a-dsar",
    title: "What is a DSAR?",
    excerpt:
      "A data subject access request asks what personal data an organization holds. It is related to consent, and it is not the same workflow.",
    category: "Rights",
    region: "Global",
    publishedAt: "2026-09-08",
    readMinutes: 6,
    cover: cover("what-is-a-dsar"),
    imageAlt: "Geometric cover for an article explaining DSAR requests",
    sections: [
      {
        paragraphs: [
          "A data subject access request, or DSAR, is a person’s request to know whether an organization holds personal data about them and, where the law provides it, to receive a copy or related details. Similar workflows cover correction and erasure.",
          "India’s DPDP Act uses Data Principal language for comparable rights, including grievance. The operational need is the same: intake, verification, a status, and a record of what you did.",
        ],
      },
      {
        heading: "Not a cookie toggle",
        paragraphs: [
          "Withdrawing analytics consent stops a mapped tag. It does not answer an access request, and it does not delete data a vendor already received. Consent Guru keeps rights requests in a separate workflow from the banner.",
        ],
      },
      {
        heading: "How the product helps",
        paragraphs: [
          "The public Privacy Centre accepts requests and lets the person track a reference. The workspace records verification and status changes. Deadlines and exemptions still come from the law that applies, which this article does not decide.",
        ],
      },
    ],
  },
];
