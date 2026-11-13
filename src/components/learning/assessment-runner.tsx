"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { BrandLogo } from "@/components/brand/brand-logo";
import { ProgressBar } from "@/components/learning/progress-bar";
import { StatusIcon } from "@/components/learning/status-icon";
import { primaryBtn, secondaryBtn } from "@/components/learning/ui";
import { ShieldLoader } from "@/components/ui/shield-loader";
import { takePreloadedQuizStart } from "@/lib/learning/quiz-start-cache";

type Option = { id: string; label: string };
type Question = { id: string; type: string; prompt: string; options: Option[] };
type Review = Question & { correct: boolean; correctOptionIds: string[]; explanation: string };

type StartResponse = {
  error?: string;
  message?: string;
  attemptId?: string;
  questions?: Question[];
  passPercent?: number;
  questionCount?: number;
  startedAt?: string;
  durationSeconds?: number;
};

type Result = {
  percentage: number;
  passed: boolean;
  correctCount: number;
  total: number;
  review: Review[];
  nextModuleUnlocked?: boolean;
};

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-2">
      <path d={direction === "left" ? "M12.5 4.5 7 10l5.5 5.5" : "M7.5 4.5 13 10l-5.5 5.5"} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FlagIcon({ filled }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={`h-4 w-4 ${filled ? "fill-current" : "fill-none"} stroke-current stroke-[1.6]`}>
      <path d="M4.5 3.5v13M4.5 3.5h8.5l-1.8 3.2 1.8 3.3H4.5" strokeLinejoin="round" />
    </svg>
  );
}

function formatClock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function TimerRing({ remainingMs, totalMs }: { remainingMs: number; totalMs: number }) {
  const low = remainingMs <= 5 * 60 * 1000;
  const critical = remainingMs <= 60 * 1000;
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const ratio = totalMs > 0 ? Math.min(1, Math.max(0, remainingMs / totalMs)) : 0;
  const offset = circumference - ratio * circumference;
  const stroke = critical ? "#c62828" : low ? "#c9a227" : "#00C4A7";

  return (
    <div className="inline-flex items-center gap-2.5" aria-live="polite">
      <div className="relative h-10 w-10" aria-hidden="true">
        <svg viewBox="0 0 40 40" className="h-full w-full -rotate-90">
          <circle cx="20" cy="20" r={radius} fill="none" stroke="#e6eef0" strokeWidth="3.5" />
          <circle
            cx="20"
            cy="20"
            r={radius}
            fill="none"
            stroke={stroke}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="motion-safe:transition-[stroke-dashoffset] motion-safe:duration-1000"
          />
        </svg>
      </div>
      <p className={`text-sm font-bold tabular-nums ${critical ? "text-[#c62828]" : low ? "text-[#8a6a12]" : "text-[#0B2C4A]"}`}>
        <span className="sr-only">Time remaining </span>
        {remainingMs <= 0 ? "Time is up" : formatClock(remainingMs)}
      </p>
    </div>
  );
}

function ScoreRing({ value, passed }: { value: number; passed: boolean }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(100, Math.max(0, value));
  const offset = circumference - (pct / 100) * circumference;
  return (
    <div className="relative mx-auto h-28 w-28" aria-hidden="true">
      <svg viewBox="0 0 88 88" className="h-full w-full -rotate-90">
        <circle cx="44" cy="44" r={radius} fill="none" stroke="#e6eef0" strokeWidth="8" />
        <circle
          cx="44"
          cy="44"
          r={radius}
          fill="none"
          stroke={passed ? "#00C4A7" : "#c62828"}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="motion-safe:transition-[stroke-dashoffset] motion-safe:duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tabular-nums text-[#0B2C4A]">{Math.round(pct)}%</span>
      </div>
    </div>
  );
}

function examAnswerKey(attemptId: string) {
  return `cg-exam-answers:${attemptId}`;
}

function readStoredExam(raw: string): { answers: Record<string, string[]>; index: number; flagged: string[] } | null {
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const record = parsed as Record<string, unknown>;
  const source =
    record.answers && typeof record.answers === "object" && !Array.isArray(record.answers)
      ? (record.answers as Record<string, unknown>)
      : record;
  const answers: Record<string, string[]> = {};
  for (const [questionId, optionIds] of Object.entries(source)) {
    if (questionId === "answers" || questionId === "index" || questionId === "flagged") continue;
    if (Array.isArray(optionIds) && optionIds.every((id) => typeof id === "string")) answers[questionId] = optionIds;
  }
  const index = typeof record.index === "number" && Number.isInteger(record.index) && record.index >= 0 ? record.index : 0;
  const flagged = Array.isArray(record.flagged) ? record.flagged.filter((id): id is string => typeof id === "string") : [];
  return { answers, index, flagged };
}

