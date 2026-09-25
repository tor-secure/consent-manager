export const TIMELINE_VERSION = "2026.09.1";

type Severity = "critical" | "high" | "medium" | "low";

export type TimelineInput = {
  id: string;
  step: string;
  prompt: string;
  help: string;
  options: Array<{ value: string; label: string }>;
};

export const TIMELINE_STEPS = ["Context", "Ambition"] as const;

export const TIMELINE_INPUTS: TimelineInput[] = [
  {
    id: "size",
    step: "Context",
    prompt: "Organisation size",
    help: "Used only to pace the roadmap. It does not change the legal duties.",
    options: [
      { value: "small", label: "Small team" },
      { value: "mid", label: "Several teams" },
      { value: "large", label: "Large or multi-brand" },
    ],
  },
  {
    id: "maturity",
    step: "Context",
    prompt: "Current DPDP programme maturity",
    help: "Early programmes get more discovery tasks.",
    options: [
      { value: "early", label: "Early — little is documented" },
      { value: "partial", label: "Partial — some notices and contracts exist" },
      { value: "established", label: "Established — inventory, notices, and owners exist" },
    ],
  },
  {
    id: "cmp",
    step: "Context",
    prompt: "Current consent-management maturity",
    help: "This refers to tooling, not to legal compliance.",
    options: [
      { value: "none", label: "No consent tool on the properties" },
      { value: "partial", label: "A banner exists, evidence is thin" },
      { value: "live", label: "A CMP is live with records and withdrawal" },
    ],
  },
  {
    id: "complexity",
    step: "Context",
    prompt: "Processing complexity",
    help: "Complex means many properties, vendors, or purposes.",
    options: [
      { value: "simple", label: "One property and few vendors" },
      { value: "mixed", label: "A few properties or vendors" },
      { value: "complex", label: "Many properties, vendors, or purposes" },
    ],
  },
  {
    id: "industry",
    step: "Ambition",
    prompt: "Primary industry",
    help: "Health, finance, and education add a higher-impact review task.",
    options: [
      { value: "general", label: "General commerce or media" },
      { value: "health", label: "Health" },
      { value: "finance", label: "Finance" },
      { value: "education", label: "Education" },
      { value: "public", label: "Public sector or essential service" },
    ],
  },
  {
    id: "children",
    step: "Ambition",
    prompt: "Children's personal data",
    help: "Yes adds guardian-consent and tracking-limit tasks.",
    options: [
      { value: "no", label: "Not processed" },
      { value: "yes", label: "Processed or the service is child-directed" },
    ],
  },
  {
    id: "highRisk",
    step: "Ambition",
    prompt: "Higher-impact processing",
    help: "Includes profiling, advertising, financial, health, biometric, or precise location data.",
    options: [
      { value: "no", label: "No" },
      { value: "yes", label: "Yes" },
    ],
  },
  {
    id: "window",
    step: "Ambition",
    prompt: "Implementation window",
    help: "The phases share this window. A short window does not remove tasks.",
    options: [
      { value: "30", label: "About 30 days" },
      { value: "90", label: "About 90 days" },
      { value: "180", label: "About 180 days" },
    ],
  },
  {
    id: "owner",
    step: "Ambition",
    prompt: "Accountable owner",
    help: "Named on every task. Specialists are still called out in the task text.",
    options: [
      { value: "privacy", label: "Privacy lead" },
      { value: "legal", label: "Legal" },
      { value: "engineering", label: "Engineering" },
      { value: "leadership", label: "Leadership sponsor" },
    ],
  },
];

export type TimelineTaskTemplate = {
  id: string;
  phase: "assess" | "design" | "implement" | "operate";
  title: string;
  priority: Severity | "info";
  evidence: string;
  moduleHref: string;
  moduleLabel: string;
  /** Include when any flag is present. Empty means always. */
  when: Array<"always" | "early" | "weak-cmp" | "children" | "high-risk" | "complex" | "regulated">;
  dependsOn: string[];
};

export const TIMELINE_PHASES = [
  { id: "assess", title: "Assess", summary: "Find what you process, what you tell people, and where evidence is missing." },
  { id: "design", title: "Design", summary: "Decide purposes, notices, rights paths, and vendor rules before you configure tools." },
  { id: "implement", title: "Implement", summary: "Put the notice, the choice, the record, and the rights queue into operation." },
  { id: "operate", title: "Operate", summary: "Keep the record current, watch drift, and review the programme." },
] as const;

