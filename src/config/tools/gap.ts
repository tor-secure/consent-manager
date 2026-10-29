export const GAP_VERSION = "2026.10.1";
export const GAP_TOOL_ID = "dpdp-gap-assessment" as const;

/** G.S.R. 843(E) and G.S.R. 846(E), both 13 November 2025. */
export const DPDP_PUBLISHED = "2025-11-13";
export const DPDP_ONE_YEAR = "2026-11-13";
export const DPDP_EIGHTEEN_MONTHS = "2027-05-13";

export const GAP_LEGAL_NOTE =
  "Mapped to the Digital Personal Data Protection Act, 2023 (22 of 2023) and the Digital Personal Data Protection Rules, 2025 (G.S.R. 846(E)), read with the commencement notification G.S.R. 843(E). Scores are internal readiness indicators. This tool is not a government certification, a Board determination, or legal advice.";

export type GapPhase = "in_force" | "one_year" | "eighteen_months";
export type GapKind = "mandatory" | "conditional" | "recommended";
export type GapSeverity = "critical" | "high" | "medium" | "low";
export type GapAnswer = "implemented" | "partial" | "missing" | "na" | "unassessed";
export type GapApplies = "always" | "children" | "processors" | "transfers" | "sdf" | "consent_manager";
export type RemediationStatus = "open" | "in_progress" | "awaiting_evidence" | "under_review" | "resolved";
export type YesNo = "yes" | "no" | "unsure";

export type GapArea = { id: string; label: string; summary: string };

export type GapControl = {
  id: string;
  area: string;
  title: string;
  description: string;
  act: string;
  rule: string | null;
  phase: GapPhase;
  kind: GapKind;
  applies: GapApplies;
  severity: GapSeverity;
  action: string;
  evidence: string;
};

export type GapProfile = {
  companyName: string;
  industry: string;
  organisationSize: string;
  employeeRange: string;
  location: string;
  dataTypes: string[];
  purposes: string;
  childrenData: YesNo;
  processors: YesNo;
  crossBorder: YesNo;
  role: "fiduciary" | "processor" | "both";
  sdf: "designated" | "not_designated" | "unsure";
  governance: string;
};

export type GapResponse = {
  status: GapAnswer;
  remarks: string;
  evidence: string;
};

export type GapRemediation = {
  owner: string;
  due: string;
  status: RemediationStatus;
  evidence: string;
  verified: boolean;
};

export const GAP_ANSWERS: Array<{ value: GapAnswer; label: string }> = [
  { value: "implemented", label: "Fully implemented" },
  { value: "partial", label: "Partially implemented" },
  { value: "missing", label: "Not implemented" },
  { value: "na", label: "Not applicable" },
  { value: "unassessed", label: "Not yet assessed" },
];

export const REMEDIATION_STATUSES: Array<{ value: RemediationStatus; label: string }> = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "awaiting_evidence", label: "Awaiting evidence" },
  { value: "under_review", label: "Under review" },
  { value: "resolved", label: "Resolved" },
];

export const GAP_AREAS: GapArea[] = [
  { id: "applicability", label: "Applicability and governance", summary: "Whether the Act applies and who is accountable." },
  { id: "inventory", label: "Personal data inventory", summary: "A working map of data, purposes, and systems." },
  { id: "lawful", label: "Lawful processing", summary: "Consent or another ground the Act recognises." },
  { id: "notice", label: "Notice and transparency", summary: "An itemised notice a person can use on its own." },
  { id: "consent", label: "Consent management", summary: "Specific consent and a comparable way to withdraw it." },
  { id: "rights", label: "Data Principal rights", summary: "Access, correction, erasure, grievance, and nomination." },
  { id: "children", label: "Children's personal data", summary: "Verifiable consent and the limits on tracking children." },
  { id: "security", label: "Security safeguards", summary: "Reasonable safeguards against a personal data breach." },
  { id: "breach", label: "Breach management", summary: "Intimation to affected people and to the Board." },
  { id: "retention", label: "Retention and erasure", summary: "Erasure when the specified purpose is no longer served." },
  { id: "processors", label: "Processors and third parties", summary: "A valid contract before a processor handles personal data." },
  { id: "transfers", label: "Cross-border processing", summary: "Transfers outside India, subject to notified restrictions." },
  { id: "governance", label: "Governance and accountability", summary: "A contact for processing questions and named owners." },
  { id: "sdf", label: "Significant Data Fiduciary", summary: "Extra duties that apply only if the Central Government notifies you." },
  { id: "monitoring", label: "Monitoring and improvement", summary: "A repeatable review, not a one-time questionnaire." },
];

