"use client";

import { useOrganization } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { toolCard, wizardSteps } from "@/config/tools/catalog";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { isClerkPublishableKeySet } from "@/lib/clerk-config";
import { runTool } from "@/lib/tools/assessment-engine";
import { questionView } from "@/lib/tools/questions";
import type { Answers, AssessmentResult, ToolId } from "@/lib/tools/types";
import { ToolReport } from "./tool-report";

type Draft = {
  step: number;
  answers: Answers;
  result: AssessmentResult | null;
  organisationName: string;
  assessmentId: string | null;
};

function storageKey(orgKey: string, tool: string) {
  return `cmp.tools.v1.${orgKey}.${tool}`;
}

function readDraft(key: string): Draft | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Draft;
    if (!parsed || typeof parsed !== "object" || !parsed.answers) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function ToolRunner({ tool }: { tool: ToolId }) {
  if (!isClerkPublishableKeySet()) {
    return <Runner tool={tool} orgKey="local" signedIn={false} />;
  }
  return <ClerkRunner tool={tool} />;
}

function ClerkRunner({ tool }: { tool: ToolId }) {
  const { organization, isLoaded } = useOrganization();
  const orgKey = isLoaded && organization?.id ? organization.id : "local";
  return <Runner tool={tool} orgKey={orgKey} signedIn={Boolean(isLoaded && organization)} />;
}