export const TIMELINE_TASKS: TimelineTaskTemplate[] = [
  { id: "inventory", phase: "assess", title: "List properties, purposes, and the systems that hold personal data", priority: "critical", evidence: "Processing inventory with owners", moduleHref: "/dashboard/discovery", moduleLabel: "Discovery", when: ["always"], dependsOn: [] },
  { id: "consent-audit", phase: "assess", title: "Audit where consent is asked, bundled, or missing", priority: "high", evidence: "Consent gap list", moduleHref: "/dashboard/consent", moduleLabel: "Consent records", when: ["always"], dependsOn: ["inventory"] },
  { id: "notice-audit", phase: "assess", title: "Review the live notice against purpose, withdrawal, rights, and contact", priority: "high", evidence: "Notice findings", moduleHref: "/tools/notice-auditor", moduleLabel: "Notice auditor", when: ["always"], dependsOn: ["inventory"] },
  { id: "vendor-audit", phase: "assess", title: "List processors and overseas flows", priority: "high", evidence: "Vendor and transfer list", moduleHref: "/dashboard/vendors", moduleLabel: "Vendors", when: ["complex", "always"], dependsOn: ["inventory"] },
  { id: "child-audit", phase: "assess", title: "Confirm whether any property is child-directed and how age is handled today", priority: "critical", evidence: "Child-processing note", moduleHref: "/dashboard/websites", moduleLabel: "Websites", when: ["children"], dependsOn: ["inventory"] },
  { id: "impact-review", phase: "assess", title: "Review higher-impact processing before it is treated as ordinary", priority: "high", evidence: "Impact note for counsel", moduleHref: "/dashboard/transfers", moduleLabel: "Transfers", when: ["high-risk", "regulated"], dependsOn: ["inventory"] },
  { id: "consent-model", phase: "design", title: "Define required and optional purposes", priority: "critical", evidence: "Purpose model", moduleHref: "/dashboard/purposes", moduleLabel: "Purposes", when: ["always"], dependsOn: ["consent-audit"] },
  { id: "notice-model", phase: "design", title: "Draft an itemised notice and a withdrawal path", priority: "critical", evidence: "Notice draft and version plan", moduleHref: "/dashboard/policies", moduleLabel: "Policies", when: ["always"], dependsOn: ["notice-audit"] },
  { id: "rights-design", phase: "design", title: "Design intake for access, correction, erasure, nomination, and grievances", priority: "high", evidence: "Rights workflow", moduleHref: "/dashboard/rights-requests", moduleLabel: "Privacy rights", when: ["always"], dependsOn: ["inventory"] },
  { id: "guardian-design", phase: "design", title: "Design verifiable guardian consent and tracking limits for children", priority: "critical", evidence: "Guardian-flow design", moduleHref: "/dashboard/websites", moduleLabel: "Websites", when: ["children"], dependsOn: ["child-audit"] },
  { id: "cmp-deploy", phase: "implement", title: "Publish the banner, preference center, and policy version", priority: "critical", evidence: "Published policy", moduleHref: "/dashboard/policies", moduleLabel: "Policies", when: ["weak-cmp", "always"], dependsOn: ["consent-model", "notice-model"] },
  { id: "sdk", phase: "implement", title: "Install the SDK and block optional scripts until the recorded choice allows them", priority: "high", evidence: "Installation check", moduleHref: "/dashboard/developers", moduleLabel: "SDK and API keys", when: ["weak-cmp"], dependsOn: ["cmp-deploy"] },
  { id: "records", phase: "implement", title: "Confirm consent records store purpose, time, and policy version", priority: "high", evidence: "Sample consent record", moduleHref: "/dashboard/consent", moduleLabel: "Consent records", when: ["always"], dependsOn: ["cmp-deploy"] },
  { id: "rights-live", phase: "implement", title: "Open the rights queue and publish the grievance contact", priority: "high", evidence: "Test request closed", moduleHref: "/dashboard/rights-requests", moduleLabel: "Privacy rights", when: ["always"], dependsOn: ["rights-design"] },
  { id: "monitor", phase: "operate", title: "Scan for new trackers and review drift", priority: "medium", evidence: "Scan or drift review", moduleHref: "/dashboard/scanner", moduleLabel: "Scanner", when: ["always"], dependsOn: ["sdk", "records"] },
  { id: "audit", phase: "operate", title: "Review audit logs, vendor changes, and notice versions on a schedule", priority: "medium", evidence: "Review note", moduleHref: "/dashboard/audit-logs", moduleLabel: "Audit logs", when: ["always"], dependsOn: ["records"] },
  { id: "evidence", phase: "operate", title: "Export a sample receipt and check that withdrawal updates enforcement", priority: "high", evidence: "Receipt and withdrawal check", moduleHref: "/dashboard/consent", moduleLabel: "Consent records", when: ["always"], dependsOn: ["records"] },
];