const control = (
  id: string,
  area: string,
  title: string,
  description: string,
  act: string,
  rule: string | null,
  phase: GapPhase,
  kind: GapKind,
  applies: GapApplies,
  severity: GapSeverity,
  action: string,
  evidence: string,
): GapControl => ({ id, area, title, description, act, rule, phase, kind, applies, severity, action, evidence });

export const GAP_CONTROLS: GapControl[] = [
  control(
    "app-scope",
    "applicability",
    "Digital personal data in scope is identified",
    "The organisation can say which processing is of digital personal data, including data collected offline and then digitised.",
    "Section 3",
    null,
    "eighteen_months",
    "mandatory",
    "always",
    "high",
    "Write down the processing that falls inside section 3, and the processing you believe is outside it, with the reason.",
    "A short scope note naming in-scope activities and any claimed exclusion.",
  ),
  control(
    "app-role",
    "applicability",
    "Data Fiduciary and Data Processor roles are assigned",
    "For each activity, the organisation knows whether it decides the purpose and means, or processes personal data on another person's behalf.",
    "Section 2(i) and section 2(k)",
    null,
    "eighteen_months",
    "mandatory",
    "always",
    "high",
    "Mark each major processing activity as Data Fiduciary, Data Processor, or both, and name the other party where you are the processor.",
    "A role column on the processing inventory.",
  ),
  control(
    "inv-categories",
    "inventory",
    "Personal data categories are listed",
    "A maintained list of personal data categories, the systems that hold them, and the purpose each category serves. The Act does not prescribe a register format. This is a practice that makes the later duties workable.",
    "Section 4 and section 8",
    null,
    "eighteen_months",
    "recommended",
    "always",
    "medium",
    "Keep one inventory with category, system, purpose, and owner. Review it when a product or vendor changes.",
    "The current inventory, or the place it is stored.",
  ),
  control(
    "inv-owner",
    "inventory",
    "The inventory has an owner and a review point",
    "Someone is responsible for keeping the list current.",
    "Section 8",
    "Rule 9",
    "eighteen_months",
    "recommended",
    "always",
    "low",
    "Name an owner and a review date. Tie the review to launches that collect new data.",
    "Named owner and the last review date.",
  ),
  control(
    "law-ground",
    "lawful",
    "Each purpose has a ground under the Act",
    "Processing is tied to consent or to a certain legitimate use the Act lists. There is no general legitimate-interest ground.",
    "Section 4, section 6, and section 7",
    null,
    "eighteen_months",
    "mandatory",
    "always",
    "critical",
    "For each purpose, record consent or the specific section 7 use. Stop processing that has neither.",
    "A purpose-to-ground table.",
  ),
  control(
    "law-purpose-limit",
    "lawful",
    "Processing stays within the specified purpose",
    "Personal data collected for one purpose is not reused for a new purpose without a fresh ground.",
    "Section 4(1) and section 6(1)",
    null,
    "eighteen_months",
    "mandatory",
    "always",
    "critical",
    "Block secondary use in the product unless a new consent or a listed legitimate use applies.",
    "A rule or ticket path for new uses of existing data.",
  ),
  control(
    "not-itemised",
    "notice",
    "The notice is itemised and can stand alone",
    "The notice gives an itemised description of the personal data and the specified purpose, in plain language, and can be understood without another document.",
    "Section 5",
    "Rule 3",
    "eighteen_months",
    "mandatory",
    "always",
    "critical",
    "Rewrite the notice so the data items, purpose, and goods or services are listed on their own. Do not rely on a footer policy alone.",
    "The live notice and the version a person was shown.",
  ),
  control(
    "not-links",
    "notice",
    "The notice tells people how to withdraw, exercise rights, and complain",
    "The notice gives a link or other means to withdraw consent, exercise rights, and make a complaint to the Board.",
    "Section 5 and section 6(4)",
    "Rule 3(c)",
    "eighteen_months",
    "mandatory",
    "always",
    "high",
    "Add the withdrawal path, the rights path, and the Board complaint path to the notice itself.",
    "A screenshot or copy of the notice showing those links.",
  ),
  control(
    "con-specific",
    "consent",
    "Consent is free, specific, informed, and affirmative",
    "Where you rely on consent, the person takes a clear action for a specified purpose. Silence, a pre-ticked box, or a bundled accept-all is not treated as consent.",
    "Section 6",
    null,
    "eighteen_months",
    "mandatory",
    "always",
    "critical",
    "Ask for an affirmative choice per purpose that is not a certain legitimate use. Remove pre-ticked optional purposes.",
    "The consent screen and a sample record of a choice.",
  ),
  control(
    "con-withdraw",
    "consent",
    "Withdrawal is comparable in ease to giving consent",
    "A person can withdraw consent as easily as they gave it, and processing based on that consent stops within a reasonable time unless the Act allows it to continue.",
    "Section 6(4) and section 6(6)",
    "Rule 3(c)(i)",
    "eighteen_months",
    "mandatory",
    "always",
    "critical",
    "Put withdrawal in the same preference surface as the original choice, and connect it to downstream systems.",
    "A recorded withdrawal and the time processing stopped.",
  ),
  control(
    "con-manager",
    "consent",
    "Consent Manager use, if any, follows the registration rules",
    "This applies only if you give, manage, or rely on consent through a Consent Manager. Registration and the platform duties sit in Rule 4.",
    "Section 6(9)",
    "Rule 4",
    "one_year",
    "conditional",
    "consent_manager",
    "medium",
    "If you do not use a Consent Manager, mark this not applicable. If you do, confirm the manager is registered and that consent and withdrawal records are kept.",
    "The Consent Manager's registration status, or a note that you do not use one.",
  ),
  control(
    "rig-access",
    "rights",
    "Access and summary requests can be answered",
    "A Data Principal can ask for a summary of personal data being processed and the processing activities.",
    "Section 11",
    "Rule 14",
    "eighteen_months",
    "mandatory",
    "always",
    "critical",
    "Publish the means to make a request and name who retrieves the summary from the systems that hold the data.",
    "The request form and one completed access file, with personal data removed from this note.",
  ),
  control(
    "rig-correction",
    "rights",
    "Correction, completion, and erasure requests are actioned",
    "Correction, completion, updating, and erasure requests reach the systems that store the data, including an erasure request that follows withdrawal.",
    "Section 12",
    "Rule 14",
    "eighteen_months",
    "mandatory",
    "always",
    "critical",
    "Map each right to the system that must change, and record the legal reason if erasure is refused.",
    "A request log with status, not the personal data itself.",
  ),
  control(
    "rig-grievance",
    "rights",
    "Grievances have a path before a complaint to the Board",
    "A readily available means of grievance redressal is in place. Nomination of another person to exercise rights is also provided for.",
    "Section 13 and section 14",
    "Rule 14",
    "eighteen_months",
    "mandatory",
    "always",
    "high",
    "Publish a grievance contact and a way for a Data Principal to nominate another individual.",
    "The published contact and the grievance record format.",
  ),
  control(
    "chi-consent",
    "children",
    "Verifiable parental consent is taken before processing a child's data",
    "Before processing a child's personal data, the Data Fiduciary obtains verifiable consent of the parent, except where the Rules exempt that processing.",
    "Section 9(1)",
    "Rule 10 and Rule 12",
    "eighteen_months",
    "conditional",
    "children",
    "critical",
    "If you process children's data, adopt a verifiable-consent check and record the exemption only where Rule 12 actually applies.",
    "The consent method, or the Rule 12 exemption you rely on.",
  ),
  control(
    "chi-tracking",
    "children",
    "Tracking, monitoring, and targeted advertising at children are restricted",
    "The organisation does not undertake tracking, behavioural monitoring, or targeted advertising directed at children, except where the Rules permit a listed activity.",
    "Section 9(3)",
    "Rule 12",
    "eighteen_months",
    "conditional",
    "children",
    "critical",
    "Turn off child-directed tracking and targeted advertising unless a listed exemption applies and is documented.",
    "Product settings for child accounts, or the exemption relied on.",
  ),
  control(
    "sec-safeguards",
    "security",
    "Reasonable security safeguards are in place",
    "Safeguards protect personal data in the Data Fiduciary's possession or under its control, including processing by a Data Processor. Rule 6 lists measures such as encryption or similar techniques, access control, logs, and continuity.",
    "Section 8(5)",
    "Rule 6",
    "eighteen_months",
    "mandatory",
    "always",
    "critical",
    "Confirm encryption or an equivalent measure, access control, processing logs, and backups against the Rule 6 list. Extend the same expectation to processors.",
    "A safeguards description. Do not paste secrets or keys.",
  ),
  control(
    "sec-logs",
    "security",
    "Access and processing logs are retained",
    "Appropriate logs and monitoring are kept so unauthorised access can be detected, and logs are retained for the period the Rules require.",
    "Section 8(5)",
    "Rule 6",
    "eighteen_months",
    "mandatory",
    "always",
    "high",
    "Keep access logs for personal-data systems and set a retention period that meets Rule 6. Restrict who can read the logs.",
    "The log source and retention setting, not a dump of the logs.",
  ),
  control(
    "bre-principal",
    "breach",
    "Affected Data Principals are informed without delay",
    "On becoming aware of a personal data breach, the Data Fiduciary intimates each affected Data Principal, in plain language, with the nature, likely consequences, mitigation, and a contact.",
    "Section 8(6)",
    "Rule 7(1)",
    "eighteen_months",
    "mandatory",
    "always",
    "critical",
    "Write the intimation steps and the fields Rule 7(1) requires. Name who may send it.",
    "The breach runbook section for Data Principal intimation.",
  ),
  control(
    "bre-board",
    "breach",
    "The Board is intimated without delay and within 72 hours",
    "The Data Fiduciary intimates the Board without delay with a description of the breach, and provides the fuller particulars within 72 hours, or a longer period the Board allows.",
    "Section 8(6)",
    "Rule 7(2)",
    "eighteen_months",
    "mandatory",
    "always",
    "critical",
    "Add the Board intimation to the runbook, including the 72-hour particulars and who is authorised to send them.",
    "The runbook clock and the template for the Board intimation.",
  ),
  control(
    "ret-erasure",
    "retention",
    "Data is erased when the specified purpose is no longer served",
    "Personal data is erased when the Data Principal withdraws consent, or as soon as it is reasonable to assume the specified purpose is no longer served, unless retention is required by law.",
    "Section 8(7)",
    "Rule 8",
    "eighteen_months",
    "mandatory",
    "always",
    "high",
    "Set a retention period per purpose. Where Rule 8 deems a purpose no longer served, erase on that clock unless another law requires retention.",
    "Retention schedule by purpose, including any legal hold.",
  ),
  control(
    "ret-notice",
    "retention",
    "People are warned before erasure under Rule 8",
    "Where Rule 8 fixes a time after which the purpose is deemed no longer served, the Data Principal is informed at least 48 hours before erasure.",
    "Section 8(7)",
    "Rule 8(2)",
    "eighteen_months",
    "conditional",
    "always",
    "medium",
    "If a purpose falls under the Rule 8 deeming periods, send the 48-hour notice. If none of your purposes do, mark not applicable and say why.",
    "The notice template, or a note that Rule 8's deeming periods do not apply.",
  ),
  control(
    "pro-contract",
    "processors",
    "Processors are engaged under a valid contract",
    "A Data Processor is engaged only under a valid contract. The Data Fiduciary remains responsible for complying with the Act.",
    "Section 8(2)",
    null,
    "eighteen_months",
    "conditional",
    "processors",
    "high",
    "Do not send personal data to a processor without a contract that limits use to your instructions.",
    "A contract register. Do not upload the full agreement here.",
  ),
  control(
    "pro-oversight",
    "processors",
    "Processor safeguards and breach help are agreed",
    "The contract addresses security safeguards and help with breach intimation, erasure, and rights requests. This is how the Data Fiduciary meets its own duties when a processor holds the data.",
    "Section 8(2) and section 8(5)",
    "Rule 6",
    "eighteen_months",
    "conditional",
    "processors",
    "high",
    "Add safeguard, breach-assistance, and deletion clauses to processor contracts, and review existing vendors against them.",
    "A clause checklist, not the personal data the processor holds.",
  ),
  control(
    "tr-known",
    "transfers",
    "Cross-border processing is identified",
    "The organisation knows when personal data is processed outside India, including by a processor hosted abroad.",
    "Section 16",
    "Rule 15",
    "eighteen_months",
    "conditional",
    "transfers",
    "high",
    "Mark overseas systems and vendors, and the categories they receive.",
    "A transfer list with country and recipient role.",
  ),
  control(
    "tr-restriction",
    "transfers",
    "Someone watches for a notified restriction",
    "Transfer outside India is permitted unless the Central Government restricts it. The organisation has a way to stop a transfer if a restriction is notified.",
    "Section 16",
    "Rule 15",
    "eighteen_months",
    "conditional",
    "transfers",
    "medium",
    "Assign an owner to check notified restrictions before a new overseas transfer and when the Government updates them.",
    "The owner and the place the check is recorded.",
  ),
  control(
    "gov-contact",
    "governance",
    "A business contact answers questions about processing",
    "The Data Fiduciary publishes the business contact of a person who can answer Data Principal questions about the processing.",
    "Section 8",
    "Rule 9",
    "eighteen_months",
    "mandatory",
    "always",
    "high",
    "Publish a monitored business contact in the notice and on the site or app. Do not rely on a personal inbox that only one employee can open.",
    "The published contact and who monitors it.",
  ),
  control(
    "gov-accountability",
    "governance",
    "Privacy duties have named owners",
    "Notice, consent, rights, breach, and processor oversight each have an owner. This is a management practice that makes the statutory duties operable.",
    "Section 8",
    null,
    "eighteen_months",
    "recommended",
    "always",
    "medium",
    "Name an owner for each of those duties and a deputy for leave.",
    "The responsibility list.",
  ),
  control(
    "sdf-dpo",
    "sdf",
    "An SDF has a Data Protection Officer in India",
    "A Significant Data Fiduciary appoints a Data Protection Officer based in India, who is the point of contact for grievance redressal.",
    "Section 10(2)",
    "Rule 13",
    "eighteen_months",
    "conditional",
    "sdf",
    "critical",
    "If the Central Government has notified you as an SDF, appoint a DPO based in India and publish that contact. If you are not notified, mark not applicable. The tool cannot designate you.",
    "The notification, or a note that you have not been notified.",
  ),
  control(
    "sdf-audit",
    "sdf",
    "An SDF arranges an independent data audit and a DPIA",
    "A Significant Data Fiduciary undertakes periodic data protection impact assessments and an independent data audit.",
    "Section 10(2)",
    "Rule 13",
    "eighteen_months",
    "conditional",
    "sdf",
    "high",
    "If you are a notified SDF, schedule the DPIA and the independent audit. If you are not notified, mark not applicable.",
    "The audit or DPIA plan. Do not paste personal data from an assessment.",
  ),
  control(
    "mon-review",
    "monitoring",
    "Controls are reviewed after material change",
    "Notices, safeguards, and vendor lists are reviewed when a product, purpose, or processor changes. Ordinary Data Fiduciaries are not given a statutory audit cycle. This is a practice that keeps the other controls true.",
    "Section 8",
    null,
    "eighteen_months",
    "recommended",
    "always",
    "medium",
    "Add a privacy check to launch and vendor-change steps, and keep the date of the last check.",
    "The last review date and what changed.",
  ),
  control(
    "mon-records",
    "monitoring",
    "Decisions and exceptions are recorded",
    "Grounds, retention exceptions, and breach decisions are recorded so they can be shown later. The Central Government may also call for information under Rule 23 once that rule is in force.",
    "Section 8",
    "Rule 23",
    "eighteen_months",
    "recommended",
    "always",
    "low",
    "Keep a decision log for grounds, retention exceptions, and incidents. Do not store the underlying personal data in the log if a reference is enough.",
    "Where the decision log is kept.",
  ),
];

