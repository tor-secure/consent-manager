"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { AdminLearnerRow } from "@/lib/learning/admin-service";

const PAGE_SIZE = 10;

function formatDate(value: Date | string | null) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function pageNumbers(current: number, total: number) {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  if (current <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }
  if (current >= total - 2) {
    pages.add(total - 1);
    pages.add(total - 2);
    pages.add(total - 3);
  }

  return [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);
}

export function LearnersTable({
  learners,
  moduleCount,
}: {
  learners: AdminLearnerRow[];
  moduleCount: number;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return learners;
    return learners.filter(
      (row) => row.email.toLowerCase().includes(q) || row.name.toLowerCase().includes(q),
    );
  }, [learners, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(filtered.length, safePage * PAGE_SIZE);
  const pages = pageNumbers(safePage, pageCount);

  useEffect(() => {
    setPage(1);
  }, [query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label className="block w-full max-w-md">
          <span className="text-sm font-semibold">Search learners</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name or email"
            className="mt-1.5 h-11 w-full rounded-xl border border-[#D1D5DB] px-3 text-sm outline-none focus:border-[#0B2C4A] focus:ring-2 focus:ring-[#0B2C4A]/15"
          />
        </label>
        <p className="text-sm text-[#4d6570]">
          {filtered.length === 0 ? (
            <>No learners</>
          ) : (
            <>
              Showing <strong className="text-[#0B2C4A]">{rangeStart}-{rangeEnd}</strong> of{" "}
              {filtered.length}
            </>
          )}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#e4eeec] bg-white shadow-[0_14px_36px_-30px_rgba(11,44,74,0.35)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-[#f7fbfa] text-[11px] font-bold uppercase tracking-[0.12em] text-[#4d6570]">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Progress</th>
                <th className="px-4 py-3">Exam</th>
                <th className="px-4 py-3">Certificate</th>
                <th className="px-4 py-3">Last active</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-[#4d6570]">
                    No learners match this search.
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => {
                  const percent = Math.round((row.modulesPassed / Math.max(moduleCount, 1)) * 100);
                  return (
                    <tr key={row.id} className="border-t border-[#eef4f3] align-middle">
                      <td className="px-4 py-3 font-semibold text-[#0B2C4A]">{row.name}</td>
                      <td className="px-4 py-3 text-[#4d6570]">{row.email}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold tabular-nums text-[#0B2C4A]">
                          {row.modulesPassed}/{moduleCount}{" "}
                          <span className="font-normal text-[#4d6570]">({percent}%)</span>
                        </p>
                        <div className="mt-1.5 h-1.5 w-28 overflow-hidden rounded-full bg-[#e6eef0]">
                          <div
                            className="h-full rounded-full bg-[#00C4A7]"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {row.examPassed ? (
                          <span className="font-semibold text-[#065f52]">
                            Passed{row.examPercentage != null ? ` · ${row.examPercentage}%` : ""}
                          </span>
                        ) : row.examPercentage != null ? (
                          <span className="text-[#4d6570]">Attempted · {row.examPercentage}%</span>
                        ) : (
                          <span className="text-[#8aa0a8]">Not taken</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {row.certificateCode ? (
                          <Link
                            href={`/learning/verify/${row.certificateCode}`}
                            className="font-mono text-xs font-semibold text-[#0B2C4A] underline-offset-2 hover:underline"
                          >
                            {row.certificateCode}
                          </Link>
                        ) : (
                          <span className="text-[#8aa0a8]">None</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[#4d6570]">
                        {formatDate(row.lastAccessedAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-[#eef4f3] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[#4d6570]">
            Page <strong className="text-[#0B2C4A]">{safePage}</strong> of {pageCount}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={safePage <= 1}
              className="inline-flex h-9 items-center rounded-lg border border-[#d5e3e0] px-3 text-sm font-semibold text-[#0B2C4A] hover:border-[#0B2C4A] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Prev
            </button>
            {pages.map((pageNumber, index) => {
              const previous = pages[index - 1];
              const showEllipsis = previous != null && pageNumber - previous > 1;
              return (
                <span key={pageNumber} className="contents">
                  {showEllipsis ? (
                    <span className="px-1 text-sm text-[#8aa0a8]" aria-hidden="true">
                      …
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setPage(pageNumber)}
                    aria-current={pageNumber === safePage ? "page" : undefined}
                    className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2.5 text-sm font-semibold ${
                      pageNumber === safePage
                        ? "bg-[#0B2C4A] text-white"
                        : "border border-[#d5e3e0] text-[#0B2C4A] hover:border-[#0B2C4A]"
                    }`}
                  >
                    {pageNumber}
                  </button>
                </span>
              );
            })}
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
              disabled={safePage >= pageCount}
              className="inline-flex h-9 items-center rounded-lg border border-[#d5e3e0] px-3 text-sm font-semibold text-[#0B2C4A] hover:border-[#0B2C4A] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
