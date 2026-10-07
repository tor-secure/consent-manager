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
      <div className="min-w-0 space-y-5">
          <div className="aspect-video w-full rounded-xl bg-[#d9e4e2] motion-safe:animate-pulse" />
          <Bar className="h-4 w-32" />
          <Bar className="h-8 w-3/4" />
          <div className="grid gap-2 sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <Bar key={index} className="h-12 w-full rounded-lg" />
            ))}
          </div>
          <div className="space-y-3 rounded-xl border border-[#d5e3e0] bg-white p-6">
            <Bar className="h-5 w-40" />
            <Bar className="h-4 w-full" />
            <Bar className="h-4 w-11/12" />
            <Bar className="h-4 w-4/5" />
          </div>
        </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
