export type ModuleStatus = "completed" | "in_progress" | "available" | "locked";

export const STATUS_TEXT: Record<ModuleStatus, string> = {
  completed: "Completed",
  in_progress: "In progress",
  available: "Available",
  locked: "Locked",
};

export function toModuleStatus(value: string | undefined): ModuleStatus {
  return value === "completed" || value === "in_progress" || value === "locked" ? value : "available";
}

export function StatusIcon({ status, size = 24 }: { status: ModuleStatus; size?: number }) {
  const label = STATUS_TEXT[status];
  if (status === "completed") {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} role="img" aria-label={label} className="shrink-0">
        <circle cx="12" cy="12" r="11" fill="#00C4A7" />
        <path d="m7.5 12.5 3 3 6-6.5" fill="none" stroke="#0B2C4A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (status === "in_progress") {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} role="img" aria-label={label} className="shrink-0">
        <circle cx="12" cy="12" r="10" fill="none" stroke="#0B2C4A" strokeWidth="2" />
        <path d="M12 2a10 10 0 0 1 0 20Z" fill="#0B2C4A" />
      </svg>
    );
  }
  if (status === "locked") {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} role="img" aria-label={label} className="shrink-0 text-[#4d6570]">
        <rect x="5" y="11" width="14" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} role="img" aria-label={label} className="shrink-0">
      <circle cx="12" cy="12" r="10" fill="none" stroke="#0B2C4A" strokeOpacity="0.35" strokeWidth="2" />
    </svg>
  );
}

const CHIP_STYLE: Record<ModuleStatus, string> = {
  completed: "bg-[#E6F9F5] text-[#065f52]",
  in_progress: "bg-[#0B2C4A] text-white",
  available: "bg-[#eef3f2] text-[#0B2C4A]",
  locked: "bg-[#eef3f2] text-[#4d6570]",
};

export function StatusChip({ status }: { status: ModuleStatus }) {
  return (
    <span className={`inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-xs font-semibold ${CHIP_STYLE[status]}`}>
      {STATUS_TEXT[status]}
    </span>
  );
}
