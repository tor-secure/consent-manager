export const REGULATION_KEYS = [
  "dpdp",
  "gdpr",
  "uk_gdpr",
  "ccpa",
  "lgpd",
  "pipeda",
  "ucpa",
  "vcdpa",
  "cpa",
] as const;

export type RegulationKey = (typeof REGULATION_KEYS)[number];

export type RegulationRule = {
  consentRequired: boolean;
  noticeRequired: boolean;
  optOutRequired: boolean;
  preferenceCenterRequired: boolean;
  withdrawalSupported: boolean;
  purposeCategories: string[];
  signalRequirements: {
    googleConsentMode: boolean;
    iabTcf: boolean;
    iabGpp: boolean;
  };
};

export type JurisdictionScope = {
  countries: string[];
  regions: string[];
};

export type RegulationVersion = {
  version: string;
  effectiveFrom: string;
  effectiveTo?: string;
  precedence: number;
  sourceUrls: readonly string[];
  lastReviewedAt: string;
  reviewStatus: "reviewed" | "review_due" | "draft";
  jurisdictionScope: JurisdictionScope;
  rules: RegulationRule;
};

export type RegulationProfile = {
  key: RegulationKey;
  label: string;
  description: string;
  versions: RegulationVersion[];
};

const EEA = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU",
  "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES",
  "SE", "IS", "LI", "NO",
];

function optInNotice(categories: string[], signals: RegulationRule["signalRequirements"]): RegulationRule {
  return {
    consentRequired: true,
    noticeRequired: true,
    optOutRequired: false,
    preferenceCenterRequired: true,
    withdrawalSupported: true,
    purposeCategories: categories,
    signalRequirements: signals,
  };
}

function optOutNotice(categories: string[], signals: RegulationRule["signalRequirements"]): RegulationRule {
  return {
    consentRequired: false,
    noticeRequired: true,
    optOutRequired: true,
    preferenceCenterRequired: true,
    withdrawalSupported: true,
    purposeCategories: categories,
    signalRequirements: signals,
  };
}

