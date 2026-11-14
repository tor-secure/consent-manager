import { LearnersTable } from "@/components/learning/admin/learners-table";
import { listAdminLearners, moduleCount } from "@/lib/learning/admin-service";

export const metadata = {
  title: "Learners",
};

export default async function ElearningAdminLearnersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const [learners, totalModules] = await Promise.all([listAdminLearners(q ?? ""), moduleCount()]);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#00A88F]">People</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#0B2C4A] sm:text-3xl">Learners</h1>
        <p className="mt-2 text-sm text-[#4d6570]">
          Track module progress, exam status, and certificates for every learner.
        </p>
      </div>
      <LearnersTable learners={learners} moduleCount={totalModules} />
    </div>
  );
}
