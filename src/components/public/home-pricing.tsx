import Link from "next/link";

const tiers = [
  {
    name: "Starter",
    price: "$0",
    detail: "Display only — no checkout yet",
    points: ["1 website", "Consent banner & preference center", "SDK install snippet"],
  },
  {
    name: "Growth",
    price: "Talk to us",
    detail: "For teams going live on more sites",
    points: ["Multiple websites", "Scanner and analytics", "API keys and webhooks"],
    featured: true,
  },
  {
    name: "Scale",
    price: "Custom",
    detail: "For larger compliance programs",
    points: ["Advanced intelligence tools", "Retention and rights requests", "Team roles"],
  },
];

export function HomePricing() {
  return (
    <section id="pricing" className="home-section bg-[#F8FAFF]">
      <div className="home-fade-item mx-auto max-w-[1200px] px-5 py-16 sm:px-8 lg:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5850EC]">Pricing</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#111827] sm:text-4xl">
          Start free, grow when you are ready
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4B5563] sm:text-base">
          These plans are shown for planning only. Billing is not enabled in this product yet — create an account and use the workspace at no charge.
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {tiers.map((tier) => (
            <article
              key={tier.name}
              className={`rounded-2xl border bg-white p-6 ${
                tier.featured ? "border-[#5850EC] shadow-[0_16px_40px_-24px_rgba(88,80,236,0.55)]" : "border-[#E5E7EB]"
              }`}
            >
              <h3 className="text-lg font-semibold text-[#111827]">{tier.name}</h3>
              <p className="mt-2 text-3xl font-bold text-[#111827]">{tier.price}</p>
              <p className="mt-1 text-xs text-[#6B7280]">{tier.detail}</p>
              <ul className="mt-5 space-y-2 text-sm text-[#4B5563]">
                {tier.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
              <Link
                href="/sign-up"
                className={`mt-6 inline-flex h-10 w-full items-center justify-center rounded-xl text-sm font-semibold ${
                  tier.featured
                    ? "bg-[#5850EC] text-white hover:bg-[#4F46E5]"
                    : "border border-[#E5E7EB] text-[#111827] hover:bg-[#F8FAFF]"
                }`}
              >
                Get started
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
