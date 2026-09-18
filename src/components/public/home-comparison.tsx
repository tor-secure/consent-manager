import { ArrowButton } from "@/components/ui/arrow-button";

const indiaUsps = [
  {
    rank: "1",
    name: "CookieYes",
    usp: "Cookie consent & compliance",
    india: "Strong cookie consent focus",
    differentiator: "Simple setup, scanning & consent management",
  },
  {
    rank: "2",
    name: "OneTrust",
    usp: "Enterprise privacy & consent management",
    india: "Supports global + India privacy requirements",
    differentiator: "Governance, automation & integrations",
  },
  {
    rank: "3",
    name: "Usercentrics",
    usp: "Advanced consent UX & automation",
    india: "Global privacy compliance",
    differentiator: "Consent experience, analytics & automation",
  },
  {
    rank: "4",
    name: "Cookiebot",
    usp: "Automated cookie scanning & blocking",
    india: "Global compliance support",
    differentiator: "Scanning, categorization & auto-blocking",
  },
  {
    rank: "5",
    name: "Didomi",
    usp: "Consent & preference management",
    india: "Multi-regulation support",
    differentiator: "Flexible consent UX & preference management",
  },
];

const globalUsps = [
  {
    rank: "1",
    name: "OneTrust",
    usp: "Comprehensive privacy and data governance",
    strength: "Enterprise-grade capabilities",
    differentiator: "Largest and most comprehensive platform",
    market: "Global enterprises, regulated industries",
  },
  {
    rank: "2",
    name: "Usercentrics",
    usp: "Modern consent experience",
    strength: "Strong in consent UX and automation",
    differentiator: "Highly customizable consent experience",
    market: "Global mid-market to enterprises",
  },
  {
    rank: "3",
    name: "Didomi",
    usp: "Flexible and scalable consent platform",
    strength: "Strong regulatory coverage",
    differentiator: "Designed for complex digital ecosystems",
    market: "Global enterprises, digital-first businesses",
  },
  {
    rank: "4",
    name: "Cookiebot",
    usp: "Automated cookie scanning and blocking",
    strength: "Industry-leading cookie scanning",
    differentiator: "Easy deployment and low maintenance",
    market: "Global SMBs to enterprises",
  },
  {
    rank: "5",
    name: "Osano",
    usp: "Privacy made simple",
    strength: "Focus on SMB and growing businesses",
    differentiator: "Simple, transparent and affordable",
    market: "Global SMBs and mid-market",
  },
];

const competitors = ["CookieYes", "Securiti", "Ketch", "ShieldSquare", "Aparoksha"] as const;

type FeatureRow = {
  name: string;
  marks: [boolean, boolean, boolean, boolean, boolean];
};

