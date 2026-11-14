"use client";

import Link from "next/link";

import { PieChart } from "@/components/charts/pie-chart";
import { SimpleLineChart } from "@/components/charts/simple-line-chart";
import { LearnersTable } from "@/components/learning/admin/learners-table";
import type { AdminDashboard } from "@/lib/learning/admin-service";

function StatCard({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
}) {
  const body = (
    <>
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#4d6570] sm:text-[11px] sm:tracking-[0.14em]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-[#0B2C4A] sm:mt-3 sm:text-3xl">{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-[#6B7280] sm:text-xs">{hint}</p> : null}
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        className="rounded-2xl border border-[#e4eeec] bg-white p-3.5 shadow-[0_14px_36px_-30px_rgba(11,44,74,0.35)] transition hover:border-[#0B2C4A]/35 sm:p-5"
      >
        {body}
      </Link>
    );
  }
  return (
    <div className="rounded-2xl border border-[#e4eeec] bg-white p-3.5 shadow-[0_14px_36px_-30px_rgba(11,44,74,0.35)] sm:p-5">
      {body}
    </div>
  );
}

export function AdminOverviewDashboard({ data }: { data: AdminDashboard }) {
  const trendPoints = data.enrollmentTrend.map((row) => ({
    label: row.label,
    values: { enrolled: row.enrolled },
  }));

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#00A88F]">Dashboard</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#0B2C4A] sm:text-3xl">Overview</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4d6570]">
          {data.courseTitle} · {data.moduleCount} modules. Live view of registrations, enrollments,
          activity, progress, and certificates.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
        <StatCard label="Registered users" value={data.learnerCount} href="/elearning-admin/learners" />
        <StatCard label="Enrolled" value={data.enrolledCount} hint={`${data.avgProgressPercent}% avg progress`} />
        <StatCard
          label="Active (7 days)"
          value={data.activeLast7Days}
          hint={`${data.activeLast30Days} active in 30 days`}
        />
        <StatCard
          label="Certificates"
          value={data.certificateCount}
          hint={`${data.examPassedCount} exam passes`}
          href="/elearning-admin/certificates"
        />
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
        <StatCard label="Vouchers" value="Soon" hint="Feature coming soon" href="/elearning-admin/vouchers" />
        <StatCard label="Coupons" value="Soon" hint="Feature coming soon" href="/elearning-admin/coupons" />
        <StatCard label="Avg progress" value={`${data.avgProgressPercent}%`} />
        <StatCard label="Exam passed" value={data.examPassedCount} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="min-w-0 rounded-2xl border border-[#e4eeec] bg-white p-4 shadow-[0_14px_36px_-30px_rgba(11,44,74,0.35)] sm:p-6">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-[#0B2C4A] sm:text-lg">Enrollment trend</h2>
            <p className="mt-1 text-sm text-[#4d6570]">New enrollments by week</p>
          </div>
          <div className="min-w-0 overflow-hidden">
            <SimpleLineChart
              points={trendPoints}
              series={[{ key: "enrolled", label: "Enrolled", color: "#00C4A7" }]}
              label="Enrollment trend"
              emptyTitle="No enrollments yet"
              emptyDescription="Enrollment activity will appear here once learners join the course."
            />
          </div>
        </section>

        <section className="min-w-0 rounded-2xl border border-[#e4eeec] bg-white p-4 shadow-[0_14px_36px_-30px_rgba(11,44,74,0.35)] sm:p-6">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-[#0B2C4A] sm:text-lg">Progress mix</h2>
            <p className="mt-1 text-sm text-[#4d6570]">Share of enrolled learners by completion</p>
          </div>
          <PieChart
            slices={data.progressBuckets}
            label="Progress distribution"
            centerLabel="enrolled"
            legend="row"
            emptyTitle="No progress data"
            emptyDescription="Progress charts appear after learners enroll and complete modules."
          />
        </section>
      </div>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#0B2C4A] sm:text-lg">Learners and progress</h2>
            <p className="mt-1 text-sm text-[#4d6570]">
              Name, email, module progress, exam status, and certificates.
            </p>
          </div>
          <Link
            href="/elearning-admin/learners"
            className="text-sm font-semibold text-[#0B2C4A] underline-offset-2 hover:underline"
          >
            Open full learners view
          </Link>
        </div>
        <LearnersTable learners={data.learners} moduleCount={data.moduleCount} />
      </section>
    </div>
  );
}
