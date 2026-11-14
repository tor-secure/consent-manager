import Link from "next/link";

import { listAdminCertificates } from "@/lib/learning/admin-service";

export const metadata = {
  title: "Certificates",
};

function formatDate(value: Date) {
  return value.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function ElearningAdminCertificatesPage() {
  const items = await listAdminCertificates();

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#00A88F]">Credentials</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#0B2C4A] sm:text-3xl">Certificates</h1>
        <p className="mt-2 text-sm text-[#4d6570]">Issued certificates and verification links.</p>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-[#e4eeec] bg-white px-4 py-10 text-center text-sm text-[#4d6570]">
            No certificates issued yet.
          </div>
        ) : (
          items.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-[#e4eeec] bg-white p-4 shadow-[0_14px_36px_-30px_rgba(11,44,74,0.35)]"
            >
              <p className="break-all font-mono text-xs font-semibold text-[#0B2C4A]">
                {item.certificateCode}
              </p>
              <p className="mt-2 font-semibold text-[#0B2C4A]">{item.learnerName}</p>
              <p className="break-all text-xs text-[#4d6570]">{item.learnerEmail}</p>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#4d6570]">
                    Score
                  </dt>
                  <dd className="mt-1 tabular-nums">{item.scorePercent}%</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#4d6570]">
                    Issued
                  </dt>
                  <dd className="mt-1 text-[#4d6570]">{formatDate(item.issuedAt)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#4d6570]">
                    Source
                  </dt>
                  <dd className="mt-1">
                    {item.examAttemptId ? (
                      <span className="rounded-full bg-[#E6F9F5] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide">
                        Exam
                      </span>
                    ) : (
                      <span className="rounded-full bg-[#f3f7f6] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#4d6570]">
                        Admin
                      </span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#4d6570]">
                    Verify
                  </dt>
                  <dd className="mt-1">
                    <Link
                      href={`/learning/verify/${item.certificateCode}`}
                      className="font-semibold text-[#0B2C4A] underline-offset-2 hover:underline"
                    >
                      Open
                    </Link>
                  </dd>
                </div>
              </dl>
            </article>
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-2xl border border-[#e4eeec] bg-white shadow-[0_14px_36px_-30px_rgba(11,44,74,0.35)] md:block">
        <div className="overflow-x-auto">
          <table className="min-w-[720px] w-full text-left text-sm">
            <thead className="bg-[#f7fbfa] text-[11px] font-bold uppercase tracking-[0.12em] text-[#4d6570]">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Learner</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Issued</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Verify</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-[#4d6570]">
                    No certificates issued yet.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-t border-[#eef4f3]">
                    <td className="px-4 py-3 font-mono text-xs font-semibold">{item.certificateCode}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{item.learnerName}</p>
                      <p className="break-all text-xs text-[#4d6570]">{item.learnerEmail}</p>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{item.scorePercent}%</td>
                    <td className="px-4 py-3 text-[#4d6570]">{formatDate(item.issuedAt)}</td>
                    <td className="px-4 py-3">
                      {item.examAttemptId ? (
                        <span className="rounded-full bg-[#E6F9F5] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide">
                          Exam
                        </span>
                      ) : (
                        <span className="rounded-full bg-[#f3f7f6] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#4d6570]">
                          Admin
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/learning/verify/${item.certificateCode}`}
                        className="font-semibold text-[#0B2C4A] underline-offset-2 hover:underline"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
