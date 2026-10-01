import type { FaqItem } from "@/content/faqs";

export const DPO_PATH = "/dpo-as-service";

export const DPO_PAGE_TITLE = "DPO-as-a-Service | Consent Guru";
export const DPO_PAGE_DESCRIPTION =
  "Get expert privacy and DPO support backed by Consent Guru's privacy management technology.";

export const DPO_H1 = "Your Privacy Program. Backed by Experts.";
export const DPO_KICKER = "DPO-as-a-Service";

export const regulations = [
  { name: "GDPR", note: "EU / EEA" },
  { name: "DPDP Act", note: "India" },
  { name: "CCPA / CPRA", note: "California" },
  { name: "LGPD", note: "Brazil" },
  { name: "Other frameworks", note: "Where they apply to you" },
];

export const problems = [
  { title: "Rules keep changing", body: "Privacy requirements evolve faster than most teams can staff for." },
  { title: "Work is scattered", body: "Legal, IT, marketing, and security often share duties without a single owner." },
  { title: "DPIAs are hard to run", body: "Impact assessments need a method, not a last-minute spreadsheet." },
  { title: "Rights requests need a process", body: "Access, correction, and erasure need intake, verification, and evidence." },
  { title: "Vendors need review", body: "Processors and tools should be assessed before personal data is shared." },
  { title: "Incident readiness is thin", body: "Many organisations discover gaps only after something goes wrong." },
  { title: "Documents go stale", body: "Notices, records of processing, and policies drift from real practice." },
  { title: "No dedicated privacy lead", body: "Building a full-time privacy function is costly and slow to hire." },
];

export const meaningPoints = [
  { title: "Ongoing support", body: "Advice and reviews on a cadence, not a one-off workshop." },
  { title: "Named expert where it fits", body: "A privacy professional or DPO aligned to your circumstances, where that model is appropriate." },
  { title: "Governance", body: "Roles, decisions, and documentation that operators can actually follow." },
  { title: "Advisory", body: "Practical guidance on notices, vendors, assessments, and requests." },
  { title: "Monitoring", body: "A view of consent, rights, and programme status in Consent Guru." },
  { title: "Reporting", body: "Evidence and summaries you can share with leadership and auditors." },
];

export const services = [
  {
    title: "Privacy Governance",
    body: "Help define ownership, decision rights, and a working privacy operating rhythm.",
  },
  {
    title: "DPIA Support",
    body: "Structure data protection impact assessments and keep a defensible record of the work.",
  },
  {
    title: "RoPA & Data Mapping",
    body: "Build and maintain records of processing activities against how data actually moves.",
  },
  {
    title: "Data Subject / Data Principal Rights",
    body: "Intake, verify, and respond to access, correction, erasure, and related requests.",
  },
  {
    title: "Vendor Privacy Assessments",
    body: "Review processors and tools before personal data is entrusted to them.",
  },
  {
    title: "Privacy Policy & Notice Review",
    body: "Align public notices with processing, cookies, and consent practices.",
  },
  {
    title: "Breach & Incident Support",
    body: "Prepare playbooks and support decision-making if an incident occurs.",
  },
  {
    title: "Regulatory Guidance",
    body: "Explain what GDPR, DPDP, CCPA/CPRA, and other applicable rules mean for your operations.",
  },
  {
    title: "Privacy Training",
    body: "Practical sessions so teams know what they must do day to day.",
  },
  {
    title: "Compliance Reporting",
    body: "Summaries and evidence from Consent Guru and programme work for leadership.",
  },
];

export const steps = [
  {
    n: "01",
    title: "Tell Us About Your Business",
    body: "Share your organisation, industry, regulatory environment, and privacy requirements.",
  },
  {
    n: "02",
    title: "Assess Your Needs",
    body: "We understand your privacy maturity, risks, and areas requiring support.",
  },
  {
    n: "03",
    title: "Get the Right Privacy Support",
    body: "We recommend an appropriate DPO or privacy support model for your organisation.",
  },
  {
    n: "04",
    title: "Stay Privacy-Ready",
    body: "Receive ongoing guidance, governance, monitoring, and reporting.",
  },
];

