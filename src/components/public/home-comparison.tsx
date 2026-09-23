import Link from "next/link";

import { ArrowButton } from "@/components/ui/arrow-button";
import {
  FEATURE_COUNT,
  GLOBAL_COMPETITORS,
  INDIA_COMPETITORS,
  globalFeatureRows,
  indiaFeatureRows,
} from "@/content/comparison-features";

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

function FeatureMatrix({
  title,
  subtitle,
  highlight,
  highlightSub,
  competitors,
  rows,
}: {
  title: string;
  subtitle: string;
  highlight: string;
  highlightSub: string;
  competitors: readonly string[];
  rows: Array<{ name: string; marks: [boolean, boolean, boolean, boolean, boolean] }>;
}) {
  const competitorTotals = competitors.map((_, index) =>
    rows.reduce((sum, row) => sum + (row.marks[index] ? 1 : 0), 0),
  );

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
      <div className="grid min-w-0 gap-6 border-b border-[#E5E7EB] px-4 py-5 min-[400px]:px-5 sm:px-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)]">
        <div>
          <h3 className="text-lg font-bold text-[#0F172A]">{title}</h3>
          <p className="mt-1 text-sm text-[#6B7280]">{subtitle}</p>
        </div>
        <div className="rounded-xl bg-[#F5F3FF] px-4 py-3">
          <p className="text-sm font-bold text-[#6D28D9]">{highlight}</p>
          <p className="mt-1 text-sm text-[#4B5563]">{highlightSub}</p>
        </div>
      </div>
      <p className="px-5 pb-2 text-xs font-medium text-[#6B7280] sm:hidden">
        Swipe sideways to compare →
      </p>
      <div className="comparison-scroll">
        <table className="comparison-matrix">
          <thead>
            <tr className="bg-[#0B2C4A] text-white">
              <th className="comparison-col-feature sticky left-0 z-20 bg-[#0B2C4A] text-left font-semibold">
                Features
              </th>
              <th className="comparison-col bg-[#6D28D9] font-semibold">Consent Guru</th>
              {competitors.map((name) => (
                <th key={name} className="comparison-col font-semibold">
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const rowBg = index % 2 === 0 ? "bg-white" : "bg-[#F8FAFC]";
              return (
                <tr key={row.name} className={rowBg}>
                  <th
                    className={`comparison-col-feature sticky left-0 z-10 text-left font-medium text-[#0F172A] ${rowBg}`}
                  >
                    {row.name}
                  </th>
                  <td className="comparison-col bg-[#F5F3FF]">
                    <Mark on ours />
                  </td>
                  {row.marks.map((on, markIndex) => (
                    <td key={`${row.name}-${competitors[markIndex]}`} className="comparison-col">
                      <Mark on={on} />
                    </td>
                  ))}
                </tr>
              );
            })}
            <tr className="bg-[#0B2C4A] text-white">
              <th className="comparison-col-feature sticky left-0 z-10 bg-[#0B2C4A] text-left font-semibold">
                Total core features covered
              </th>
              <td className="comparison-col bg-[#6D28D9] font-bold">
                {FEATURE_COUNT} / {FEATURE_COUNT}
              </td>
              {competitorTotals.map((total, index) => (
                <td key={competitors[index]} className="comparison-col font-semibold">
                  {total} / {FEATURE_COUNT}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function HomeComparison() {
  return (
    <section id="comparison" className="relative overflow-x-clip bg-[#F8FAFF]">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 88% 12%, rgba(109,40,217,0.16), transparent 36%), radial-gradient(circle at 8% 80%, rgba(0,196,167,0.14), transparent 42%)",
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto w-full min-w-0 max-w-[1200px] px-4 py-[clamp(3.5rem,6vw,5rem)] min-[400px]:px-5 sm:px-8">
        <div className="max-w-4xl min-w-0">
          <h2 className="text-balance text-[clamp(1.85rem,1.1rem+3.4vw,3.75rem)] font-extrabold leading-[1.08] tracking-tight text-[#0F172A]">
            Why Consent Guru?
          </h2>
          <p className="mt-4 text-balance text-[clamp(1.25rem,0.9rem+2vw,2.25rem)] font-bold tracking-tight text-[#0B2C4A]">
            Built for India. Ready for the world.
          </p>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[#4B5563]">
            Other platforms cover cookies, banners, or enterprise GRC. Consent Guru is the
            all-in-one consent intelligence layer for DPDP, GDPR, CCPA, LGPD, and {FEATURE_COUNT} core
            capabilities competitors still miss.
          </p>
        </div>

        <ul className="mt-8 grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {[
            "All top Indian USPs in one platform",
            "AI-powered and future-ready",
            "Built for DPDP & global compliance",
            "Enterprise-grade, yet easy to use",
            "Better value, more capabilities",
          ].map((item) => (
            <li
              key={item}
              className="min-w-0 rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-medium text-[#0F172A] shadow-sm"
            >
              {item}
            </li>
          ))}
        </ul>

        <div className="comparison-switch mt-12">
          <div
            className="comparison-tabs w-full max-w-md"
            role="radiogroup"
            aria-label="Comparison market"
          >
            <span className="comparison-tab-thumb" aria-hidden="true" />
            <label className="comparison-tab comparison-tab-india">
              <input
                type="radio"
                name="comparison-market"
                value="india"
                defaultChecked
              />
              India
            </label>
            <label className="comparison-tab comparison-tab-international">
              <input
                type="radio"
                name="comparison-market"
                value="international"
              />
              International
            </label>
          </div>

          <div className="comparison-panels mt-6">
            <div className="comparison-panel comparison-panel-india">
              <FeatureMatrix
                title="Feature comparison: Indian consent managers"
                subtitle="All the top features you need. In one platform. Everything the market offers, and much more."
                highlight="The most complete consent manager for India"
                highlightSub={`All ${FEATURE_COUNT} features. One platform. Zero compromises.`}
                competitors={INDIA_COMPETITORS}
                rows={indiaFeatureRows}
              />
            </div>
            <div className="comparison-panel comparison-panel-international">
              <FeatureMatrix
                title="International consent managers compared with us"
                subtitle="OneTrust, Usercentrics, Didomi, Cookiebot, and Osano on the same 30 capabilities. Consent Guru still covers every row."
                highlight="Global CMPs plus India-first DPDP"
                highlightSub={`All ${FEATURE_COUNT} features. One platform. Zero compromises.`}
                competitors={GLOBAL_COMPETITORS}
                rows={globalFeatureRows}
              />
            </div>
          </div>
        </div>

        <p className="mt-5 text-sm leading-6 text-[#6B7280]">
          Feature tables are for general information only.{" "}
          <Link href="/disclaimer" className="font-medium text-[#0B2C4A] underline decoration-[#00C4A7]/50 underline-offset-2 hover:text-[#00A88F]">
            Read the full disclaimer
          </Link>
          .
        </p>

        <div className="mt-8 flex flex-col items-stretch justify-between gap-4 rounded-2xl bg-[#0B2C4A] px-4 py-5 text-white min-[400px]:px-6 min-[400px]:py-6 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <p className="text-lg font-bold">From compliance to competitive advantage</p>
          <p className="mt-1 text-sm text-white/75">
            More than a CMP, a complete consent intelligence platform for the AI era.
          </p>
          </div>
          <ArrowButton href="/sign-up" tone="inverse" className="w-full justify-center sm:w-auto">
            Sign up
          </ArrowButton>
        </div>
      </div>
    </section>
  );
}
