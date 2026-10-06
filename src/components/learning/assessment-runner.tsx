"use client";

import { useMemo, useState } from "react";

type Option = { id: string; label: string };
type Question = { id: string; type: string; prompt: string; options: Option[] };
type Review = Question & { correct: boolean; correctOptionIds: string[]; explanation: string };

type StartResponse = {
  error?: string;
  message?: string;
  attemptId?: string;
  questions?: Question[];
  passPercent?: number;
};

export function AssessmentRunner({
  startPath,
  submitPath,
  title,
  onPassedHref,
}: {
  startPath: string;
  submitPath: (attemptId: string) => string;
  title: string;
  onPassedHref: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [passPercent, setPassPercent] = useState(80);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState<{
    percentage: number;
    passed: boolean;
    correctCount: number;
    total: number;
    review: Review[];
    nextModuleUnlocked?: boolean;
  } | null>(null);

  const current = questions[index];
  const answered = useMemo(() => questions.filter((question) => (answers[question.id] ?? []).length > 0).length, [answers, questions]);

  async function begin() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch(startPath, { method: "POST" });
      const body = (await response.json()) as StartResponse;
      if (response.status === 401) {
        setError("Your session expired. Sign in again.");
        return;
      }
      if (!response.ok || body.error) {
        setError(body.message ?? "This assessment is not available yet.");
        return;
      }
      setAttemptId(body.attemptId ?? null);
      setQuestions(body.questions ?? []);
      setPassPercent(body.passPercent ?? 80);
      setAnswers({});
      setIndex(0);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function toggle(question: Question, optionId: string) {
    setAnswers((currentAnswers) => {
      const selected = currentAnswers[question.id] ?? [];
      const next =
        question.type === "multi"
          ? selected.includes(optionId)
            ? selected.filter((id) => id !== optionId)
            : [...selected, optionId]
          : [optionId];
      return { ...currentAnswers, [question.id]: next };
    });
  }

  async function submit() {
    if (!attemptId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(submitPath(attemptId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: questions.map((question) => ({ questionId: question.id, optionIds: answers[question.id] ?? [] })),
        }),
      });
      const body = await response.json();
      if (response.status === 401) {
        setError("Your session expired. Sign in again.");
        return;
      }
      if (!response.ok) {
        setError(body.message ?? "Submission failed.");
        return;
      }
      setResult(body);
    } catch {
      setError("Network error. Your answers were not confirmed. Try submitting again.");
    } finally {
      setLoading(false);
    }
  }

  if (!attemptId || !current) {
    return (
      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Passing score: {passPercent}%. Answers stay hidden until you submit.</p>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
        <button type="button" className="mt-4 rounded-lg bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white" onClick={begin} disabled={loading}>
          {loading ? "Starting…" : "Start"}
        </button>
      </section>
    );
  }

  if (result) {
    return (
      <section className="space-y-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
          <p className="text-sm font-semibold">{result.passed ? "Passed" : "Quiz not passed"}</p>
          <p className="mt-2 text-3xl font-semibold">
            {result.correctCount}/{result.total} · {result.percentage}%
          </p>
          <p className="mt-2 text-sm">
            {result.passed
              ? result.nextModuleUnlocked
                ? "The next module is now unlocked."
                : "This result meets the required score."
              : `Quiz not passed. You need ${passPercent}% to continue.`}
          </p>
          {result.passed ? (
            <a className="mt-4 inline-block rounded-lg bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white" href={onPassedHref}>
              Continue
            </a>
          ) : (
            <button type="button" className="mt-4 rounded-lg border px-4 py-2 text-sm font-semibold" onClick={begin}>
              Retry
            </button>
          )}
        </div>
        <ol className="space-y-3">
          {result.review.map((item, itemIndex) => (
            <li key={item.id} className="rounded-xl border border-[var(--border)] bg-white p-4">
              <p className="text-sm font-semibold">
                {itemIndex + 1}. {item.correct ? "Correct" : "Incorrect"} — {item.prompt}
              </p>
              <p className="mt-2 text-sm text-[var(--muted)]">{item.explanation}</p>
            </li>
          ))}
        </ol>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <p className="text-sm font-semibold">
          Question {index + 1} of {questions.length}
        </p>
        <div className="mt-2 h-2 rounded-full bg-slate-200" aria-hidden="true">
          <div className="h-2 rounded-full bg-slate-900" style={{ width: `${((index + 1) / questions.length) * 100}%` }} />
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">
          Answered {answered} of {questions.length}
        </p>
      </div>
      <fieldset className="rounded-xl border border-[var(--border)] bg-white p-5">
        <legend className="text-base font-semibold">{current.prompt}</legend>
        <div className="mt-4 space-y-2">
          {current.options.map((option) => {
            const selected = (answers[current.id] ?? []).includes(option.id);
            return (
              <label key={option.id} className="flex cursor-pointer gap-3 rounded-lg border border-[var(--border)] px-3 py-2">
                <input
                  type={current.type === "multi" ? "checkbox" : "radio"}
                  name={current.id}
                  checked={selected}
                  onChange={() => toggle(current, option.id)}
                />
                <span>{option.label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="rounded-lg border px-3 py-2 text-sm" onClick={() => setIndex((value) => Math.max(0, value - 1))} disabled={index === 0}>
          Previous
        </button>
        <button
          type="button"
          className="rounded-lg border px-3 py-2 text-sm"
          onClick={() => setIndex((value) => Math.min(questions.length - 1, value + 1))}
          disabled={index === questions.length - 1}
        >
          Next
        </button>
        <button type="button" className="rounded-lg bg-[var(--foreground)] px-3 py-2 text-sm font-semibold text-white" onClick={submit} disabled={loading || answered < questions.length}>
          {loading ? "Submitting…" : "Submit"}
        </button>
      </div>
    </section>
  );
}
