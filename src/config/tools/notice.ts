export const NOTICE_VERSION = "2026.09.1";

type Severity = "critical" | "high" | "medium" | "low";

export type NoticeCheck = {
  id: string;
  category: string;
  severity: Severity;
  weight: number;
  /** Check passes when at least one pattern matches. */
  passAny?: string[];
  /** Check fails when any pattern matches, even if a pass pattern also matched. */
  failAny?: string[];
  finding: string;
  explanation: string;
  recommendation: string;
  reference: string;
};

export const NOTICE_MIN_CHARS = 80;

export const NOTICE_CHECKS: NoticeCheck[] = [
  {
    id: "purpose-specific",
    category: "Purpose",
    severity: "high",
    weight: 12,
    passAny: ["purpose", "we use", "we process", "in order to"],
    failAny: ["as we see fit", "any purpose", "and other purposes", "related purposes", "etc\\.", "and more"],
    finding: "Purpose is too broad or missing",
    explanation: "The text does not show a specific processing purpose, or it keeps a catch-all purpose.",
    recommendation: "Name the processing activity. Remove wording that lets the purpose expand later without a new choice.",
    reference: "DPDP Act — consent and notice are tied to a specified purpose.",
  },
  {
    id: "data-categories",
    category: "Personal data",
    severity: "high",
    weight: 10,
    passAny: ["personal data", "information we collect", "we collect", "categories", "such as your"],
    finding: "Personal-data categories are not described",
    explanation: "A notice that accompanies a consent request should describe the personal data, not only the brand.",
    recommendation: "List the categories you actually collect for the purpose, in plain language.",
    reference: "DPDP Act — itemised notice of personal data and purpose.",
  },
  {
    id: "withdrawal",
    category: "Withdrawal",
    severity: "critical",
    weight: 14,
    passAny: ["withdraw", "change your choice", "preference cent", "manage cookies", "opt out"],
    finding: "Withdrawal path is not described",
    explanation: "The text does not explain how a person can withdraw or change a choice.",
    recommendation: "State where withdrawal lives, and make that path as easy to see as acceptance.",
    reference: "DPDP Act — withdrawal of consent, and notice of how to withdraw.",
  },
  {
    id: "rights",
    category: "Rights",
    severity: "high",
    weight: 10,
    passAny: ["access", "correction", "eras", "delet", "nominat"],
    finding: "Data Principal rights are not mentioned",
    explanation: "The notice does not point to access, correction, erasure, or nomination.",
    recommendation: "Say which rights a person can exercise and where to send the request.",
    reference: "DPDP Act — rights to access information, correction, erasure, and nomination.",
  },
  {
    id: "grievance",
    category: "Grievance",
    severity: "high",
    weight: 10,
    passAny: ["grievance", "complaint", "data protection board"],
    finding: "Grievance and Board complaint path is missing",
    explanation: "The text does not explain how to raise a grievance or complain to the Board.",
    recommendation: "Add the grievance contact and a short note on complaining to the Data Protection Board.",
    reference: "DPDP Act — grievance redressal and notice of how to complain to the Board.",
  },
  {
    id: "contact",
    category: "Contact",
    severity: "medium",
    weight: 8,
    passAny: ["privacy@", "dpo@", "grievance@", "contact us", "email"],
    finding: "No contact for questions about processing",
    explanation: "A Data Fiduciary publishes a business contact who can answer questions about processing.",
    recommendation: "Add a monitored email or form for privacy questions.",
    reference: "DPDP Act — published contact for questions about processing.",
  },
  {
    id: "identity",
    category: "Identity",
    severity: "medium",
    weight: 8,
    passAny: ["we are", "data fiduciary", "operated by", "controller"],
    finding: "The organisation is not identified",
    explanation: "The notice does not say who is responsible for the processing.",
    recommendation: "Name the organisation that decides the purposes.",
    reference: "DPDP Act — the Data Fiduciary is the person who decides purpose and means.",
  },
  {
    id: "version",
    category: "Versioning",
    severity: "low",
    weight: 5,
    passAny: ["version", "last updated", "effective"],
    finding: "Notice version is not shown",
    explanation: "Without a version or date, later records cannot show which text the person saw.",
    recommendation: "Put a version or effective date on the notice and keep the previous text.",
    reference: "Recommended practice for evidence. Confirm any prescribed form in the Rules.",
  },
  {
    id: "implied",
    category: "Consent clarity",
    severity: "critical",
    weight: 14,
    failAny: ["by continuing", "pre-tick", "already ticked", "deemed to consent", "implied consent", "using this site means you agree"],
    passAny: ["you can reject", "decline", "choose", "accept or"],
    finding: "Consent may be implied or pre-selected",
    explanation: "The text suggests that browsing, or a default tick, is enough agreement.",
    recommendation: "Ask for a clear action. Offer a way to refuse optional purposes.",
    reference: "DPDP Act — consent requires a clear affirmative action.",
  },
];
