export function PenaltyCallout({ className = "" }: { className?: string }) {
  return (
    <aside
      className={`min-w-0 rounded-xl border-2 border-[#DC2626] bg-[#FEF2F2] px-3 py-3 text-left min-[400px]:px-4 ${className}`}
      role="note"
    >
      <p className="text-[clamp(0.7rem,0.62rem+0.4vw,0.8125rem)] font-extrabold uppercase tracking-[0.06em] text-[#B91C1C]">
        DPDP Act penalty: up to ₹250 crore
      </p>
      <p className="mt-1 text-sm leading-6 break-words text-[#7F1D1D]">
        Specified failures, including children&apos;s data and security safeguards, can attract
        financial penalties of up to <strong>two hundred and fifty crore rupees</strong>. Record
        consent, honour withdrawal, and keep evidence.
      </p>
    </aside>
  );
}
