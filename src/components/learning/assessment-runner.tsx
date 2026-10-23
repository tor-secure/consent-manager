"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { BrandLogo } from "@/components/brand/brand-logo";
import { ShieldLoader } from "@/components/ui/shield-loader";
import { ProgressBar } from "@/components/learning/progress-bar";
import { StatusIcon } from "@/components/learning/status-icon";
import { card, eyebrow, primaryBtn, secondaryBtn } from "@/components/learning/ui";
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

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-2">
      <path d={direction === "left" ? "M12.5 4.5 7 10l5.5 5.5" : "M7.5 4.5 13 10l-5.5 5.5"} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatClock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function ExamClock({ remainingMs }: { remainingMs: number }) {
  const low = remainingMs <= 5 * 60 * 1000;
  return (
    <p className={`text-sm font-semibold tabular-nums ${low ? "text-red-700" : "text-[#0B2C4A]"}`} aria-live="polite">
      <span className="sr-only">Time remaining </span>
      {remainingMs <= 0 ? "Time is up" : `${formatClock(remainingMs)} left`}
    </p>
  );
}

function examAnswerKey(attemptId: string) {
  return `cg-exam-answers:${attemptId}`;
}

function readStoredExam(raw: string): { answers: Record<string, string[]>; index: number } | null {
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const record = parsed as Record<string, unknown>;
  const source =
    record.answers && typeof record.answers === "object" && !Array.isArray(record.answers)
      ? (record.answers as Record<string, unknown>)
      : record;
  const answers: Record<string, string[]> = {};
  for (const [questionId, optionIds] of Object.entries(source)) {
    if (questionId === "answers" || questionId === "index") continue;
    if (Array.isArray(optionIds) && optionIds.every((id) => typeof id === "string")) answers[questionId] = optionIds;
  }
  const index = typeof record.index === "number" && Number.isInteger(record.index) && record.index >= 0 ? record.index : 0;
  return { answers, index };
}

