function Bar({ className }: { className: string }) {
  return <div className={`rounded-md bg-[#e3ecea] motion-safe:animate-pulse ${className}`} />;
}

export function ModulePagerSkeleton() {
  return <div className="grid gap-3 sm:grid-cols-2" aria-hidden="true"><Bar className="h-16 w-full rounded-xl" /><Bar className="h-16 w-full rounded-xl" /></div>;
}

export default function ModuleLoading() {
  return (
    <div className="space-y-5" role="status" aria-label="Loading the module">
      <Bar className="h-4 w-40" />
      <Bar className="h-8 w-2/3" />
      <div className="grid gap-4 lg:h-[calc(100dvh-15rem)] lg:min-h-[32rem] lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)]">
        <div className="space-y-2 rounded-xl border border-[#d5e3e0] bg-white p-3">
          {Array.from({ length: 8 }, (_, index) => (
            <Bar key={index} className="h-10 w-full" />
          ))}
        </div>
        <Bar className="min-h-[16rem] w-full rounded-xl lg:min-h-0 lg:h-full" />
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
