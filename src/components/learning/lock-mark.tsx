export function LockMark() {
  return (
    <span
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-dashed border-[#0B2C4A]/30 text-[#0B2C4A]"
      title="Locked"
      aria-label="Locked"
    >
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
    </span>
  );
}
