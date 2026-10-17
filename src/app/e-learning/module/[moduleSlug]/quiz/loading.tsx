function Bar({ className }: { className: string }) {
  return <div className={`rounded-md bg-[#e3ecea] motion-safe:animate-pulse ${className}`} />;
}

export default function QuizLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-5" role="status" aria-label="Loading the quiz">
      <Bar className="h-4 w-48" />
      <div className="space-y-2">
        <Bar className="h-5 w-40" />
        <Bar className="h-8 w-2/3" />
      </div>
      <div className="rounded-2xl border border-[#d5e3e0] bg-white p-6">
        <Bar className="h-5 w-1/3" />
        <Bar className="mt-4 h-4 w-full" />
        <Bar className="mt-2 h-4 w-5/6" />
        <div className="mt-6 space-y-3">
          <Bar className="h-12 w-full rounded-xl" />
          <Bar className="h-12 w-full rounded-xl" />
          <Bar className="h-12 w-full rounded-xl" />
        </div>
      </div>
      <span className="sr-only">Opening quiz…</span>
    </div>
  );
}
