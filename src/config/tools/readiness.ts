export const READINESS_VERSION = "2026.09.1";

type Severity = "critical" | "high" | "medium" | "low";

export type ReadinessAnswer = "yes" | "partial" | "no";

export type ReadinessQuestion = {
  id: string;
  pillar: string;
  pillarLabel: string;
  severity: Severity;
  prompt: string;
  recommendation: string;
};

export const READINESS_PILLARS = [
  { id: "consent", label: "Consent" },
  { id: "notices", label: "Notices" },
  { id: "rights", label: "Data Principal rights" },
  { id: "breach", label: "Breach management" },
  { id: "governance", label: "Governance" },
  { id: "transfers", label: "Transfers and processors" },
] as const;

const q = (
  id: string,
  pillar: string,
  pillarLabel: string,
  severity: Severity,
  prompt: string,
  recommendation: string,
): ReadinessQuestion => ({ id, pillar, pillarLabel, severity, prompt, recommendation });

export const READINESS_QUESTIONS: ReadinessQuestion[] = [
  q("c1", "consent", "Consent", "critical", "Where you rely on consent, people take a clear affirmative action.", "Ask for an explicit choice. Do not treat silence or a pre-ticked box as consent."),
  q("c2", "consent", "Consent", "critical", "Each consent is tied to a specified purpose.", "Split bundled purposes so each optional use can be accepted or refused on its own."),
  q("c3", "consent", "Consent", "critical", "Withdrawal is as easy to find and use as the original choice.", "Put withdrawal in the same preference center as the original accept action."),
  q("c4", "consent", "Consent", "high", "Consent records keep the choice, time, purposes, and notice version.", "Store an evidence record that can be exported without rewriting history."),
  q("n1", "notices", "Notices", "critical", "A notice is shown with the consent request, not only in a footer policy.", "Show an itemised notice at the moment of choice."),
  q("n2", "notices", "Notices", "high", "The notice uses language a visitor can understand.", "Rewrite purpose text in plain language and test it with a non-lawyer."),
  q("n3", "notices", "Notices", "high", "Purposes name the processing activity, not a catch-all such as “and related uses”.", "Replace broad purpose lines with the specific activity."),
  q("n4", "notices", "Notices", "medium", "Notice versions are kept, and the live version is identifiable.", "Publish notice versions and point each consent record at the version shown."),
  q("r1", "rights", "Data Principal rights", "critical", "Access requests can be received and answered.", "Open a tracked intake for access requests and name an owner."),
  q("r2", "rights", "Data Principal rights", "high", "Correction and completion requests can be actioned in the systems that hold the data.", "Map correction requests to the systems that store the relevant fields."),
  q("r3", "rights", "Data Principal rights", "critical", "Erasure requests are handled, including any legal reason you must keep data.", "Define erasure steps and the exceptions where the law requires retention."),
  q("r4", "rights", "Data Principal rights", "high", "Grievances have an owner, a record, and a response path.", "Publish a grievance contact and track each grievance to closure."),
  q("b1", "breach", "Breach management", "critical", "There is a written personal-data breach process.", "Write who assesses an incident and who is authorised to escalate it."),
  q("b2", "breach", "Breach management", "critical", "The process covers intimation to the Board in the prescribed manner.", "Add the Board intimation step and the prescribed content to the runbook."),
  q("b3", "breach", "Breach management", "high", "Affected Data Principals can be notified where the law requires it.", "Keep a way to reach affected people that does not depend on a single employee."),
  q("b4", "breach", "Breach management", "medium", "Incident records are retained for later review.", "Store the timeline, decision, and notices for each incident."),
  q("g1", "governance", "Governance", "high", "A processing inventory exists and has an owner.", "List purposes, systems, and owners, and review the list on a schedule."),
  q("g2", "governance", "Governance", "medium", "Privacy responsibilities are assigned, including who answers Data Principals.", "Name the contact published for processing questions."),
  q("g3", "governance", "Governance", "medium", "Higher-impact processing is assessed before it goes live.", "Add a short assessment step before new high-impact processing starts."),
  q("g4", "governance", "Governance", "low", "Safeguards and notices are reviewed after material product changes.", "Tie product launches to a privacy review, not only a legal review after launch."),
  q("t1", "transfers", "Transfers and processors", "high", "Processors and vendors that handle personal data are inventoried.", "Connect each vendor to the purposes it is allowed to serve."),
  q("t2", "transfers", "Transfers and processors", "high", "Contracts cover how processors handle personal data.", "Do not send personal data to a vendor that has no contract."),
  q("t3", "transfers", "Transfers and processors", "medium", "Cross-border processing is known.", "Mark overseas vendors and the categories they receive."),
  q("t4", "transfers", "Transfers and processors", "medium", "Someone watches for government restrictions on transfers.", "Assign an owner to check notified country restrictions."),
];

export const READINESS_CHOICES = [
  { value: "yes", label: "Yes" },
  { value: "partial", label: "Partial" },
  { value: "no", label: "No" },
] as const;
