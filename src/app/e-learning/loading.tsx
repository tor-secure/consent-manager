function Bar({ className }: { className: string }) {
  return <div className={`rounded-md bg-[#e3ecea] motion-safe:animate-pulse ${className}`} />;
}

export default function ELearningLoading() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading the course">
      <div className="rounded-xl border border-[#d5e3e0] bg-white p-6 sm:p-8">
        <Bar className="h-3 w-40" />
        <Bar className="mt-4 h-8 w-3/4" />
        <Bar className="mt-4 h-4 w-full max-w-2xl" />
        <Bar className="mt-2 h-4 w-2/3 max-w-xl" />
        <Bar className="mt-6 h-11 w-44" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="rounded-xl border border-[#d5e3e0] bg-white p-6">
          <Bar className="h-3 w-32" />
          <Bar className="mt-4 h-6 w-2/3" />
          <Bar className="mt-6 h-11 w-36" />
        </div>
        <div className="rounded-xl border border-[#d5e3e0] bg-white p-6">
          <Bar className="h-3 w-24" />
          <Bar className="mt-4 h-8 w-28" />
          <Bar className="mt-4 h-2.5 w-full" />
        </div>
      </div>
      <div className="grid gap-2">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="flex items-center gap-3 rounded-xl border border-[#d5e3e0] bg-white px-4 py-4">
            <Bar className="h-6 w-6 rounded-full" />
            <Bar className="h-4 w-8" />
            <Bar className="h-4 flex-1" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