export const REGULATION_CATALOG: RegulationProfile[] = [
  {
    key: "dpdp",
    label: "DPDP",
    description: "Operational profile aligned to India DPDP notice/consent workflows in this product. Not a legal determination.",
    versions: [
      {
        version: "1.0",
        effectiveFrom: "2023-08-11",
        jurisdictionScope: { countries: ["IN"], regions: [] },
        precedence: 80,
        sourceUrls: ["https://www.meity.gov.in/data-protection-framework"],
        lastReviewedAt: "2026-08-01",
        reviewStatus: "reviewed",
        rules: optInNotice(["necessary", "analytics", "advertising", "functional"], {
          googleConsentMode: false,
          iabTcf: false,
          iabGpp: false,
        }),
      },
    ],
  },
  {
    key: "gdpr",
    label: "GDPR / ePrivacy",
    description: "Operational opt-in profile for EEA-oriented banner/enforcement. Combines GDPR and ePrivacy-style consent UX in this product only.",
    versions: [
      {
        version: "1.0",
        effectiveFrom: "2018-05-25",
        jurisdictionScope: { countries: [...EEA], regions: ["EU", "EEA"] },
        precedence: 90,
        sourceUrls: [
          "https://eur-lex.europa.eu/eli/reg/2016/679/oj",
          "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32002L0058",
        ],
        lastReviewedAt: "2026-08-01",
        reviewStatus: "reviewed",
        rules: optInNotice(["necessary", "analytics", "advertising", "functional", "personalization"], {
          googleConsentMode: true,
          iabTcf: true,
          iabGpp: true,
        }),
      },
    ],
  },
  {
    key: "uk_gdpr",
    label: "UK GDPR / PECR",
    description: "Operational opt-in profile for United Kingdom GDPR and PECR-oriented banner/enforcement.",
    versions: [{
      version: "1.0",
      effectiveFrom: "2021-01-01",
      jurisdictionScope: { countries: ["GB"], regions: ["UK"] },
      precedence: 95,
      sourceUrls: [
        "https://www.legislation.gov.uk/eur/2016/679/contents",
        "https://www.legislation.gov.uk/uksi/2003/2426/contents",
      ],
      lastReviewedAt: "2026-08-01",
      reviewStatus: "reviewed",
      rules: optInNotice(["necessary", "analytics", "advertising", "functional", "personalization"], {
        googleConsentMode: true, iabTcf: true, iabGpp: true,
      }),
    }],
  },
  {
    key: "ccpa",
    label: "CCPA / CPRA",
    description: "Operational opt-out profile for California-oriented notice and preference workflows.",
    versions: [
      {
        version: "1.0",
        effectiveFrom: "2020-01-01",
        jurisdictionScope: { countries: ["US"], regions: ["CA"] },
        precedence: 100,
        sourceUrls: ["https://oag.ca.gov/privacy/ccpa"],
        lastReviewedAt: "2026-08-01",
        reviewStatus: "reviewed",
        rules: optOutNotice(["analytics", "advertising", "sale_share"], {
          googleConsentMode: true,
          iabTcf: false,
          iabGpp: true,
        }),
      },
      {
        version: "2.0",
        effectiveFrom: "2023-01-01",
        jurisdictionScope: { countries: ["US"], regions: ["CA"] },
        precedence: 110,
        sourceUrls: ["https://cppa.ca.gov/regulations/"],
        lastReviewedAt: "2026-08-01",
        reviewStatus: "reviewed",
        rules: optOutNotice(["analytics", "advertising", "sale_share", "sensitive"], {
          googleConsentMode: true,
          iabTcf: false,
          iabGpp: true,
        }),
      },
    ],
  },
  {
    key: "lgpd",
    label: "LGPD",
    description: "Operational consent/notice profile for Brazil-oriented configuration.",
    versions: [
      {
        version: "1.0",
        effectiveFrom: "2020-09-18",
        jurisdictionScope: { countries: ["BR"], regions: [] },
        precedence: 80,
        sourceUrls: ["https://www.gov.br/anpd/pt-br/assuntos/legislacao/lgpd"],
        lastReviewedAt: "2026-08-01",
        reviewStatus: "reviewed",
        rules: optInNotice(["necessary", "analytics", "advertising"], {
          googleConsentMode: false,
          iabTcf: false,
          iabGpp: false,
        }),
      },
    ],
  },
  {
    key: "pipeda",
    label: "PIPEDA",
    description: "Operational notice/consent profile for Canada-oriented configuration.",
    versions: [
      {
        version: "1.0",
        effectiveFrom: "2001-01-01",
        jurisdictionScope: { countries: ["CA"], regions: [] },
        precedence: 70,
        sourceUrls: ["https://laws-lois.justice.gc.ca/eng/acts/p-8.6/"],
        lastReviewedAt: "2026-08-01",
        reviewStatus: "reviewed",
        rules: optInNotice(["necessary", "analytics", "advertising"], {
          googleConsentMode: false,
          iabTcf: false,
          iabGpp: false,
        }),
      },
    ],
  },
  {
    key: "ucpa",
    label: "UCPA",
    description: "Operational opt-out profile for Utah-oriented configuration.",
    versions: [
      {
        version: "1.0",
        effectiveFrom: "2023-12-31",
        jurisdictionScope: { countries: ["US"], regions: ["UT"] },
        precedence: 100,
        sourceUrls: ["https://le.utah.gov/xcode/Title13/Chapter61/13-61.html"],
        lastReviewedAt: "2026-08-01",
        reviewStatus: "reviewed",
        rules: optOutNotice(["analytics", "advertising"], {
          googleConsentMode: true,
          iabTcf: false,
          iabGpp: true,
        }),
      },
    ],
  },
  {
    key: "vcdpa",
    label: "VCDPA",
    description: "Operational opt-out profile for Virginia-oriented configuration.",
    versions: [
      {
        version: "1.0",
        effectiveFrom: "2023-01-01",
        jurisdictionScope: { countries: ["US"], regions: ["VA"] },
        precedence: 100,
        sourceUrls: ["https://law.lis.virginia.gov/vacode/title59.1/chapter53/"],
        lastReviewedAt: "2026-08-01",
        reviewStatus: "reviewed",
        rules: optOutNotice(["analytics", "advertising"], {
          googleConsentMode: true,
          iabTcf: false,
          iabGpp: true,
        }),
      },
    ],
  },
  {
    key: "cpa",
    label: "CPA",
    description: "Operational opt-out profile for Colorado-oriented configuration.",
    versions: [
      {
        version: "1.0",
        effectiveFrom: "2023-07-01",
        jurisdictionScope: { countries: ["US"], regions: ["CO"] },
        precedence: 100,
        sourceUrls: ["https://coag.gov/resources/colorado-privacy-act/"],
        lastReviewedAt: "2026-08-01",
        reviewStatus: "reviewed",
        rules: optOutNotice(["analytics", "advertising"], {
          googleConsentMode: true,
          iabTcf: false,
          iabGpp: true,
        }),
      },
    ],
  },
];

export function isRegulationKey(value: string): value is RegulationKey {
  return (REGULATION_KEYS as readonly string[]).includes(value);
}
