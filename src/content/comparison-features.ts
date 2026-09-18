type FeatureRow = {
  name: string;
  marks: [boolean, boolean, boolean, boolean, boolean];
};

export const INDIA_COMPETITORS = ["CookieYes", "Securiti", "Ketch", "ShieldSquare", "Aparoksha"] as const;

export const GLOBAL_COMPETITORS = ["OneTrust", "Usercentrics", "Didomi", "Cookiebot", "Osano"] as const;

export const indiaFeatureRows: FeatureRow[] = [
  { name: "Consent Banner & Preference Center", marks: [true, true, true, true, true] },
  { name: "Cookie / SDK / Tracker Scanner", marks: [true, true, true, true, true] },
  { name: "AI Regulation & Geo-Legal Engine", marks: [true, false, false, false, false] },
  { name: "Consent Receipts & Cryptographic Proof", marks: [true, false, false, false, false] },
  { name: "Script & SDK Blocking", marks: [true, true, true, true, true] },
  { name: "Consent Firewall", marks: [true, false, false, true, false] },
  { name: "Google Consent Mode", marks: [true, true, true, false, true] },
  { name: "IAB TCF / GPP Support", marks: [true, true, true, false, false] },
  { name: "Cross-Domain & Cross-Device Consent", marks: [true, true, false, true, true] },
  { name: "Consent Analytics & Visualization", marks: [false, true, true, true, false] },
  { name: "Consent Trends & Segmentation", marks: [false, false, true, true, false] },
  { name: "Consent Quality Score", marks: [false, false, false, true, false] },
  { name: "AI Consent Autopilot", marks: [false, false, false, false, false] },
  { name: "Consent Digital Twin", marks: [false, false, false, false, false] },
  { name: "Consent Enforcement API", marks: [false, false, false, false, false] },
  { name: "Server-Side Consent Enforcement", marks: [false, false, false, false, false] },
  { name: "Data-Flow Consent Map", marks: [false, false, false, false, false] },
  { name: "Consent ROI Engine", marks: [false, false, false, false, false] },
  { name: "AI Consent Firewall", marks: [false, false, false, false, false] },
  { name: "Consent Negotiation Engine", marks: [false, false, false, false, false] },
  { name: "AI-Agent Permissioning", marks: [false, false, false, false, false] },
  { name: "Real-Time Consent-Based Data Redaction", marks: [false, false, false, false, false] },
  { name: "Consent Graph & Dependency Intelligence", marks: [false, false, false, false, false] },
  { name: "Shadow Tracker Detection", marks: [false, false, false, false, false] },
  { name: "Consent Drift Detection", marks: [false, false, false, false, false] },
  { name: "Page-Level Consent Intelligence", marks: [false, false, false, false, false] },
  { name: "Consent A/B Testing", marks: [false, false, false, false, false] },
  { name: "Audit & Compliance Reporting", marks: [false, false, false, false, false] },
  { name: "RBAC & Team Management", marks: [false, false, false, false, false] },
  { name: "Child Protection & Guardian Consent", marks: [false, false, false, false, false] },
];

export const globalFeatureRows: FeatureRow[] = [
  { name: "Consent Banner & Preference Center", marks: [true, true, true, true, true] },
  { name: "Cookie / SDK / Tracker Scanner", marks: [true, true, true, true, true] },
  { name: "AI Regulation & Geo-Legal Engine", marks: [false, false, false, false, false] },
  { name: "Consent Receipts & Cryptographic Proof", marks: [true, false, false, false, false] },
  { name: "Script & SDK Blocking", marks: [true, true, true, true, true] },
  { name: "Consent Firewall", marks: [false, false, false, false, false] },
  { name: "Google Consent Mode", marks: [true, true, true, true, true] },
  { name: "IAB TCF / GPP Support", marks: [true, true, true, true, true] },
  { name: "Cross-Domain & Cross-Device Consent", marks: [true, true, true, false, false] },
  { name: "Consent Analytics & Visualization", marks: [true, true, true, true, true] },
  { name: "Consent Trends & Segmentation", marks: [true, true, true, false, false] },
  { name: "Consent Quality Score", marks: [false, false, false, false, false] },
  { name: "AI Consent Autopilot", marks: [false, false, false, false, false] },
  { name: "Consent Digital Twin", marks: [false, false, false, false, false] },
  { name: "Consent Enforcement API", marks: [true, false, false, false, false] },
  { name: "Server-Side Consent Enforcement", marks: [true, false, false, false, false] },
  { name: "Data-Flow Consent Map", marks: [false, false, false, false, false] },
  { name: "Consent ROI Engine", marks: [false, false, false, false, false] },
  { name: "AI Consent Firewall", marks: [false, false, false, false, false] },
  { name: "Consent Negotiation Engine", marks: [false, false, false, false, false] },
  { name: "AI-Agent Permissioning", marks: [false, false, false, false, false] },
  { name: "Real-Time Consent-Based Data Redaction", marks: [false, false, false, false, false] },
  { name: "Consent Graph & Dependency Intelligence", marks: [false, false, false, false, false] },
  { name: "Shadow Tracker Detection", marks: [false, false, false, false, false] },
  { name: "Consent Drift Detection", marks: [false, false, false, false, false] },
  { name: "Page-Level Consent Intelligence", marks: [false, false, false, false, false] },
  { name: "Consent A/B Testing", marks: [true, true, false, false, false] },
  { name: "Audit & Compliance Reporting", marks: [true, true, true, false, false] },
  { name: "RBAC & Team Management", marks: [true, true, true, false, false] },
  { name: "Child Protection & Guardian Consent", marks: [false, false, false, false, false] },
];

export const FEATURE_COUNT = indiaFeatureRows.length;
