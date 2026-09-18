import { ArrowButton } from "@/components/ui/arrow-button";

const tiers = [
  {
    name: "Silver",
    badge: "Essential Compliance",
    price: "₹999",
    compared: "₹10,000 / month*",
    save: "Save 90%",
    detail: "Perfect for startups and small businesses getting started with privacy.",
    points: [
      "10 core features (1–10)",
      "Consent banner & preference center",
      "Cookie / SDK / tracker scanner",
      "AI regulation & geo-legal engine",
      "Up to 5 domains",
      "Up to 100K pageviews / month",
      "Standard support",
    ],
  },
  {
    name: "Gold",
    badge: "Most popular · Advanced Privacy",
    price: "₹2,499",
    compared: "₹25,000 / month*",
    save: "Save 90%",
    detail: "Ideal for growing businesses that need more control and intelligence.",
    featured: true,
    points: [
      "20 features (1–20)",
      "All 10 Silver features",
      "Consent quality score & autopilot",
      "Digital twin & ROI engine",
      "Up to 25 domains",
      "Up to 1M pageviews / month",
      "Priority email + chat support",
    ],
  },
  {
    name: "Platinum",
    badge: "Complete Privacy Platform",
    price: "₹4,999",
    compared: "₹50,000 / month*",
    save: "Save 90%",
    detail: "For enterprises that want the full power of AI-driven consent management.",
    points: [
      "All 30 features (1–30)",
      "AI-agent permissioning",
      "Real-time data redaction",
      "Unlimited domains & pageviews",
      "Dedicated account manager",
      "24/7 priority support",
      "Custom integrations on request",
    ],
  },
];

export function HomePricing() {
  return (
    <section id="pricing" className="bg-[#F8FAFF]">
      <div className="mx-auto max-w-[1200px] px-5 py-16 sm:px-8 lg:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6D28D9]">Pricing</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#111827] sm:text-4xl">
          Choose what fits your scale
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4B5563] sm:text-base">
          Silver, Gold, and Platinum plans from our 2026 comparison. Create a workspace to get
          started — checkout is shown for planning.
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {tiers.map((tier) => (
            <article
              key={tier.name}
              className={`rounded-2xl border bg-white p-6 ${
                tier.featured
                  ? "border-[#F59E0B] shadow-[0_16px_40px_-24px_rgba(245,158,11,0.65)]"
                  : "border-[#E5E7EB]"
              }`}
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#6D28D9]">
                {tier.badge}
              </p>
              <h3 className="mt-2 text-lg font-semibold text-[#111827]">{tier.name}</h3>
              <p className="mt-2 text-3xl font-bold text-[#111827]">
                {tier.price}
                <span className="text-base font-medium text-[#6B7280]"> / month</span>
              </p>
              <p className="mt-1 text-xs text-[#6B7280]">
                <span className="line-through">{tier.compared}</span>{" "}
                <span className="font-semibold text-[#059669]">{tier.save}</span>
              </p>
              <p className="mt-2 text-sm text-[#4B5563]">{tier.detail}</p>
              <ul className="mt-5 space-y-2 text-sm text-[#4B5563]">
                {tier.points.map((point) => (
                  <li key={point} className="flex gap-2">
                    <span className="text-[#00C4A7]" aria-hidden="true">
                      ✓
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
              <ArrowButton href="/sign-up" className="mt-6 w-full">
                Get started
              </ArrowButton>
            </article>
          ))}
        </div>
        <p className="mt-8 text-xs leading-5 text-[#6B7280]">
          Plans are shown for marketing. Sign up to create a workspace — checkout is not required yet.
        </p>
      </div>
    </section>
  );
}