function ErrorBox({ message, onRetry, retryLabel }: { message: string; onRetry?: () => void; retryLabel?: string }) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between"
    >
      <p>{message}</p>
      {onRetry ? (
        <button
          type="button"
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-red-300 bg-white px-3 font-semibold text-red-800 hover:bg-red-100"
          onClick={onRetry}
        >
          {retryLabel ?? "Try again"}
        </button>
      ) : null}
    </div>
  );
}

function QuestionJump({
  questions,
  answers,
  flagged,
  index,
  onJump,
  filter,
  className,
}: {
  questions: Question[];
  answers: Record<string, string[]>;
  flagged: Set<string>;
  index: number;
  onJump: (questionIndex: number) => void;
  filter: "all" | "unanswered" | "flagged";
  className: string;
}) {
  return (
    <ol aria-label="Jump to question" className={className}>
      {questions.map((question, questionIndex) => {
        const done = (answers[question.id] ?? []).length > 0;
        const isFlagged = flagged.has(question.id);
        if (filter === "unanswered" && done) return null;
        if (filter === "flagged" && !isFlagged) return null;
        const active = questionIndex === index;
        return (
          <li key={question.id}>
            <button
              type="button"
              onClick={() => onJump(questionIndex)}
              aria-label={`Question ${questionIndex + 1}${done ? ", answered" : ", not answered"}${isFlagged ? ", flagged" : ""}`}
              aria-current={active ? "step" : undefined}
              className={`relative inline-flex h-9 w-full items-center justify-center rounded-xl border text-xs font-semibold tabular-nums motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00C4A7] ${
                active
                  ? "border-[#0B2C4A] bg-[#0B2C4A] text-white"
                  : done
                    ? "border-[#bfe9e0] bg-[#E6F9F5] text-[#0B2C4A]"
                    : "border-[#d5e3e0] bg-white text-[#4d6570] hover:border-[#0B2C4A]"
              }`}
            >
              {questionIndex + 1}
              {isFlagged ? <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[#c9a227]" aria-hidden="true" /> : null}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function ConfirmSubmitDialog({
  unanswered,
  flaggedCount,
  onCancel,
  onConfirm,
  submitting,
}: {
  unanswered: number;
  flaggedCount: number;
  onCancel: () => void;
  onConfirm: () => void;
  submitting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0B2C4A]/45 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="confirm-submit-title">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
        <h2 id="confirm-submit-title" className="text-lg font-semibold text-[#0B2C4A]">
          Submit answers?
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#36505c]">
          {unanswered > 0
            ? `You still have ${unanswered} unanswered question${unanswered === 1 ? "" : "s"}.`
            : "All questions are answered."}
          {flaggedCount > 0
            ? ` ${flaggedCount} question${flaggedCount === 1 ? " is" : "s are"} flagged for review.`
            : ""}
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className={secondaryBtn} onClick={onCancel} disabled={submitting}>
            Keep reviewing
          </button>
          <button type="button" className={primaryBtn} onClick={onConfirm} disabled={submitting} aria-busy={submitting}>
            {submitting ? (
              <>
                <ShieldLoader />
                Submitting…
              </>
            ) : (
              "Submit now"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AssessmentRunner({
  startPath,
  submitBasePath,
  title,
  onPassedHref,
  passedLabel = "Continue",
  intro,
  questionCount,
  defaultPassPercent = 60,
  autoStart = false,
  preloadSlug,
  timeLimitSeconds,
}: {
  startPath: string;
  submitBasePath: string;
  title: string;
  onPassedHref: string;
  passedLabel?: string;
  intro?: string;
  questionCount?: number;
  defaultPassPercent?: number;
  autoStart?: boolean;
  preloadSlug?: string;
  timeLimitSeconds?: number;
}) {
  const requireFocus = Boolean(timeLimitSeconds);
  const [loading, setLoading] = useState<"start" | "submit" | null>(null);
  const [error, setError] = useState<{ message: string; action: "start" | "submit" } | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [passPercent, setPassPercent] = useState(defaultPassPercent);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [flagged, setFlagged] = useState<Set<string>>(() => new Set());
  const [result, setResult] = useState<Result | null>(null);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [endedByTime, setEndedByTime] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [jumpOpen, setJumpOpen] = useState(false);
  const [jumpFilter, setJumpFilter] = useState<"all" | "unanswered" | "flagged">("all");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState<Record<string, boolean>>({});

  const resultHeading = useRef<HTMLHeadingElement>(null);
  const questionHeading = useRef<HTMLHeadingElement>(null);
  const autoStarted = useRef(false);
  const advanceTimer = useRef<number | null>(null);
  const submitting = useRef(false);
  const lastForceFail = useRef(0);
  const submitRef = useRef<(force?: boolean) => void>(() => undefined);
  const shellRef = useRef<HTMLDivElement>(null);
  const totalLimitMs = (timeLimitSeconds ?? 0) * 1000;

  const current = questions[index];
  const answered = useMemo(() => questions.filter((question) => (answers[question.id] ?? []).length > 0).length, [answers, questions]);
  const remaining = questions.length - answered;
  const flaggedCount = flagged.size;

  useEffect(() => {
    if (result) resultHeading.current?.focus();
  }, [result]);

  useEffect(() => {
    function onFullscreenChange() {
      setFullscreen(document.fullscreenElement === shellRef.current);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    if (!result || !document.fullscreenElement) return;
    void document.exitFullscreen().catch(() => undefined);
  }, [result]);

  function enterFullscreen() {
    const node = shellRef.current;
    if (!node || document.fullscreenElement === node) return;
    void node.requestFullscreen().catch(() => setFullscreen(false));
  }

  async function begin() {
    setLoading("start");
    setError(null);
    setResult(null);
    setAnswers({});
    setFlagged(new Set());
    setQuestions([]);
    setAttemptId(null);
    setIndex(0);
    setDeadline(null);
    setRemainingMs(null);
    setEndedByTime(false);
    setConfirmOpen(false);
    setJumpOpen(false);
    lastForceFail.current = 0;
    try {
      const response = await fetch(startPath, { method: "POST" });
      const body = (await response.json()) as StartResponse;
      if (response.status === 401) {
        setError({ message: "Your session expired. Sign in again.", action: "start" });
        return;
      }
      if (!response.ok || body.error) {
        setError({ message: body.message ?? "This assessment is not available yet.", action: "start" });
        return;
      }
      setAttemptId(body.attemptId ?? null);
      setQuestions(body.questions ?? []);
      setPassPercent(body.passPercent ?? defaultPassPercent);
      setAnswers({});
      setIndex(0);
      const started = body.startedAt ? Date.parse(body.startedAt) : Number.NaN;
      const seconds = body.durationSeconds ?? timeLimitSeconds;
      if (Number.isFinite(started) && seconds && seconds > 0) {
        setDeadline(started + seconds * 1000);
      } else {
        setDeadline(null);
      }
    } catch {
      setError({ message: "Network error. Check your connection and try again.", action: "start" });
    } finally {
      setLoading(null);
    }
  }

  function startAssessment() {
    if (requireFocus) enterFullscreen();
    void begin();
  }

  useEffect(() => {
    if (!autoStart || autoStarted.current) return;
    autoStarted.current = true;
    if (preloadSlug) {
      const preloaded = takePreloadedQuizStart(preloadSlug);
      if (preloaded) {
        setAttemptId(preloaded.attemptId);
        setQuestions(preloaded.questions);
        setPassPercent(preloaded.passPercent ?? defaultPassPercent);
        setAnswers({});
        setIndex(0);
        setLoading(null);
        return;
      }
    }
    void begin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, preloadSlug]);

  const goTo = useCallback(
    (nextIndex: number) => {
      if (advanceTimer.current) {
        window.clearTimeout(advanceTimer.current);
        advanceTimer.current = null;
      }
      setIndex(Math.min(questions.length - 1, Math.max(0, nextIndex)));
      setJumpOpen(false);
      requestAnimationFrame(() => questionHeading.current?.focus());
    },
    [questions.length],
  );

  const toggle = useCallback(
    (question: Question, optionId: string) => {
      const single = question.type !== "multi";
      setAnswers((currentAnswers) => {
        const selected = currentAnswers[question.id] ?? [];
        const next = single
          ? [optionId]
          : selected.includes(optionId)
            ? selected.filter((id) => id !== optionId)
            : [...selected, optionId];
        return { ...currentAnswers, [question.id]: next };
      });
      if (!single) return;
      const questionIndex = questions.findIndex((item) => item.id === question.id);
      if (questionIndex < 0 || questionIndex >= questions.length - 1) return;
      if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
      advanceTimer.current = window.setTimeout(() => goTo(questionIndex + 1), 320);
    },
    [goTo, questions],
  );

  function toggleFlag(questionId: string) {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  }

  useEffect(() => {
    return () => {
      if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    };
  }, []);

  async function submit(force = false) {
    if (!attemptId || submitting.current) return;
    if (!force && remaining > 0 && !confirmOpen) {
      setConfirmOpen(true);
      return;
    }
    if (force && Date.now() - lastForceFail.current < 3000) return;
    submitting.current = true;
    if (advanceTimer.current) {
      window.clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
    setLoading("submit");
    setError(null);
    setConfirmOpen(false);
    try {
      const response = await fetch(`${submitBasePath}/${encodeURIComponent(attemptId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: questions.map((question) => ({ questionId: question.id, optionIds: answers[question.id] ?? [] })),
        }),
      });
      const body = (await response.json().catch(() => null)) as (Result & { message?: string }) | null;
      if (response.status === 401) {
        if (force) lastForceFail.current = Date.now();
        setError({ message: "Your session expired. Sign in again. Your answers were not submitted.", action: "submit" });
        return;
      }
      if (body && typeof body.percentage === "number" && Array.isArray(body.review)) {
        if (force) setEndedByTime(true);
        if (attemptId) sessionStorage.removeItem(examAnswerKey(attemptId));
        const open: Record<string, boolean> = {};
        for (const item of body.review) {
          if (!item.correct) open[item.id] = true;
        }
        setReviewOpen(open);
        setResult(body);
        return;
      }
      if (force) lastForceFail.current = Date.now();
      setError({ message: body?.message ?? "Submission failed. Your answers are still here.", action: "submit" });
    } catch {
      if (force) lastForceFail.current = Date.now();
      setError({ message: "Network error. Your answers were not confirmed. Try submitting again.", action: "submit" });
    } finally {
      submitting.current = false;
      setLoading(null);
    }
  }

  submitRef.current = (force?: boolean) => {
    void submit(Boolean(force));
  };

  useEffect(() => {
    if (!deadline || result) {
      setRemainingMs(null);
      return;
    }
    const endsAt = deadline;
    function tick() {
      const left = endsAt - Date.now();
      setRemainingMs(Math.max(0, left));
      if (left <= 0) submitRef.current(true);
    }
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [deadline, result]);

  useEffect(() => {
    if (!attemptId || !deadline) return;
    try {
      const raw = sessionStorage.getItem(examAnswerKey(attemptId));
      if (!raw) return;
      const stored = readStoredExam(raw);
      if (!stored) return;
      if (Object.keys(stored.answers).length > 0) setAnswers(stored.answers);
      if (stored.flagged.length > 0) setFlagged(new Set(stored.flagged));
      if (stored.index > 0 && questions.length > 0) setIndex(Math.min(stored.index, questions.length - 1));
    } catch {
      // optional draft
    }
  }, [attemptId, deadline, questions.length]);

  useEffect(() => {
    if (!attemptId || !deadline) return;
    if (Object.keys(answers).length === 0 && flagged.size === 0) return;
    sessionStorage.setItem(
      examAnswerKey(attemptId),
      JSON.stringify({ answers, index, flagged: Array.from(flagged) }),
    );
  }, [answers, attemptId, deadline, flagged, index]);

  useEffect(() => {
    const taking = Boolean(attemptId && current && !result);
    const blocked = requireFocus && !fullscreen;
    if (!taking || blocked || confirmOpen || !current) return;

    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goTo(index - 1);
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goTo(index + 1);
        return;
      }
      if ((event.key === "f" || event.key === "F") && current) {
        event.preventDefault();
        setFlagged((prev) => {
          const next = new Set(prev);
          if (next.has(current.id)) next.delete(current.id);
          else next.add(current.id);
          return next;
        });
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        if (index >= questions.length - 1) setConfirmOpen(true);
        else goTo(index + 1);
        return;
      }
      const letterIndex = OPTION_LETTERS.indexOf(event.key.toUpperCase() as (typeof OPTION_LETTERS)[number]);
      const digitIndex = Number.parseInt(event.key, 10) - 1;
      const pick = letterIndex >= 0 ? letterIndex : digitIndex;
      if (pick >= 0 && current.options[pick]) {
        event.preventDefault();
        toggle(current, current.options[pick].id);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [attemptId, confirmOpen, current, fullscreen, goTo, index, questions.length, requireFocus, result, toggle]);

  function retrySubmit() {
    void submit(deadline !== null && Date.now() >= deadline);
  }

  function requestSubmit() {
    if (remaining > 0 || flaggedCount > 0) {
      setConfirmOpen(true);
      return;
    }
    void submit(false);
  }

  const takingOpen = Boolean(attemptId && current && !result);
  const focusBlocked = requireFocus && takingOpen && !fullscreen;

  let view: ReactNode;

  if (result) {
    const incorrectFirst = [...result.review].sort((a, b) => Number(a.correct) - Number(b.correct));
    view = (
      <section className="space-y-5" aria-labelledby="assessment-result">
        <div className="overflow-hidden rounded-[1.5rem] bg-white shadow-[0_20px_50px_-40px_rgba(11,44,74,0.45)] ring-1 ring-[#e4eeec]">
          <div
            className={`px-6 py-6 sm:px-8 ${
              result.passed
                ? "bg-[linear-gradient(135deg,#E6F9F5_0%,#ffffff_55%)]"
                : "bg-[linear-gradient(135deg,#fdecea_0%,#ffffff_55%)]"
            }`}
          >
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
              <ScoreRing value={result.percentage} passed={result.passed} />
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center gap-2 sm:justify-start">
                  <StatusIcon status={result.passed ? "completed" : "in_progress"} size={28} />
                  <h2 id="assessment-result" ref={resultHeading} tabIndex={-1} className="text-xl font-semibold text-[#0B2C4A] focus:outline-none">
                    {result.passed ? "Passed" : "Not passed yet"}
                  </h2>
                </div>
                <p className="mt-2 text-sm leading-6 text-[#4d6570]">
                  {endedByTime ? "Time ran out, so the exam was submitted with the answers you had given. " : null}
                  {result.passed
                    ? result.nextModuleUnlocked
                      ? "Well done. The next module is now unlocked."
                      : "Well done. This result meets the required score."
                    : `You need ${passPercent}% to pass. Review the explanations below, then try again.`}
                </p>
                <p className="mt-2 text-sm font-semibold text-[#0B2C4A]">
                  {result.correctCount} of {result.total} correct · pass mark {passPercent}%
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
              {result.passed ? (
                <a className={primaryBtn} href={onPassedHref}>
                  {passedLabel}
                </a>
              ) : (
                <button type="button" className={primaryBtn} onClick={startAssessment} disabled={loading !== null}>
                  {loading === "start" ? (
                    <>
                      <ShieldLoader />
                      Starting…
                    </>
                  ) : (
                    "Retry"
                  )}
                </button>
              )}
              <a className={secondaryBtn} href="/e-learning">
                Back to course
              </a>
            </div>
            {error ? (
              <div className="mt-4">
                <ErrorBox message={error.message} />
              </div>
            ) : null}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-[#0B2C4A]">Answer review</h3>
          <p className="mt-1 text-sm text-[#4d6570]">Incorrect answers are opened first. Expand any item for detail.</p>
        </div>
        <ol className="space-y-2">
          {incorrectFirst.map((item, itemIndex) => {
            const chosen = new Set(answers[item.id] ?? []);
            const correctIds = new Set(item.correctOptionIds);
            const open = reviewOpen[item.id] ?? false;
            const originalIndex = result.review.findIndex((row) => row.id === item.id);
            return (
              <li key={item.id} className="overflow-hidden rounded-2xl bg-white ring-1 ring-[#e4eeec]">
                <button
                  type="button"
                  className="flex w-full items-start gap-3 px-4 py-3.5 text-left hover:bg-[#f7fbfa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00C4A7]"
                  aria-expanded={open}
                  onClick={() => setReviewOpen((prev) => ({ ...prev, [item.id]: !open }))}
                >
                  <span
                    className={`mt-0.5 inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-xs font-semibold ${
                      item.correct ? "bg-[#E6F9F5] text-[#065f52]" : "bg-red-50 text-red-800"
                    }`}
                  >
                    {item.correct ? "Correct" : "Incorrect"}
                  </span>
                  <span className="min-w-0 flex-1 text-[15px] font-semibold leading-6 text-[#0B2C4A]">
                    {originalIndex + 1}. {item.prompt}
                  </span>
                  <svg
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                    className={`mt-1 h-4 w-4 shrink-0 fill-none stroke-current stroke-2 motion-safe:transition-transform ${open ? "rotate-180" : ""}`}
                  >
                    <path d="M5 7.5 10 12.5 15 7.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {open ? (
                  <div className="border-t border-[#eef4f3] px-4 py-4">
                    <ul className="space-y-1.5">
                      {item.options.map((option) => {
                        const isCorrect = correctIds.has(option.id);
                        const isChosen = chosen.has(option.id);
                        if (!isCorrect && !isChosen) return null;
                        return (
                          <li
                            key={option.id}
                            className={`flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                              isCorrect ? "border-[#bfe9e0] bg-[#E6F9F5] text-[#0B2C4A]" : "border-red-200 bg-red-50 text-red-900"
                            }`}
                          >
                            <span className="font-semibold">
                              {isCorrect ? (isChosen ? "Your answer · correct" : "Correct answer") : "Your answer"}
                            </span>
                            <span>{option.label}</span>
                          </li>
                        );
                      })}
                    </ul>
                    {item.explanation ? <p className="mt-3 text-justify text-sm leading-6 text-[#36505c]">{item.explanation}</p> : null}
                    <p className="sr-only">Review item {itemIndex + 1}</p>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      </section>
    );
  } else if (!attemptId || !current) {
    if (autoStart && !error) {
      view = (
        <section className="rounded-[1.5rem] bg-white p-6 ring-1 ring-[#e4eeec] sm:p-8" aria-live="polite">
          <h2 className="text-xl font-semibold text-[#0B2C4A]">{loading ? "Loading a new quiz…" : title}</h2>
          <p className="mt-2 text-sm text-[#4d6570]">The questions open as soon as the lesson is marked complete.</p>
        </section>
      );
    } else {
      view = (
        <section className="overflow-hidden rounded-[1.5rem] bg-white shadow-[0_20px_50px_-40px_rgba(11,44,74,0.4)] ring-1 ring-[#e4eeec]" aria-labelledby="assessment-start">
          <div className="border-b border-[#eef4f3] bg-[linear-gradient(120deg,#E6F9F5_0%,#ffffff_50%,#f7fbfa_100%)] px-6 py-6 sm:px-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#00A88F]">
              {requireFocus ? "Final examination" : "Module quiz"}
            </p>
            <h2 id="assessment-start" className="mt-2 text-2xl font-semibold text-[#0B2C4A]">
              {title}
            </h2>
            {intro ? <p className="mt-2 max-w-2xl text-justify text-base leading-7 text-[#36505c]">{intro}</p> : null}
          </div>
          <div className="px-6 py-6 sm:px-8">
            <ul className="grid gap-3 sm:grid-cols-2">
              {[
                questionCount ? { label: "Questions", value: String(questionCount) } : null,
                { label: "Pass mark", value: `${passPercent}%` },
                timeLimitSeconds
                  ? { label: "Time limit", value: `${Math.round(timeLimitSeconds / 60)} min` }
                  : { label: "Format", value: "One question at a time" },
                requireFocus
                  ? { label: "Focus mode", value: "Fullscreen while answering" }
                  : { label: "Focus", value: "Optional — stay on this page" },
              ]
                .filter((item): item is { label: string; value: string } => Boolean(item))
                .map((item) => (
                  <li key={item.label} className="rounded-2xl bg-[#f7fbfa] px-4 py-3 ring-1 ring-[#e4eeec]">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#4d6570]">{item.label}</p>
                    <p className="mt-1 text-sm font-semibold text-[#0B2C4A]">{item.value}</p>
                  </li>
                ))}
            </ul>
            <p className="mt-4 text-xs leading-5 text-[#4d6570]">
              Shortcuts once started: ← → navigate · 1–4 / A–D select · F flag · Enter next
            </p>
            {error ? (
              <div className="mt-4">
                <ErrorBox message={error.message} onRetry={startAssessment} />
              </div>
            ) : null}
            <button
              type="button"
              className={`${primaryBtn} mt-6 w-full sm:w-auto`}
              onClick={startAssessment}
              disabled={loading !== null}
              aria-busy={loading !== null}
            >
              {loading === "start" ? (
                <>
                  <ShieldLoader />
                  Starting…
                </>
              ) : requireFocus ? (
                "Start exam"
              ) : (
                "Start quiz"
              )}
            </button>
          </div>
        </section>
      );
    }
  } else if (focusBlocked) {
    view = (
      <section className="rounded-[1.5rem] bg-white p-6 ring-1 ring-[#e4eeec] sm:p-8" aria-labelledby="focus-required">
        <h2 id="focus-required" className="text-xl font-semibold text-[#0B2C4A]">
          Return to focus mode
        </h2>
        <p className="mt-2 max-w-2xl text-justify text-base leading-7 text-[#36505c]">
          The exam stays hidden until it fills the screen. Your answers are kept. Press Escape or leave this tab and you will need to return here before you can continue.
        </p>
        {remainingMs !== null ? (
          <div className="mt-4">
            <TimerRing remainingMs={remainingMs} totalMs={totalLimitMs} />
          </div>
        ) : null}
        {loading === "submit" ? <p className="mt-4 text-sm font-semibold text-[#0B2C4A]">Submitting your answers…</p> : null}
        {error ? (
          <div className="mt-4">
            <ErrorBox
              message={error.message}
              onRetry={error.action === "submit" ? retrySubmit : enterFullscreen}
              retryLabel={error.action === "submit" ? "Submit again" : undefined}
            />
          </div>
        ) : null}
        <button type="button" className={`${primaryBtn} mt-6`} onClick={enterFullscreen} disabled={loading !== null}>
          {answered > 0 ? "Return to exam" : "Enter focus mode"}
        </button>
      </section>
    );
  } else {
    const selected = answers[current.id] ?? [];
    const multi = current.type === "multi";
    const last = index === questions.length - 1;
    const isFlagged = flagged.has(current.id);
    const progressPct = questions.length ? (answered / questions.length) * 100 : 0;

    const optionList = (
      <div className="mt-4 space-y-2.5">
        {current.options.map((option, optionIndex) => {
          const isSelected = selected.includes(option.id);
          const letter = OPTION_LETTERS[optionIndex] ?? String(optionIndex + 1);
          return (
            <label
              key={option.id}
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3.5 text-[15px] leading-6 motion-safe:transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#00C4A7] ${
                isSelected
                  ? "border-[#0B2C4A] bg-[#E6F9F5] text-[#0B2C4A] shadow-[0_0_0_1px_#0B2C4A]"
                  : "border-[#d5e3e0] bg-white text-[#0B2C4A] hover:border-[#0B2C4A]/45"
              }`}
            >
              <input
                type={multi ? "checkbox" : "radio"}
                name={current.id}
                checked={isSelected}
                onChange={() => toggle(current, option.id)}
                className="sr-only"
              />
              <span
                className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                  isSelected ? "bg-[#0B2C4A] text-white" : "bg-[#f3f8f7] text-[#4d6570]"
                }`}
              >
                {letter}
              </span>
              <span className="min-w-0 flex-1 whitespace-normal break-words pt-0.5">{option.label}</span>
            </label>
          );
        })}
      </div>
    );

    const toolbar = (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#0B2C4A]">
            Question {index + 1} of {questions.length}
          </p>
          <p className="text-xs text-[#4d6570]" aria-live="polite">
            {answered} answered · {remaining} left
            {flaggedCount > 0 ? ` · ${flaggedCount} flagged` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {remainingMs !== null ? <TimerRing remainingMs={remainingMs} totalMs={totalLimitMs} /> : null}
          <button
            type="button"
            onClick={() => toggleFlag(current.id)}
            className={`inline-flex h-10 items-center gap-1.5 rounded-xl border px-3 text-sm font-semibold motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00C4A7] ${
              isFlagged
                ? "border-[#c9a227]/55 bg-[#fff8e8] text-[#8a6a12]"
                : "border-[#d5e3e0] bg-white text-[#4d6570] hover:border-[#0B2C4A]"
            }`}
            aria-pressed={isFlagged}
          >
            <FlagIcon filled={isFlagged} />
            {isFlagged ? "Flagged" : "Flag"}
          </button>
          <button
            type="button"
            className="inline-flex h-10 items-center rounded-xl border border-[#d5e3e0] bg-white px-3 text-sm font-semibold text-[#0B2C4A] hover:border-[#0B2C4A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00C4A7] lg:hidden"
            onClick={() => setJumpOpen(true)}
          >
            Jump
          </button>
        </div>
      </div>
    );

    const navigation = (
      <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-[#e4eeec] bg-white/95 px-4 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex gap-2">
          <button type="button" className={secondaryBtn} onClick={() => goTo(index - 1)} disabled={index === 0}>
            <ArrowIcon direction="left" />
            Previous
          </button>
          <button type="button" className={secondaryBtn} onClick={() => goTo(index + 1)} disabled={last}>
            Next
            <ArrowIcon direction="right" />
          </button>
        </div>
        <div className="flex flex-col items-stretch gap-1 sm:items-end">
          <button
            type="button"
            className={primaryBtn}
            onClick={requestSubmit}
            disabled={loading !== null}
            aria-busy={loading === "submit"}
          >
            {loading === "submit" ? (
              <>
                <ShieldLoader />
                Submitting…
              </>
            ) : (
              "Submit answers"
            )}
          </button>
          <p className="text-xs text-[#4d6570]">
            {remaining > 0
              ? `Answer ${remaining} more question${remaining === 1 ? "" : "s"} — or submit with gaps.`
              : flaggedCount > 0
                ? "All answered. Review flagged items if you want."
                : "All questions answered."}
          </p>
        </div>
      </div>
    );

    const jumpPanel = (
      <div className="flex h-full min-h-0 flex-col">
        <div className="space-y-2 border-b border-[#eef4f3] px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#4d6570]">Questions</p>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ["all", "All"],
                ["unanswered", "Open"],
                ["flagged", "Flagged"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setJumpFilter(value)}
                aria-pressed={jumpFilter === value}
                className={`inline-flex h-8 items-center rounded-lg px-2.5 text-xs font-semibold ${
                  jumpFilter === value ? "bg-[#0B2C4A] text-white" : "bg-[#f3f8f7] text-[#4d6570]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <ProgressBar value={progressPct} label="Questions answered" size="sm" showValue={false} />
        </div>
        <QuestionJump
          questions={questions}
          answers={answers}
          flagged={flagged}
          index={index}
          onJump={goTo}
          filter={jumpFilter}
          className="grid flex-1 grid-cols-5 content-start gap-1.5 overflow-y-auto p-3"
        />
      </div>
    );

    view = (
      <section className="overflow-hidden rounded-[1.5rem] bg-[#f7fbfa] ring-1 ring-[#e4eeec]" aria-label={title}>
        <div className="border-b border-[#e4eeec] bg-white px-4 py-3 sm:px-5">{toolbar}</div>
        <div className="flex min-h-[28rem] flex-col lg:flex-row">
          <aside className="hidden w-64 shrink-0 border-r border-[#e4eeec] bg-white lg:block">{jumpPanel}</aside>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex-1 px-4 py-5 sm:px-6">
              <div className="mx-auto w-full max-w-3xl">
                <p className="text-sm text-[#4d6570]">
                  {multi ? "Select all that apply." : "Select one answer. The next question opens on its own."}
                </p>
                <h2
                  ref={questionHeading}
                  tabIndex={-1}
                  className="mt-2 text-lg font-semibold leading-7 text-[#0B2C4A] focus:outline-none sm:text-xl"
                >
                  {current.prompt}
                </h2>
                {optionList}
                {error ? (
                  <div className="mt-4">
                    <ErrorBox
                      message={error.message}
                      onRetry={error.action === "submit" ? retrySubmit : startAssessment}
                      retryLabel={error.action === "submit" ? "Submit again" : undefined}
                    />
                  </div>
                ) : null}
              </div>
            </div>
            {navigation}
          </div>
        </div>

        {jumpOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Jump to question">
            <button type="button" className="absolute inset-0 bg-[#0B2C4A]/40" aria-label="Close" onClick={() => setJumpOpen(false)} />
            <div className="absolute inset-x-0 bottom-0 max-h-[75vh] overflow-hidden rounded-t-3xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#eef4f3] px-4 py-3">
                <p className="text-sm font-semibold text-[#0B2C4A]">Jump to question</p>
                <button type="button" className={secondaryBtn} onClick={() => setJumpOpen(false)}>
                  Close
                </button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto">{jumpPanel}</div>
            </div>
          </div>
        ) : null}
      </section>
    );
  }

  const shellActive = requireFocus && fullscreen;

  return (
    <div
      ref={shellRef}
      className={shellActive ? "flex h-full flex-col overflow-hidden bg-[#f3f7f6] text-[#0B2C4A]" : undefined}
    >
      {shellActive ? (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#e4eeec] bg-white px-4 py-3 sm:px-6">
          <BrandLogo height={32} />
          {remainingMs !== null ? <TimerRing remainingMs={remainingMs} totalMs={totalLimitMs} /> : <span className="text-sm font-semibold text-[#4d6570]">Final exam</span>}
        </div>
      ) : null}
      <div className={shellActive ? "min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6" : undefined}>
        <div className={shellActive ? "mx-auto max-w-6xl" : undefined}>{view}</div>
      </div>
      {confirmOpen ? (
        <ConfirmSubmitDialog
          unanswered={remaining}
          flaggedCount={flaggedCount}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => void submit(true)}
          submitting={loading === "submit"}
        />
      ) : null}
    </div>
  );
}
