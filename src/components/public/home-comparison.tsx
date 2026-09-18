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
    <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
      <div className="grid gap-6 border-b border-[#E5E7EB] px-5 py-5 sm:px-6 lg:grid-cols-[1.4fr_0.8fr]">
        <div>
          <h3 className="text-lg font-bold text-[#0F172A]">{title}</h3>
          <p className="mt-1 text-sm text-[#6B7280]">{subtitle}</p>
        </div>
        <div className="rounded-xl bg-[#F5F3FF] px-4 py-3">
          <p className="text-sm font-bold text-[#6D28D9]">{highlight}</p>
          <p className="mt-1 text-sm text-[#4B5563]">{highlightSub}</p>
        </div>
      </div>
      <p className="px-5 pb-2 text-xs font-medium text-[#6B7280] sm:hidden">Swipe sideways to compare →</p>
      <div className="table-scroll touch-pan-x overscroll-x-contain snap-x snap-mandatory">
        <table className="w-max min-w-[980px] table-fixed border-separate border-spacing-0 text-center text-[13px]">
          <thead>
            <tr className="bg-[#0B2C4A] text-white">
              <th className="sticky left-0 z-20 w-[140px] min-w-[140px] max-w-[140px] bg-[#0B2C4A] px-3 py-3 text-left font-semibold sm:w-[180px] sm:min-w-[180px] sm:max-w-[180px]">
                Features
              </th>
              {competitors.map((name) => (
                <th
                  key={name}
                  className="w-[148px] min-w-[148px] max-w-[148px] snap-start px-3 py-3 font-semibold"
                >
                  {name}
                </th>
              ))}
              <th className="sticky right-0 z-20 w-[132px] min-w-[132px] max-w-[132px] bg-[#6D28D9] px-3 py-3 font-semibold sm:static sm:z-auto">
                Consent Guru
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const rowBg = index % 2 === 0 ? "bg-white" : "bg-[#F8FAFC]";
              return (
                <tr key={row.name} className={rowBg}>
                  <th
                    className={`sticky left-0 z-10 w-[140px] min-w-[140px] max-w-[140px] px-3 py-2.5 text-left font-medium text-[#0F172A] sm:w-[180px] sm:min-w-[180px] sm:max-w-[180px] ${rowBg}`}
                  >
                    {row.name}
                  </th>
                  {row.marks.map((on, markIndex) => (
                    <td
                      key={`${row.name}-${competitors[markIndex]}`}
                      className="w-[148px] min-w-[148px] max-w-[148px] snap-start px-3 py-2.5"
                    >
                      <Mark on={on} />
                    </td>
                  ))}
                  <td className="sticky right-0 z-10 w-[132px] min-w-[132px] max-w-[132px] bg-[#F5F3FF] px-3 py-2.5 sm:static sm:z-auto">
                    <Mark on ours />
                  </td>
                </tr>
              );
            })}
            <tr className="bg-[#0B2C4A] text-white">
              <th className="sticky left-0 z-10 w-[140px] min-w-[140px] max-w-[140px] bg-[#0B2C4A] px-3 py-3 text-left font-semibold sm:w-[180px] sm:min-w-[180px] sm:max-w-[180px]">
                Total core features covered
              </th>
              {competitorTotals.map((total, index) => (
                <td
                  key={competitors[index]}
                  className="w-[148px] min-w-[148px] max-w-[148px] snap-start px-3 py-3 font-semibold"
                >
                  {total} / {FEATURE_COUNT}
                </td>
              ))}
              <td className="sticky right-0 z-10 w-[132px] min-w-[132px] max-w-[132px] bg-[#6D28D9] px-3 py-3 font-bold sm:static sm:z-auto">
                {FEATURE_COUNT} / {FEATURE_COUNT}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function HomeComparison() {
  return (
    <section id="comparison" className="relative bg-[#F8FAFF]">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 88% 12%, rgba(109,40,217,0.16), transparent 36%), radial-gradient(circle at 8% 80%, rgba(0,196,167,0.14), transparent 42%)",
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-[1200px] px-5 py-16 sm:px-8 lg:py-20">
        <div className="max-w-4xl">
          <h2 className="text-balance text-4xl font-extrabold tracking-tight text-[#0F172A] sm:text-6xl sm:leading-[1.05]">
            Why Consent Guru?
          </h2>
          <p className="mt-4 text-balance text-2xl font-bold tracking-tight text-[#0B2C4A] sm:text-4xl">
            Built for India. Ready for the world.
          </p>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[#4B5563]">
            Other platforms cover cookies, banners, or enterprise GRC. Consent Guru is the
            all-in-one consent intelligence layer — DPDP, GDPR, CCPA, LGPD, and {FEATURE_COUNT} core
            capabilities competitors still miss.
          </p>
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

        <div className="mt-12">
          <FeatureMatrix
            title="Feature comparison — Indian consent managers"
            subtitle="All the top features you need. In one platform. Everything the market offers — and much more."
            highlight="The most complete consent manager for India"
            highlightSub={`All ${FEATURE_COUNT} features. One platform. Zero compromises.`}
            competitors={INDIA_COMPETITORS}
            rows={indiaFeatureRows}
          />
        </div>

        <div className="mt-8">
          <FeatureMatrix
            title="International consent managers — compared with us"
            subtitle="OneTrust, Usercentrics, Didomi, Cookiebot, and Osano on the same 30 capabilities. Consent Guru still covers every row."
            highlight="Global CMPs plus India-first DPDP"
            highlightSub={`All ${FEATURE_COUNT} features. One platform. Zero compromises.`}
            competitors={GLOBAL_COMPETITORS}
            rows={globalFeatureRows}
          />
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