export const DATA_TYPE_OPTIONS = [
  "Identity and contact data",
  "Account and login data",
  "Financial data",
  "Employee data",
  "Children's data",
  "Health data",
  "Location data",
  "Device and usage data",
  "Communications content",
] as const;

export const INDUSTRY_OPTIONS = [
  "Technology or software",
  "Financial services",
  "Health",
  "Education",
  "Retail or e-commerce",
  "Manufacturing",
  "Public sector",
  "Professional services",
  "Other",
] as const;

export const SIZE_OPTIONS = ["Startup", "Small", "Medium", "Large", "Group"] as const;
export const EMPLOYEE_OPTIONS = ["1–20", "21–100", "101–500", "501–2,000", "More than 2,000"] as const;

export function phaseDate(phase: GapPhase): string {
  if (phase === "in_force") return DPDP_PUBLISHED;
  if (phase === "one_year") return DPDP_ONE_YEAR;
  return DPDP_EIGHTEEN_MONTHS;
}

export function phaseLabel(phase: GapPhase): string {
  if (phase === "in_force") return `In force from ${DPDP_PUBLISHED}`;
  if (phase === "one_year") return `Commences ${DPDP_ONE_YEAR}`;
  return `Commences ${DPDP_EIGHTEEN_MONTHS}`;
}

export function controlReference(controlItem: GapControl): string {
  const parts = [`DPDP Act, 2023, ${controlItem.act}`];
  if (controlItem.rule) parts.push(`DPDP Rules, 2025, ${controlItem.rule}`);
  parts.push(phaseLabel(controlItem.phase));
  return parts.join(". ");
}

export function emptyProfile(companyName = ""): GapProfile {
  return {
    companyName,
    industry: "",
    organisationSize: "",
    employeeRange: "",
    location: "",
    dataTypes: [],
    purposes: "",
    childrenData: "unsure",
    processors: "unsure",
    crossBorder: "unsure",
    role: "fiduciary",
    sdf: "unsure",
    governance: "",
  };
}

export function controlApplies(item: GapControl, profile: GapProfile): boolean {
  if (item.applies === "children") return profile.childrenData !== "no";
  if (item.applies === "processors") return profile.processors !== "no";
  if (item.applies === "transfers") return profile.crossBorder !== "no";
  if (item.applies === "sdf") return profile.sdf !== "not_designated";
  return true;
}
