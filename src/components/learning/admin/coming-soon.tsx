export function ComingSoon({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#00A88F]">{eyebrow}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#0B2C4A] sm:text-3xl">{title}</h1>
      </div>

      <section className="rounded-2xl border border-dashed border-[#cfe0dc] bg-white px-5 py-12 text-center shadow-[0_14px_36px_-30px_rgba(11,44,74,0.35)] sm:px-8 sm:py-16">
        <p className="inline-flex rounded-full bg-[#E6F9F5] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#0B2C4A]">
          Coming soon
        </p>
        <h2 className="mt-4 text-xl font-semibold text-[#0B2C4A] sm:text-2xl">{title}</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#4d6570]">{description}</p>
      </section>
    </div>
  );
}