export const tiers = [
  {
    id: "essential",
    name: "Essential",
    badge: "Getting started",
    detail: "For organisations starting their privacy program.",
    points: [
      "Privacy programme scoping",
      "Notice and consent review",
      "Rights-request process guidance",
      "Quarterly check-ins",
      "Consent Guru workspace setup advice",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    badge: "Ongoing governance",
    featured: true,
    detail: "For organisations needing ongoing privacy governance.",
    points: [
      "Named privacy professional / DPO where applicable",
      "DPIA and RoPA support",
      "Vendor assessment cadence",
      "Incident playbook review",
      "Regular reporting to leadership",
      "Consent Guru operating reviews",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    badge: "Complex operations",
    detail: "For complex organisations with broader regulatory and operational requirements.",
    points: [
      "Multi-entity and multi-jurisdiction coordination",
      "Deeper assessment and training coverage",
      "Stakeholder workshops",
      "Custom reporting",
      "Priority response windows",
      "Technology plus expert operating model",
    ],
  },
] as const;

export const platformCapabilities = [
  { title: "Consent Management", href: "/consent-management" },
  { title: "Privacy Rights", href: "/dsar" },
  { title: "DPIA", href: null },
  { title: "RoPA", href: null },
  { title: "Vendor Management", href: "/integrations" },
  { title: "Evidence", href: "/security" },
  { title: "Compliance Monitoring", href: "/privacy-compliance" },
  { title: "Analytics", href: "/consent-analytics" },
];

export const dpoFaqs: FaqItem[] = [
  {
    question: "What is DPO-as-a-Service?",
    answer:
      "It is a way to access experienced privacy professionals and DPO-style support through Consent Guru, instead of building a full-time internal privacy function from scratch. The exact model depends on your organisation, processing, and applicable law.",
  },
  {
    question: "Who can benefit from DPO-as-a-Service?",
    answer:
      "Organisations that process personal data and need privacy leadership, governance, or operational help — including teams that already use or plan to use Consent Guru for consent, notices, and rights requests.",
  },
  {
    question: "Do I need a full-time DPO?",
    answer:
      "Not always. Whether a DPO or similar role is required depends on applicable regulations and your circumstances, such as the nature of processing and where you operate. We help you understand options. We do not claim that every company legally needs a DPO.",
  },
  {
    question: "What does a DPO typically help with?",
    answer:
      "Typical work includes privacy governance, advising on processing, supporting DPIAs, records of processing, data subject or data principal requests, vendor reviews, notices, incident readiness, and reporting. Scope is agreed after we understand your organisation.",
  },
  {
    question: "Can you support multiple privacy regulations?",
    answer:
      "We can work with programmes that span GDPR, India’s DPDP Act, CCPA/CPRA, LGPD, and other frameworks that apply to you. Coverage is aligned to your regulatory environment. A single expert does not automatically cover every jurisdiction.",
  },
  {
    question: "Can Consent Guru help with DPIAs and data rights requests?",
    answer:
      "Yes. Privacy experts can support DPIAs and rights workflows, and Consent Guru provides technology for consent records, preference management, and rights-request operations. Using the platform does not by itself make you compliant.",
  },
  {
    question: "How does the onboarding process work?",
    answer:
      "Tell us about your organisation and requirements. We assess maturity and risk, recommend a support model, then work to a cadence of guidance, reviews, monitoring, and reporting.",
  },
  {
    question: "How do I join the DPO network?",
    answer:
      "Use the “Join as a DPO” form. It is an application to be considered for the Consent Guru DPO network. This page is not a marketplace, matching engine, or bidding platform.",
  },
];
