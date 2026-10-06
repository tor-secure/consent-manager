export function ProgressBar({
  value,
  label,
  size = "md",
  showValue = true,
}: {
  value: number;
  label: string;
  size?: "sm" | "md";
  showValue?: boolean;
}) {
  const percent = Math.min(100, Math.max(0, Math.round(value)));
  const height = size === "sm" ? "h-1.5" : "h-2.5";
  return (
    <div className="flex items-center gap-3">
      <div
        className={`${height} min-w-0 flex-1 overflow-hidden rounded-full bg-[#e3ecea]`}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div
          className={`${height} rounded-full bg-[#00C4A7] motion-safe:transition-[width] motion-safe:duration-500`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {showValue ? <span className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums text-[#0B2C4A]">{percent}%</span> : null}
    </div>
  );
}
