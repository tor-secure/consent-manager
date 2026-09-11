const steps = [
  { n: "01", title: "Add your website", body: "Register the domain you will install on." },
  { n: "02", title: "Create a policy", body: "Start from a GDPR, DPDP, or US template and attach purposes." },
  { n: "03", title: "Design the banner", body: "Pick a Banner Studio template and save the draft." },
  { n: "04", title: "Publish", body: "Fix the short checklist, then publish so the SDK can serve it." },
  { n: "05", title: "Install the snippet", body: "Paste one script in your site head and verify the published config." },
];

export function HomeHowItWorks() {
  return (
    <section id="how-it-works" className="home-section bg-white">
      <div className="home-fade-item mx-auto max-w-[1200px] px-5 py-16 sm:px-8 lg:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5850EC]">How it works</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#111827] sm:text-4xl">
          Live in five steps
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4B5563] sm:text-base">
          The same path you follow in the dashboard: website, policy, publish, then install.
        </p>
        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((step) => (
            <li key={step.n} className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFF] p-5">
              <p className="text-xs font-bold text-[#5850EC]">{step.n}</p>
              <h3 className="mt-2 text-sm font-semibold text-[#111827]">{step.title}</h3>
              <p className="mt-1.5 text-[13px] leading-5 text-[#6B7280]">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
