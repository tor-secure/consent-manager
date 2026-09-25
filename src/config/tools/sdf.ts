export const SDF_VERSION = "2026.09.1";

export type SdfQuestion = {
  id: string;
  prompt: string;
  help: string;
  why: string;
  obligation: string;
};

export const SDF_CHOICES = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "unsure", label: "Not sure" },
] as const;

/** Screening questions. A “yes” is an indicator for review, not a designation. */
export const SDF_QUESTIONS: SdfQuestion[] = [
  {
    id: "scale",
    prompt: "Does the organisation process personal data at a scale that would affect a large number of Data Principals in India?",
    help: "Volume and sensitivity are factors the Central Government may consider. There is no numeric threshold in this tool.",
    why: "Scale is one of the factors used when the government considers a Significant Data Fiduciary designation.",
    obligation: "If designated, additional duties can include a Data Protection Officer based in India, an independent data auditor, and periodic assessments.",
  },
  {
    id: "sensitivity",
    prompt: "Is a material part of the processing higher-impact, such as financial, health, biometric, or children's data?",
    help: "Sensitivity is a risk signal. It does not by itself designate the organisation.",
    why: "The nature and sensitivity of data are relevant to whether enhanced duties may be considered.",
    obligation: "Expect tighter governance, assessment, and audit expectations if a designation is made.",
  },
  {
    id: "children",
    prompt: "Is the service aimed at children, or does it regularly process children's personal data?",
    help: "Children's data already has its own duties, whether or not the organisation is a Significant Data Fiduciary.",
    why: "Regular processing of children's data increases the rights impact of a control failure.",
    obligation: "Guardian consent, tracking limits, and stronger evidence matter even before any SDF designation.",
  },
  {
    id: "impact",
    prompt: "Can the processing affect people's access to services, credit, employment, education, or similar outcomes?",
    help: "Impact on individuals is a screening dimension, not a legal finding.",
    why: "Processing that changes a person's opportunities is more likely to draw enhanced scrutiny.",
    obligation: "Document purpose, accuracy, and a rights path before relying on that processing.",
  },
  {
    id: "systemic",
    prompt: "Would a breach or outage at this organisation affect many other organisations or a widely used digital service?",
    help: "This asks about systemic reach, such as a platform others depend on.",
    why: "Systemic impact is relevant to whether the government may look beyond an ordinary fiduciary.",
    obligation: "If designated, periodic audit and a named Data Protection Officer become operational duties.",
  },
  {
    id: "public",
    prompt: "Does the organisation operate a service the public or a large economic sector depends on?",
    help: "Include major platforms, essential digital services, and similar roles. Ordinary shops usually answer no.",
    why: "Public or economic dependence can weigh in a designation decision.",
    obligation: "Plan for auditability and a published contact for Data Principals.",
  },
  {
    id: "grievances",
    prompt: "Do you see a high or growing volume of privacy grievances or rights requests you struggle to close?",
    help: "Volume is an operational signal. It is not a statutory count.",
    why: "Unresolved grievances suggest the rights process may not match the scale of processing.",
    obligation: "A designation would not remove the duty to run grievance redressal. It would add governance on top.",
  },
  {
    id: "sector",
    prompt: "Are you in a sector where a designation, or similar enhanced privacy duties, is reasonably foreseeable?",
    help: "Answer from your own regulatory context. This tool does not maintain a sector list.",
    why: "Some sectors are more likely to be examined for volume, sensitivity, and risk to rights.",
    obligation: "Ask counsel whether any notified designation or sector direction already applies.",
  },
];

export const SDF_POTENTIAL_MIN = 3;