function QuestionJump({
  questions,
  answers,
  index,
  onJump,
  className,
}: {
  questions: Question[];
  answers: Record<string, string[]>;
  index: number;
  onJump: (questionIndex: number) => void;
  className: string;
}) {
  return (
    <ol aria-label="Jump to question" className={className}>
      {questions.map((question, questionIndex) => {
        const done = (answers[question.id] ?? []).length > 0;
        const active = questionIndex === index;
        return (
          <li key={question.id}>
            <button
              type="button"
              onClick={() => onJump(questionIndex)}
              aria-label={`Question ${questionIndex + 1}${done ? ", answered" : ", not answered"}`}
              aria-current={active ? "step" : undefined}
              className={`inline-flex h-9 w-full items-center justify-center rounded-lg border text-xs font-semibold tabular-nums motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00C4A7] ${
                active
                  ? "border-[#0B2C4A] bg-[#0B2C4A] text-white"
                  : done
                    ? "border-[#bfe9e0] bg-[#E6F9F5] text-[#0B2C4A]"
                    : "border-[#d5e3e0] bg-white text-[#4d6570] hover:border-[#0B2C4A]"
              }`}
            >
              {questionIndex + 1}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function ErrorBox({ message, onRetry, retryLabel }: { message: string; onRetry?: () => void; retryLabel?: string }) {
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between">
      <p>{message}</p>
      {onRetry ? (
        <button type="button" className="inline-flex h-10 shrink-0 items-center rounded-lg border border-red-300 bg-white px-3 font-semibold text-red-800 hover:bg-red-100" onClick={onRetry}>
          {retryLabel ?? "Try again"}
        </button>
      ) : null}
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
  /** When set with autoStart, reuse a quiz already opened during lesson-complete. */
  preloadSlug?: string;
  /** Final exam length in seconds. The deadline itself comes from the attempt start time. */
  timeLimitSeconds?: number;
}) {
  const [loading, setLoading] = useState<"start" | "submit" | null>(null);
  const [error, setError] = useState<{ message: string; action: "start" | "submit" } | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [passPercent, setPassPercent] = useState(defaultPassPercent);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [endedByTime, setEndedByTime] = useState(false);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const questionHeading = useRef<HTMLHeadingElement>(null);
  const submitButton = useRef<HTMLButtonElement>(null);
  const autoStarted = useRef(false);
  const advanceTimer = useRef<number | null>(null);
  const submitting = useRef(false);
  const lastForceFail = useRef(0);
  const submitRef = useRef<(force?: boolean) => void>(() => undefined);
  const shellRef = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);

  const current = questions[index];
  const answered = useMemo(() => questions.filter((question) => (answers[question.id] ?? []).length > 0).length, [answers, questions]);
  const remaining = questions.length - answered;

  useEffect(() => {
    if (result) resultHeading.current?.focus();
  }, [result]);

  useEffect(() => {
    if (remaining === 0 && attemptId && !result) submitButton.current?.scrollIntoView({ block: "nearest" });
  }, [remaining, attemptId, result]);

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

  function startInFullscreen() {
    enterFullscreen();
    void begin();
  }

  async function begin() {
    setLoading("start");
    setError(null);
    setResult(null);
    setAnswers({});
    setQuestions([]);
    setAttemptId(null);
    setIndex(0);
    setDeadline(null);
    setRemainingMs(null);
    setEndedByTime(false);
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
    // Open the questions immediately after the lesson is marked complete.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, preloadSlug]);

  function goTo(nextIndex: number) {
    if (advanceTimer.current) {
      window.clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
    setIndex(Math.min(questions.length - 1, Math.max(0, nextIndex)));
    requestAnimationFrame(() => questionHeading.current?.focus());
  }

  function toggle(question: Question, optionId: string) {
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
    advanceTimer.current = window.setTimeout(() => goTo(questionIndex + 1), 280);
  }

  useEffect(() => {
    return () => {
      if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    };
  }, []);

  async function submit(force = false) {
    if (!attemptId || submitting.current) return;
    if (!force && remaining > 0) return;
    if (force && Date.now() - lastForceFail.current < 3000) return;
    submitting.current = true;
    if (advanceTimer.current) {
      window.clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
    setLoading("submit");
    setError(null);
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
      if (stored.index > 0 && questions.length > 0) setIndex(Math.min(stored.index, questions.length - 1));
    } catch {
      // A stored draft is optional. The attempt still continues.
    }
  }, [attemptId, deadline, questions.length]);

  useEffect(() => {
    if (!attemptId || !deadline || Object.keys(answers).length === 0) return;
    sessionStorage.setItem(examAnswerKey(attemptId), JSON.stringify({ answers, index }));
  }, [answers, attemptId, deadline, index]);

  function retrySubmit() {
    void submit(deadline !== null && Date.now() >= deadline);
  }

  let view: ReactNode;
  if (result) {
    view = (
      <section className="space-y-5" aria-labelledby="assessment-result">
        <div className={`${card} p-6 sm:p-8`}>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <StatusIcon status={result.passed ? "completed" : "in_progress"} size={48} />
            <div className="min-w-0 flex-1">
              <h2 id="assessment-result" ref={resultHeading} tabIndex={-1} className="text-xl font-semibold text-[#0B2C4A] focus:outline-none">
                {result.passed ? "Passed" : "Not passed yet"}
              </h2>
              <p className="mt-1 text-justify text-sm text-[#4d6570]">
                {endedByTime ? "Time ran out, so the exam was submitted with the answers you had given. " : null}
                {result.passed
                  ? result.nextModuleUnlocked
                    ? "Well done. The next module is now unlocked."
                    : "Well done. This result meets the required score."
                  : `You need ${passPercent}% to pass. Review the explanations below, then try again.`}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-4xl font-semibold tabular-nums text-[#0B2C4A]">{result.percentage}%</p>
              <p className="text-sm text-[#4d6570]">
                {result.correctCount} of {result.total} correct · pass mark {passPercent}%
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            {result.passed ? (
              <a className={primaryBtn} href={onPassedHref}>
                {passedLabel}
              </a>
            ) : (
              <button type="button" className={primaryBtn} onClick={startInFullscreen} disabled={loading !== null}>
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

        <h3 className="text-lg font-semibold text-[#0B2C4A]">Answer review</h3>
        <ol className="space-y-3">
          {result.review.map((item, itemIndex) => {
            const chosen = new Set(answers[item.id] ?? []);
            const correctIds = new Set(item.correctOptionIds);
            return (
              <li key={item.id} className={`${card} p-5`}>
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-xs font-semibold ${item.correct ? "bg-[#E6F9F5] text-[#065f52]" : "bg-red-50 text-red-800"}`}>
                    {item.correct ? "Correct" : "Incorrect"}
                  </span>
                  <p className="text-[15px] font-semibold leading-6 text-[#0B2C4A]">
                    {itemIndex + 1}. {item.prompt}
                  </p>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {item.options.map((option) => {
                    const isCorrect = correctIds.has(option.id);
                    const isChosen = chosen.has(option.id);
                    if (!isCorrect && !isChosen) return null;
                    return (
                      <li
                        key={option.id}
                        className={`flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                          isCorrect ? "border-[#bfe9e0] bg-[#E6F9F5] text-[#0B2C4A]" : "border-red-200 bg-red-50 text-red-900"
                        }`}
                      >
                        <span className="font-semibold">{isCorrect ? (isChosen ? "Your answer · correct" : "Correct answer") : "Your answer"}</span>
                        <span>{option.label}</span>
                      </li>
                    );
                  })}
                </ul>
                {item.explanation ? <p className="mt-3 text-justify text-sm leading-6 text-[#36505c]">{item.explanation}</p> : null}
              </li>
            );
          })}
        </ol>
      </section>
    );
  } else if (!attemptId || !current) {
    if (autoStart && !error) {
      view = (
        <section className={`${card} p-6 sm:p-8`} aria-live="polite">
          <h2 className="text-xl font-semibold text-[#0B2C4A]">{loading ? "Loading a new quiz…" : title}</h2>
          <p className="mt-2 text-sm text-[#4d6570]">The questions open as soon as the lesson is marked complete.</p>
        </section>
      );
    } else view = (
      <section className={`${card} p-6 sm:p-8`} aria-labelledby="assessment-start">
        <p className={eyebrow}>Assessment</p>
        <h2 id="assessment-start" className="mt-2 text-xl font-semibold text-[#0B2C4A]">
          {title}
        </h2>
        {intro ? <p className="mt-2 max-w-2xl text-justify text-base leading-7 text-[#36505c]">{intro}</p> : null}
        <ul className="mt-4 grid gap-2 text-sm text-[#0B2C4A] sm:grid-cols-2">
          {questionCount ? (
            <li className="rounded-lg bg-[#f3f7f6] px-3 py-2">
              <span className="font-semibold">{questionCount}</span> questions
            </li>
          ) : null}
          <li className="rounded-lg bg-[#f3f7f6] px-3 py-2">
            Pass mark <span className="font-semibold">{passPercent}%</span>
          </li>
          {timeLimitSeconds ? (
            <li className="rounded-lg bg-[#f3f7f6] px-3 py-2 sm:col-span-2">
              <span className="font-semibold">{Math.round(timeLimitSeconds / 60)} minutes.</span> The exam submits automatically when the time ends.
            </li>
          ) : null}
          <li className="rounded-lg bg-[#f3f7f6] px-3 py-2 sm:col-span-2">
            The quiz runs in fullscreen. Leave it and the questions are hidden.
          </li>
        </ul>
        {error ? (
          <div className="mt-4">
            <ErrorBox message={error.message} onRetry={startInFullscreen} />
          </div>
        ) : null}
        <button type="button" className={`${primaryBtn} mt-6`} onClick={startInFullscreen} disabled={loading !== null} aria-busy={loading !== null}>
          {loading === "start" ? (
            <>
              <ShieldLoader />
              Starting…
            </>
          ) : (
            "Start in fullscreen"
          )}
        </button>
      </section>
    );
  } else if (!fullscreen) {
    view = (
      <section className={`${card} p-6 sm:p-8`} aria-labelledby="fullscreen-required">
        <h2 id="fullscreen-required" className="text-xl font-semibold text-[#0B2C4A]">
          Fullscreen is required
        </h2>
        <p className="mt-2 max-w-2xl text-justify text-base leading-7 text-[#36505c]">
          The questions stay hidden until the quiz fills the screen. Your answers are kept. Press Escape or leave this tab and you will need to return here before you can continue.
        </p>
        {remainingMs !== null ? (
          <div className="mt-4">
            <ExamClock remainingMs={remainingMs} />
          </div>
        ) : null}
        {loading === "submit" ? <p className="mt-4 text-sm font-semibold text-[#0B2C4A]">Submitting your answers…</p> : null}
        {loading === "start" ? <p className="mt-4 text-sm font-semibold text-[#0B2C4A]">Starting a new attempt…</p> : null}
        {error ? (
          <div className="mt-4">
            <ErrorBox message={error.message} onRetry={error.action === "submit" ? retrySubmit : enterFullscreen} retryLabel={error.action === "submit" ? "Submit again" : undefined} />
          </div>
        ) : null}
        <button type="button" className={`${primaryBtn} mt-6`} onClick={enterFullscreen} disabled={loading !== null}>
          {answered > 0 ? "Return to fullscreen" : "Enter fullscreen"}
        </button>
      </section>
    );
  } else {
  const selected = answers[current.id] ?? [];
  const multi = current.type === "multi";
  const last = index === questions.length - 1;
  const optionList = (
    <div key={attemptId ?? "attempt"} className={timeLimitSeconds ? "mt-4 flex min-h-0 flex-1 flex-col gap-2" : "mt-4 space-y-2"}>
      {current.options.map((option) => {
        const isSelected = selected.includes(option.id);
        return (
          <label
            key={option.id}
            className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-[15px] leading-6 motion-safe:transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#00C4A7] ${
              timeLimitSeconds ? "min-h-14 flex-1" : "min-h-12"
            } ${isSelected ? "border-[#0B2C4A] bg-[#E6F9F5] text-[#0B2C4A]" : "border-[#d5e3e0] bg-white text-[#0B2C4A] hover:border-[#0B2C4A]/50"}`}
          >
            <input
              type={multi ? "checkbox" : "radio"}
              name={current.id}
              checked={isSelected}
              onChange={() => toggle(current, option.id)}
              className="h-4 w-4 shrink-0 accent-[#0B2C4A]"
            />
            <span className="min-w-0 flex-1 whitespace-normal break-words">{option.label}</span>
          </label>
        );
      })}
    </div>
  );
  const navigation = (
    <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-[#e4eeec] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
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
      <div className="flex flex-col items-start gap-1 sm:items-end">
        <button ref={submitButton} type="button" className={primaryBtn} onClick={() => submit()} disabled={loading !== null || remaining > 0} aria-busy={loading === "submit"} aria-describedby="submit-hint">
          {loading === "submit" ? (
            <>
              <ShieldLoader />
              Submitting…
            </>
          ) : (
            "Submit answers"
          )}
        </button>
        <p id="submit-hint" className="text-xs text-[#4d6570]">
          {remaining > 0 ? `Answer ${remaining} more question${remaining === 1 ? "" : "s"} to submit.` : "All questions answered."}
        </p>
      </div>
    </div>
  );

  view = timeLimitSeconds ? (
    <section className="flex h-full min-h-0 flex-col md:flex-row" aria-label={title}>
      <aside className="flex max-h-44 shrink-0 flex-col border-b border-[#e4eeec] bg-white md:max-h-none md:w-72 md:border-b-0 md:border-r">
        <div className="px-4 py-3">
          <p className="text-sm font-semibold text-[#0B2C4A]">
            Question {index + 1} of {questions.length}
          </p>
          <p className="text-sm text-[#4d6570]" aria-live="polite">
            {answered} of {questions.length} answered
          </p>
          <div className="mt-2">
            <ProgressBar value={(answered / questions.length) * 100} label="Questions answered" size="sm" showValue={false} />
          </div>
        </div>
        <QuestionJump
          questions={questions}
          answers={answers}
          index={index}
          onJump={goTo}
          className="grid flex-1 grid-cols-8 content-start gap-1.5 overflow-y-auto px-3 pb-3 md:grid-cols-5"
        />
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-5 sm:px-8">
          <div className="mx-auto flex min-h-full w-full max-w-3xl flex-1 flex-col">
            <h2 ref={questionHeading} tabIndex={-1} className="text-lg font-semibold leading-7 text-[#0B2C4A] focus:outline-none">
              {current.prompt}
            </h2>
            <p className="pt-1 text-sm text-[#4d6570]">
              {multi ? "Select all that apply, then use the arrow for the next question." : "Select one answer. The next question opens on its own."}
            </p>
            {optionList}
            {error ? (
              <div className="mt-4">
                <ErrorBox message={error.message} onRetry={error.action === "submit" ? retrySubmit : startInFullscreen} retryLabel={error.action === "submit" ? "Submit again" : undefined} />
              </div>
            ) : null}
          </div>
        </div>
        {navigation}
      </div>
    </section>
  ) : (
    <section className="space-y-4" aria-label={title}>
      <div className={`${card} p-4 sm:p-5`}>
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#d5e3e0] bg-white text-[#0B2C4A] hover:border-[#0B2C4A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00C4A7] disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => goTo(index - 1)}
            disabled={index === 0}
            aria-label="Previous question"
          >
            <ArrowIcon direction="left" />
          </button>
          <div className="min-w-0 text-center">
            <p className="text-sm font-semibold text-[#0B2C4A]">
              Question {index + 1} of {questions.length}
            </p>
            <p className="text-sm text-[#4d6570]" aria-live="polite">
              {answered} of {questions.length} answered
            </p>
          </div>
          <button
            type="button"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#d5e3e0] bg-white text-[#0B2C4A] hover:border-[#0B2C4A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00C4A7] disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => goTo(index + 1)}
            disabled={last}
            aria-label="Next question"
          >
            <ArrowIcon direction="right" />
          </button>
        </div>
        <div className="mt-2">
          <ProgressBar value={(answered / questions.length) * 100} label="Questions answered" size="sm" showValue={false} />
        </div>
        <QuestionJump
          questions={questions}
          answers={answers}
          index={index}
          onJump={goTo}
          className="mt-3 flex flex-wrap gap-1.5 [&>li]:w-9"
        />
      </div>

      <div className={`${card} p-5 sm:p-6`}>
        <h2 ref={questionHeading} tabIndex={-1} className="text-lg font-semibold leading-7 text-[#0B2C4A] focus:outline-none">
          {current.prompt}
        </h2>
        <p className="pt-1 text-sm text-[#4d6570]">
          {multi ? "Select all that apply, then use the arrow for the next question." : "Select one answer. The next question opens on its own."}
        </p>
        {optionList}
      </div>

      {error ? <ErrorBox message={error.message} onRetry={error.action === "submit" ? retrySubmit : startInFullscreen} retryLabel={error.action === "submit" ? "Submit again" : undefined} /> : null}

      <div className="sticky bottom-0 z-10">{navigation}</div>
    </section>
  );
  }

  const examQuestionsOpen = Boolean(timeLimitSeconds) && fullscreen && Boolean(attemptId && current && !result);

  return (
    <div
      ref={shellRef}
      className={fullscreen ? "flex h-full flex-col overflow-hidden bg-[#f3f7f6] text-[#0B2C4A]" : undefined}
    >
      {fullscreen ? (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#e4eeec] bg-white px-4 py-3 sm:px-6">
          <BrandLogo height={32} />
          {remainingMs !== null ? <ExamClock remainingMs={remainingMs} /> : null}
        </div>
      ) : null}
      <div className={fullscreen ? (examQuestionsOpen ? "flex min-h-0 flex-1 flex-col overflow-hidden" : "min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8") : undefined}>
        <div className={fullscreen ? (examQuestionsOpen ? "h-full min-h-0" : "mx-auto max-w-3xl") : undefined}>{view}</div>
      </div>
    </div>
  );
}
