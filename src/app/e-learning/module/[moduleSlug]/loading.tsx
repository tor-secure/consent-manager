function Bar({ className }: { className: string }) {
  return <div className={`rounded-md bg-[#e3ecea] motion-safe:animate-pulse ${className}`} />;
}

export function ModulePagerSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2" aria-hidden="true">
      <Bar className="h-16 w-full rounded-xl" />
      <Bar className="h-16 w-full rounded-xl" />
    </div>
  );
}

export default function ModuleLoading() {
  return (
    <div className="space-y-5" role="status" aria-label="Loading the module">
      <Bar className="h-4 w-40" />
      <div className="rounded-2xl border border-[#e4eeec] bg-white p-5">
        <Bar className="h-5 w-48" />
        <Bar className="mt-3 h-8 w-2/3" />
      </div>
      <div className="overflow-hidden rounded-2xl border border-[#d5e3e0] bg-white">
        <div className="flex items-center justify-between border-b border-[#e4eeec] px-5 py-3">
          <Bar className="h-8 w-40" />
          <Bar className="h-2 w-40" />
        </div>
        <div className="grid lg:grid-cols-[17.5rem_minmax(0,1fr)]">
          <div className="space-y-2 border-b border-[#e4eeec] p-3 lg:border-b-0 lg:border-r">
            {Array.from({ length: 8 }, (_, index) => (
              <Bar key={index} className="h-10 w-full rounded-xl" />
            ))}
          </div>
          <div className="p-8">
            <Bar className="h-4 w-32" />
            <Bar className="mt-3 h-8 w-1/2" />
            <Bar className="mt-6 h-4 w-full" />
            <Bar className="mt-2 h-4 w-5/6" />
            <Bar className="mt-2 h-4 w-4/5" />
          </div>
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
