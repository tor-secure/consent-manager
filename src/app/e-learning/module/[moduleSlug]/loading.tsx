import { PageLoader } from "@/components/ui/page-loader";

function Bar({ className }: { className: string }) {
  return <div className={`rounded-md bg-[#e3ecea] motion-safe:animate-pulse ${className}`} />;
}

export function ModulePagerSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 sm:gap-4" aria-hidden="true">
      <Bar className="h-[6.25rem] w-full rounded-2xl" />
      <Bar className="h-[6.25rem] w-full rounded-2xl" />
    </div>
  );
}

export default function ModuleLoading() {
  return <PageLoader label="Loading the module" />;
}