function Runner({ tool, orgKey, signedIn }: { tool: ToolId; orgKey: string; signedIn: boolean }) {
  const card = toolCard(tool);
  const steps = useMemo(() => wizardSteps(tool), [tool]);
  const params = useSearchParams();
  const router = useRouter();
  const reportId = params.get("report");
  const loadedKey = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [organisationName, setOrganisationName] = useState("Not saved to a workspace");
  const [assessmentId, setAssessmentId] = useState<string | null>(null);

  useEffect(() => {
    const key = storageKey(orgKey, tool);
    loadedKey.current = null;
    const draft = readDraft(key);
    const timer = window.setTimeout(() => {
      if (draft) {
        setStep(draft.step ?? 0);
        setAnswers(draft.answers ?? {});
        setResult(draft.result ?? null);
        setOrganisationName(draft.organisationName || "Not saved to a workspace");
        setAssessmentId(draft.assessmentId ?? null);
      }
      loadedKey.current = key;
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [orgKey, tool]);

  useEffect(() => {
    if (!reportId || !signedIn) return;
    let cancelled = false;
    void (async () => {
      const response = await fetch(`/api/tools/assessments/${reportId}`);
      const body = await response.json().catch(() => null) as { assessment?: { result?: AssessmentResult; organisationName?: string; id?: string } } | null;
      if (cancelled) return;
      if (!response.ok || !body?.assessment?.result) {
        setError("That saved report is not available in this workspace.");
        return;
      }
      setResult(body.assessment.result);
      setOrganisationName(body.assessment.organisationName || "Workspace");
      setAssessmentId(body.assessment.id ?? reportId);
    })();
    return () => {
      cancelled = true;
    };
  }, [reportId, signedIn]);

  useEffect(() => {
    const key = storageKey(orgKey, tool);
    if (loadedKey.current !== key) return;
    const draft: Draft = { step, answers, result, organisationName, assessmentId };
    window.localStorage.setItem(key, JSON.stringify(draft));
  }, [step, answers, result, organisationName, assessmentId, orgKey, tool]);

  if (!card) return null;

  function setAnswer(id: string, value: string) {
    setAnswers((current) => ({ ...current, [id]: value }));
    setError(null);
  }

  function validateStep(index: number) {
    const ids = steps[index]?.questionIds ?? [];
    const missing = ids.filter((id) => {
      const question = questionView(tool, id);
      if (!question?.required) return false;
      return !(answers[id] ?? "").trim();
    });
    if (missing.length > 0) {
      setError("Choose an answer for each required question before continuing.");
      return false;
    }
    return true;
  }

  async function finish() {
    if (!validateStep(step)) return;
    const run = runTool(tool, answers);
    if (!run.ok) {
      setError("Some required answers are still missing.");
      return;
    }
    setSaveMessage(null);
    setPdfError(null);
    if (tool === "notice-auditor") {
      setSaving(true);
      try {
        const response = await fetch("/api/tools/notice-review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ toolType: tool, answers }),
        });
        const body = await response.json().catch(() => null) as { result?: AssessmentResult } | null;
        if (response.ok && body?.result) {
          setResult(body.result);
          return;
        }
      } catch {
        /* The on-device check still stands. */
      } finally {
        setSaving(false);
      }
    }
    setResult(run.result);
  }

  function reset() {
    setStep(0);
    setAnswers({});
    setResult(null);
    setError(null);
    setSaveMessage(null);
    setPdfError(null);
    setAssessmentId(null);
    setOrganisationName("Not saved to a workspace");
    window.localStorage.removeItem(storageKey(orgKey, tool));
    router.replace(card?.href ?? "/tools");
  }

  async function save() {
    setSaving(true);
    setSaveMessage(null);
    try {
      const response = await fetch("/api/tools/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolType: tool, answers }),
      });
      const body = await response.json().catch(() => null) as { message?: string; id?: string; organisationName?: string; result?: AssessmentResult } | null;
      if (!response.ok) {
        setSaveMessage(body?.message ?? "Sign in with an organisation workspace to save.");
        return;
      }
      if (body?.result) setResult(body.result);
      if (body?.id) setAssessmentId(body.id);
      if (body?.organisationName) setOrganisationName(body.organisationName);
      setSaveMessage("Saved to this workspace. The pasted notice text is not stored.");
    } catch {
      setSaveMessage("Could not reach the workspace. Your result is still on this device.");
    } finally {
      setSaving(false);
    }
  }

  async function downloadPdf() {
    setPdfError(null);
    try {
      const response = await fetch("/api/tools/reports/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assessmentId ? { assessmentId } : { toolType: tool, answers }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { message?: string } | null;
        setPdfError(body?.message ?? "The PDF could not be created.");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "consentguru-dpdp-assessment.pdf";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setPdfError("The PDF could not be created.");
    }
  }

  const current = steps[step];
  const progress = result ? 100 : Math.round((step / steps.length) * 100);

  return (
    <div className="mx-auto max-w-[800px] px-5 py-8 sm:px-8 sm:py-10">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#00A88F]">DPDP tools</p>
      <h1 className="mt-2 text-balance text-3xl font-bold tracking-tight text-[#0B2C4A]">{card.name}</h1>
      <p className="mt-3 text-sm leading-6 text-[#4B5563]">{card.purpose}</p>
      <p className="mt-2 text-xs text-[#5D6B73]">About {card.minutes} · Method {card.version}</p>

      <div className="mt-6" aria-hidden={result ? true : undefined}>
        <div className="h-1.5 overflow-hidden rounded-full bg-[#E6F3F0]">
          <div className="h-full bg-[#00C4A7]" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 text-xs text-[#5D6B73]">
          {result ? "Result" : `Step ${step + 1} of ${steps.length}: ${current?.title ?? ""}`}
        </p>
      </div>

      {!ready ? <p className="mt-8 text-sm text-[#5D6B73]">Loading your draft…</p> : null}

      {ready && !result && current ? (
        <form
          className="mt-6 space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (step === steps.length - 1) finish();
            else if (validateStep(step)) setStep((value) => value + 1);
          }}
        >
          <fieldset className="space-y-5">
            <legend className="text-lg font-semibold text-[#0B2C4A]">{current.title}</legend>
            {current.questionIds.map((id) => {
              const question = questionView(tool, id);
              if (!question) return null;
              return (
                <div key={id} className="rounded-2xl border border-[#D3E0DE] bg-white p-4 sm:p-5">
                  <p className="text-sm font-semibold text-[#0B2C4A]" id={`${id}-label`}>{question.prompt}</p>
                  <p className="mt-1 text-xs leading-5 text-[#5D6B73]" id={`${id}-help`}>{question.help}</p>
                  {question.kind === "text" ? (
                    <Textarea
                      className="mt-3"
                      aria-labelledby={`${id}-label`}
                      aria-describedby={`${id}-help`}
                      value={answers[id] ?? ""}
                      maxLength={20000}
                      onChange={(event) => setAnswer(id, event.target.value)}
                    />
                  ) : (
                    <div className="mt-3 space-y-2" role="radiogroup" aria-labelledby={`${id}-label`}>
                      {question.options.map((option) => (
                        <label key={option.value} className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#D3E0DE] px-3 py-2 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[#00C4A7]">
                          <input
                            className="mt-1"
                            type="radio"
                            name={id}
                            value={option.value}
                            checked={answers[id] === option.value}
                            onChange={() => setAnswer(id, option.value)}
                          />
                          <span className="text-sm leading-6 text-[#111827]">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </fieldset>
          {error ? <Alert variant="error" role="alert">{error}</Alert> : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            {step === 0 ? (
              <Button type="button" variant="ghost" onClick={() => router.push("/tools")}>Back to tools</Button>
            ) : (
              <Button type="button" variant="ghost" onClick={() => { setError(null); setStep((value) => value - 1); }}>Back</Button>
            )}
            <Button type="submit" loading={saving}>{step === steps.length - 1 ? "See the result" : "Next"}</Button>
          </div>
        </form>
      ) : null}

      {ready && result ? (
        <div className="mt-6">
          <ToolReport
            title={card.name}
            organisationName={organisationName}
            result={result}
            saving={saving}
            saveMessage={saveMessage}
            pdfError={pdfError}
            onReset={reset}
            onSave={() => void save()}
            onPdf={() => void downloadPdf()}
          />
          {!signedIn ? (
            <p className="mt-4 text-sm text-[#5D6B73]">
              <Link className="font-medium text-[#0B2C4A] underline decoration-[#00C4A7]/50" href="/sign-in">Sign in</Link>
              {" "}to keep the result on the organisation workspace. This browser keeps a draft either way.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
