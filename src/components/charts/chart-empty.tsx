export function ChartEmpty({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-[12rem] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--muted)]/40 px-4 py-10 text-center">
      <p className="text-sm font-medium text-[var(--foreground)]">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-[var(--muted-foreground)]">{description}</p>
    </div>
  );
}