const featureRows: FeatureRow[] = [
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

const FEATURE_COUNT = featureRows.length;

const competitorTotals = competitors.map((_, index) =>
  featureRows.reduce((sum, row) => sum + (row.marks[index] ? 1 : 0), 0),
);

function Mark({ on, ours = false }: { on: boolean; ours?: boolean }) {
  if (on) {
    return (
      <span
        className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${
          ours ? "bg-white text-[#6D28D9]" : "bg-[#D1FAE5] text-[#047857]"
        }`}
        aria-label="Included"
      >
        ✓
      </span>
    );
  }
  return (
    <span
      className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#FEE2E2] text-[#B91C1C]"
      aria-label="Not included"
    >
      ✕
    </span>
  );
}

export function HomeComparison() {
  return (
    <section id="comparison" className="relative overflow-hidden bg-[#F8FAFF]">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 88% 12%, rgba(109,40,217,0.16), transparent 36%), radial-gradient(circle at 8% 80%, rgba(0,196,167,0.14), transparent 42%)",
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-[1200px] px-5 py-16 sm:px-8 lg:py-20">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6D28D9]">
              Why Consent Guru
            </p>
            <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight text-[#0F172A] sm:text-4xl">
              Built for India. Ready for the world.
            </h2>
            <p className="mt-3 max-w-2xl text-[15px] leading-7 text-[#4B5563]">
              Other platforms cover cookies, banners, or enterprise GRC. Consent Guru is the
              all-in-one consent intelligence layer — DPDP, GDPR, CCPA, LGPD, and {FEATURE_COUNT} core
              capabilities competitors still miss.
            </p>
          </div>
          <div className="inline-flex items-center gap-3 rounded-2xl border border-[#DDD6FE] bg-white px-4 py-3 shadow-sm">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#EDE9FE] text-[#6D28D9]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                <path
                  d="M3 12h18M12 3c2.6 2.6 3.9 5.6 3.9 9s-1.3 6.4-3.9 9c-2.6-2.6-3.9-5.6-3.9-9S9.4 5.6 12 3Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
              </svg>
            </span>
            <p className="text-sm font-semibold leading-5 text-[#0F172A]">
              Global Compliance.
              <br />
              Stronger businesses. A more private world.
            </p>
          </div>
        </div>

        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            "All top Indian USPs in one platform",
            "AI-powered and future-ready",
            "Built for DPDP & global compliance",
            "Enterprise-grade, yet easy to use",
            "Better value, more capabilities",
          ].map((item) => (
            <li
              key={item}
              className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-medium text-[#0F172A] shadow-sm"
            >
              {item}
            </li>
          ))}
        </ul>

        <div className="mt-12 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
          <div className="flex items-start justify-between gap-4 border-b border-[#E5E7EB] px-5 py-4 sm:px-6">
            <div>
              <h3 className="text-lg font-bold text-[#0F172A]">India’s top consent managers</h3>
              <p className="mt-1 text-sm text-[#6B7280]">
                Leading platforms in the Indian market — and where Consent Guru goes further.
              </p>
            </div>
            <p className="hidden rounded-full bg-[#E6F9F5] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#0B2C4A] sm:inline-flex">
              India-first privacy
            </p>
          </div>
          <p className="px-5 pb-2 text-xs font-medium text-[#6B7280] sm:hidden">Swipe sideways to compare →</p>
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full text-left text-sm">
              <thead className="bg-[#0B2C4A] text-white">
                <tr>
                  <th className="px-4 py-3 font-semibold">#</th>
                  <th className="px-4 py-3 font-semibold">Consent manager</th>
                  <th className="px-4 py-3 font-semibold">Key USP</th>
                  <th className="px-4 py-3 font-semibold">India / DPDP strength</th>
                  <th className="px-4 py-3 font-semibold">Key differentiator</th>
                </tr>
              </thead>
              <tbody>
                {indiaUsps.map((row) => (
                  <tr key={row.name} className="border-t border-[#E5E7EB]">
                    <td className="px-4 py-3 font-semibold text-[#6B7280]">{row.rank}</td>
                    <td className="px-4 py-3 font-semibold text-[#0F172A]">{row.name}</td>
                    <td className="px-4 py-3 text-[#4B5563]">{row.usp}</td>
                    <td className="px-4 py-3 text-[#4B5563]">{row.india}</td>
                    <td className="px-4 py-3 text-[#4B5563]">{row.differentiator}</td>
                  </tr>
                ))}
                <tr className="border-t border-[#DDD6FE] bg-[#F5F3FF]">
                  <td className="px-4 py-3 font-semibold text-[#6D28D9]">★</td>
                  <td className="px-4 py-3 font-semibold text-[#6D28D9]">Consent Guru</td>
                  <td className="px-4 py-3 text-[#4B5563]">Consent intelligence for the AI era</td>
                  <td className="px-4 py-3 text-[#4B5563]">DPDP-native, India-first, world-ready</td>
                  <td className="px-4 py-3 text-[#4B5563]">All {FEATURE_COUNT} core features. No gaps.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
          <div className="flex items-start justify-between gap-4 border-b border-[#E5E7EB] px-5 py-4 sm:px-6">
            <div>
              <h3 className="text-lg font-bold text-[#0F172A]">Top 5 global consent managers</h3>
              <p className="mt-1 text-sm text-[#6B7280]">
                International leaders — and how Consent Guru is different at the end of the table.
              </p>
            </div>
            <p className="hidden rounded-full bg-[#EEF2FF] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#3730A3] sm:inline-flex">
              A more private world
            </p>
          </div>
          <p className="px-5 pb-2 text-xs font-medium text-[#6B7280] sm:hidden">Swipe sideways to compare →</p>
          <div className="overflow-x-auto">
            <table className="min-w-[880px] w-full text-left text-sm">
              <thead className="bg-[#0B2C4A] text-white">
                <tr>
                  <th className="px-4 py-3 font-semibold">#</th>
                  <th className="px-4 py-3 font-semibold">Consent manager</th>
                  <th className="px-4 py-3 font-semibold">Key USP</th>
                  <th className="px-4 py-3 font-semibold">Major strength</th>
                  <th className="px-4 py-3 font-semibold">Key differentiator</th>
                  <th className="px-4 py-3 font-semibold">Primary market</th>
                </tr>
              </thead>
              <tbody>
                {globalUsps.map((row) => (
                  <tr key={row.name} className="border-t border-[#E5E7EB]">
                    <td className="px-4 py-3 font-semibold text-[#6B7280]">{row.rank}</td>
                    <td className="px-4 py-3 font-semibold text-[#0F172A]">{row.name}</td>
                    <td className="px-4 py-3 text-[#4B5563]">{row.usp}</td>
                    <td className="px-4 py-3 text-[#4B5563]">{row.strength}</td>
                    <td className="px-4 py-3 text-[#4B5563]">{row.differentiator}</td>
                    <td className="px-4 py-3 text-[#4B5563]">{row.market}</td>
                  </tr>
                ))}
                <tr className="border-t border-[#DDD6FE] bg-[#F5F3FF]">
                  <td className="px-4 py-3 font-semibold text-[#6D28D9]">★</td>
                  <td className="px-4 py-3 font-semibold text-[#6D28D9]">Consent Guru</td>
                  <td className="px-4 py-3 text-[#4B5563]">
                    Consent intelligence: banners, evidence, AI, and enforcement in one runtime
                  </td>
                  <td className="px-4 py-3 text-[#4B5563]">
                    India-first DPDP plus GDPR, CPRA, LGPD, TCF/GPP — {FEATURE_COUNT}/{FEATURE_COUNT} capabilities
                  </td>
                  <td className="px-4 py-3 text-[#4B5563]">
                    Covers what the top five do, then adds scanner, rights, child protection, firewall, and agent permissioning
                  </td>
                  <td className="px-4 py-3 text-[#4B5563]">
                    India and global — startups to enterprises, one purpose catalog
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
          <div className="grid gap-6 border-b border-[#E5E7EB] px-5 py-5 sm:px-6 lg:grid-cols-[1.4fr_0.8fr]">
            <div>
              <h3 className="text-lg font-bold text-[#0F172A]">Feature comparison — Indian consent managers</h3>
              <p className="mt-1 text-sm text-[#6B7280]">
                All the top features you need. In one platform. Everything the market offers — and much more.
              </p>
            </div>
            <div className="rounded-xl bg-[#F5F3FF] px-4 py-3">
              <p className="text-sm font-bold text-[#6D28D9]">The most complete consent manager for India</p>
              <p className="mt-1 text-sm text-[#4B5563]">All {FEATURE_COUNT} features. One platform. Zero compromises.</p>
            </div>
          </div>
          <p className="px-5 pb-2 text-xs font-medium text-[#6B7280] sm:hidden">Swipe sideways to compare →</p>
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full text-center text-[13px]">
              <thead>
                <tr className="bg-[#0B2C4A] text-white">
                  <th className="sticky left-0 z-20 bg-[#0B2C4A] px-3 py-3 text-left font-semibold">Features</th>
                  {competitors.map((name) => (
                    <th key={name} className="px-3 py-3 font-semibold">
                      {name}
                    </th>
                  ))}
                  <th className="bg-[#6D28D9] px-3 py-3 font-semibold">Consent Guru</th>
                </tr>
              </thead>
              <tbody>
                {featureRows.map((row, index) => {
                  const rowBg = index % 2 === 0 ? "bg-white" : "bg-[#F8FAFC]";
                  return (
                  <tr key={row.name} className={rowBg}>
                    <th className={`sticky left-0 z-10 px-3 py-2.5 text-left font-medium text-[#0F172A] ${rowBg}`}>
                      {row.name}
                    </th>
                    {row.marks.map((on, markIndex) => (
                      <td key={`${row.name}-${competitors[markIndex]}`} className="px-3 py-2.5">
                        <Mark on={on} />
                      </td>
                    ))}
                    <td className="bg-[#F5F3FF] px-3 py-2.5">
                      <Mark on ours />
                    </td>
                  </tr>
                  );
                })}
                <tr className="bg-[#0B2C4A] text-white">
                  <th className="sticky left-0 z-10 bg-[#0B2C4A] px-3 py-3 text-left font-semibold">
                    Total core features covered
                  </th>
                  {competitorTotals.map((total, index) => (
                    <td key={competitors[index]} className="px-3 py-3 font-semibold">
                      {total} / {FEATURE_COUNT}
                    </td>
                  ))}
                  <td className="bg-[#6D28D9] px-3 py-3 font-bold">
                    {FEATURE_COUNT} / {FEATURE_COUNT}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-10 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/features/5.png"
              alt="Consent Guru infrastructure and technology stack architecture"
              className="h-auto w-full max-w-full"
            />
          </figure>
        </div>

        <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-2xl bg-[#0B2C4A] px-6 py-6 text-white sm:flex-row sm:items-center">
          <div>
            <p className="text-lg font-bold">From compliance to competitive advantage</p>
            <p className="mt-1 text-sm text-white/75">
              More than a CMP — a complete consent intelligence platform for the AI era.
            </p>
          </div>
          <ArrowButton href="/sign-up" tone="inverse">
            Sign up
          </ArrowButton>
        </div>
      </div>
    </section>
  );
}
