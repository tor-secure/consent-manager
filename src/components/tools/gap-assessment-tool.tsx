"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import {
  DATA_TYPE_OPTIONS,
  EMPLOYEE_OPTIONS,
  GAP_ANSWERS,
  GAP_AREAS,
  GAP_CONTROLS,
  GAP_LEGAL_NOTE,
  INDUSTRY_OPTIONS,
  REMEDIATION_STATUSES,
  SIZE_OPTIONS,
  controlApplies,
  controlReference,
  emptyProfile,
  phaseLabel,
  type GapAnswer,
  type GapProfile,
  type GapRemediation,
  type GapResponse,
  type RemediationStatus,
} from "@/config/tools/gap";
import { BrandLogo } from "@/components/brand/brand-logo";
import { answerLabel, gapReportNarrative, missingAnswers } from "@/lib/tools/gap-engine";
import type { GapAnalysis } from "@/lib/tools/gap-engine";
import type { GapCmp } from "@/lib/tools/gap-document";

type HistoryItem = {
  id: string;
  status: string;
  score: number | null;
  updatedAt: string;
  completedAt: string | null;
  companyName: string;
  label: string;
};

type Assessment = {
  id: string;
  status: string;
  score: number | null;
  updatedAt: string;
  completedAt: string | null;
  profile: GapProfile;
  responses: Record<string, GapResponse>;
  remediation: Record<string, GapRemediation>;
  cmp: GapCmp | null;
  analysis: GapAnalysis | null;
  label: string;
  summary: string;
};

type Screen = "home" | "profile" | "questions" | "results" | "remediate";

const EMPTY_RESPONSE: GapResponse = { status: "unassessed", remarks: "", evidence: "" };

function responseOf(responses: Record<string, GapResponse>, id: string): GapResponse {
  return responses[id] ?? EMPTY_RESPONSE;
}

async function readJson(response: Response) {
  return await response.json().catch(() => null) as { success?: boolean; message?: string; assessment?: Assessment; assessments?: HistoryItem[]; organisationName?: string } | null;
}

export function GapAssessmentTool({ initialId }: { initialId?: string }) {
  const [screen, setScreen] = useState<Screen>("home");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [organisationName, setOrganisationName] = useState("");
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [profile, setProfile] = useState<GapProfile>(emptyProfile());
  const [responses, setResponses] = useState<Record<string, GapResponse>>({});
  const [remediation, setRemediation] = useState<Record<string, GapRemediation>>({});
  const [areaIndex, setAreaIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedOut, setSignedOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const response = await fetch("/api/tools/gap-assessment");
      const body = await readJson(response);
      if (cancelled) return;
      if (response.status === 401 || response.status === 400) {
        setSignedOut(true);
        setLoading(false);
        return;
      }
      if (!response.ok || !body?.success) {
        setError(body?.message ?? "Could not load saved assessments.");
        setLoading(false);
        return;
      }
      setHistory(body.assessments ?? []);
      setOrganisationName(body.organisationName ?? "");
      setProfile(emptyProfile(body.organisationName ?? ""));
      setLoading(false);
      if (initialId) {
        const saved = await fetch(`/api/tools/gap-assessment/${initialId}`);
        const savedBody = await readJson(saved);
        if (cancelled) return;
        if (saved.ok && savedBody?.assessment) {
          applyAssessment(savedBody.assessment);
          setScreen(savedBody.assessment.analysis ? "results" : "questions");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialId]);

  const applicable = useMemo(() => GAP_CONTROLS.filter((item) => controlApplies(item, profile)), [profile]);
  const answered = applicable.filter((item) => responseOf(responses, item.id).status !== "unassessed").length;
  const progress = applicable.length === 0 ? 0 : Math.round((answered / applicable.length) * 100);
  const area = GAP_AREAS[areaIndex];
  const areaControls = GAP_CONTROLS.filter((item) => item.area === area?.id && controlApplies(item, profile));

  function applyAssessment(next: Assessment) {
    setAssessment(next);
    setProfile(next.profile);
    setResponses(next.responses);
    setRemediation(next.remediation);
  }

  async function start(from?: GapProfile) {
    setSaving(true);
    setError(null);
    const response = await fetch("/api/tools/gap-assessment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(from ? { profile: from } : {}),
    });
    const body = await readJson(response);
    setSaving(false);
    if (response.status === 401) {
      setSignedOut(true);
      setError("Sign in and choose a workspace to save this assessment.");
      return;
    }
    if (!response.ok || !body?.assessment) {
      setError(body?.message ?? "Could not start the assessment.");
      return;
    }
    applyAssessment(body.assessment);
    setAreaIndex(0);
    setScreen("profile");
  }

  async function openAssessment(id: string, destination: Screen) {
    setSaving(true);
    setError(null);
    const response = await fetch(`/api/tools/gap-assessment/${id}`);
    const body = await readJson(response);
    setSaving(false);
    if (!response.ok || !body?.assessment) {
      setError(body?.message ?? "That assessment is not available in this workspace.");
      return;
    }
    applyAssessment(body.assessment);
    setScreen(destination);
  }

  async function save(complete: boolean) {
    if (!assessment) return null;
    setSaving(true);
    setError(null);
    const response = await fetch(`/api/tools/gap-assessment/${assessment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile, responses, remediation, complete }),
    });
    const body = await readJson(response);
    setSaving(false);
    if (!response.ok || !body?.assessment) {
      setError(body?.message ?? "Could not save the assessment.");
      return null;
    }
    applyAssessment(body.assessment);
    setHistory((current) => {
      const item: HistoryItem = {
        id: body.assessment!.id,
        status: body.assessment!.status,
        score: body.assessment!.score,
        updatedAt: body.assessment!.updatedAt,
        completedAt: body.assessment!.completedAt,
        companyName: body.assessment!.profile.companyName,
        label: body.assessment!.label,
      };
      return [item, ...current.filter((entry) => entry.id !== item.id)];
    });
    return body.assessment;
  }

  async function saveAndContinue() {
    const next = await save(false);
    if (!next) return;
    if (areaIndex < GAP_AREAS.length - 1) setAreaIndex((index) => index + 1);
  }

  async function finish() {
    const remaining = missingAnswers(profile, responses);
    if (remaining.length > 0) {
      const first = GAP_CONTROLS.find((item) => item.id === remaining[0]);
      const index = GAP_AREAS.findIndex((item) => item.id === first?.area);
      if (index >= 0) setAreaIndex(index);
      setScreen("questions");
      setError("Choose a response for every applicable control before finishing.");
      return;
    }
    const next = await save(true);
    if (next?.analysis) setScreen("results");
  }

  const draft = history.find((item) => item.status !== "completed");

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-8 sm:px-8 sm:py-12">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#00A88F]">DPDP compliance tools</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          <h1 className="text-balance text-3xl font-bold tracking-tight text-[#0B2C4A] sm:text-4xl">DPDP Compliance Gap Assessment</h1>
          <p className="mt-3 text-sm leading-6 text-[#4B5563] sm:text-base">
            Assess readiness under the DPDP Act, 2023 and the DPDP Rules, 2025. The result is an internal indicator. It is not a Board determination or a certificate of compliance.
          </p>
        </div>
        {screen !== "home" ? (
          <button type="button" className="btn btn-secondary" onClick={() => setScreen("home")}>All assessments</button>
        ) : (
          <Link href="/tools" className="btn btn-secondary">All tools</Link>
        )}
      </div>
      {error ? <p className="mt-4 rounded-xl border border-[#F04438]/30 bg-[#FEF3F2] px-4 py-3 text-sm text-[#B42318]" role="alert">{error}</p> : null}
      {signedOut ? <p className="mt-4 text-sm text-[#4B5563]">Sign in and choose an organisation workspace to store assessments. <Link href="/sign-in" className="font-semibold text-[#00A88F]">Sign in</Link></p> : null}

      {screen === "home" ? (
        <Home
          loading={loading}
          saving={saving}
          history={history}
          draft={draft}
          onStart={() => void start(emptyProfile(organisationName))}
          onContinue={(id) => void openAssessment(id, "questions")}
          onOpen={(id) => void openAssessment(id, "results")}
          onReassess={(item) => {
            void (async () => {
              const response = await fetch(`/api/tools/gap-assessment/${item.id}`);
              const body = await readJson(response);
              if (!body?.assessment) {
                setError(body?.message ?? "Could not copy that assessment.");
                return;
              }
              await start(body.assessment.profile);
            })();
          }}
        />
      ) : null}

      {screen === "profile" && assessment ? (
        <ProfileForm
          profile={profile}
          cmp={assessment.cmp}
          saving={saving}
          onChange={setProfile}
          onBack={() => setScreen("home")}
          onNext={() => {
            if (!profile.companyName || !profile.industry || !profile.organisationSize || !profile.employeeRange || !profile.location || profile.dataTypes.length === 0 || !profile.purposes || !profile.governance) {
              setError("Complete the company details before the questionnaire.");
              return;
            }
            void save(false).then((next) => {
              if (next) setScreen("questions");
            });
          }}
        />
      ) : null}

      {screen === "questions" && assessment ? (
        <section className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-[#0B2C4A]">Coverage {progress}% · {answered} of {applicable.length} applicable controls</p>
            <p className="text-xs text-[#5D6B73]">{saving ? "Saving…" : "Saved to this workspace"}</p>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#E6F7F3]" aria-hidden="true">
            <div className="h-full bg-[#00A88F]" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
            <nav aria-label="Assessment areas" className="flex gap-2 overflow-x-auto lg:flex-col">
              {GAP_AREAS.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    void save(false).then((next) => {
                      if (next) setAreaIndex(index);
                    });
                  }}
                  className={`shrink-0 rounded-xl px-3 py-2 text-left text-sm ${index === areaIndex ? "bg-[#0B2C4A] text-white" : "bg-white text-[#0B2C4A] ring-1 ring-[#E5E7EB]"}`}
                >
                  {index + 1}. {item.label}
                </button>
              ))}
            </nav>
            <div>
              <h2 className="text-xl font-bold text-[#0B2C4A]">{area?.label}</h2>
              <p className="mt-1 text-sm text-[#4B5563]">{area?.summary}</p>
              {areaControls.length === 0 ? <p className="mt-6 text-sm text-[#5D6B73]">Nothing in this area applies to the company details you entered.</p> : null}
              <div className="mt-5 space-y-4">
                {areaControls.map((item) => {
                  const current = responseOf(responses, item.id);
                  return (
                    <article key={item.id} className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <h3 className="text-base font-semibold text-[#0B2C4A]">{item.title}</h3>
                        <span className="rounded-full bg-[#F3F4F6] px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#4B5563]">{item.kind}</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[#4B5563]">{item.description}</p>
                      <p className="mt-2 text-xs leading-5 text-[#5D6B73]">{controlReference(item)}. {phaseLabel(item.phase)}.</p>
                      <fieldset className="mt-4">
                        <legend className="sr-only">{item.title}</legend>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {GAP_ANSWERS.map((option) => (
                            <label key={option.value} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm ${current.status === option.value ? "border-[#00A88F] bg-[#E6F7F3]" : "border-[#E5E7EB]"}`}>
                              <input
                                type="radio"
                                name={item.id}
                                value={option.value}
                                checked={current.status === option.value}
                                onChange={() => setResponses((existing) => ({ ...existing, [item.id]: { ...current, status: option.value as GapAnswer } }))}
                              />
                              {option.label}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                      <label className="mt-4 block text-xs font-medium text-[#5D6B73]">
                        Remarks
                        <textarea value={current.remarks} onChange={(event) => setResponses((existing) => ({ ...existing, [item.id]: { ...current, remarks: event.target.value } }))} className="field-input mt-1 min-h-20 w-full" maxLength={2000} />
                      </label>
                      <label className="mt-3 block text-xs font-medium text-[#5D6B73]">
                        Evidence note
                        <textarea value={current.evidence} onChange={(event) => setResponses((existing) => ({ ...existing, [item.id]: { ...current, evidence: event.target.value } }))} placeholder={item.evidence} className="field-input mt-1 min-h-16 w-full" maxLength={2000} />
                      </label>
                      <p className="mt-2 text-xs text-[#5D6B73]">Evidence stays in this workspace record. It is not published at a public link.</p>
                    </article>
                  );
                })}
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <button type="button" className="btn btn-secondary" disabled={areaIndex === 0 || saving} onClick={() => setAreaIndex((index) => Math.max(0, index - 1))}>Previous</button>
                {areaIndex < GAP_AREAS.length - 1 ? (
                  <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void saveAndContinue()}>Save and continue</button>
                ) : (
                  <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void finish()}>Finish assessment</button>
                )}
                <button type="button" className="btn btn-ghost" disabled={saving} onClick={() => void save(false)}>Save draft</button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {screen === "results" && assessment?.analysis ? (
        <Results
          assessment={assessment}
          onRemediate={() => setScreen("remediate")}
          onQuestions={() => setScreen("questions")}
        />
      ) : null}
      {screen === "results" && assessment && !assessment.analysis ? (
        <p className="mt-8 text-sm text-[#4B5563]">This assessment is still a draft. Finish the questionnaire to see the gap analysis.</p>
      ) : null}

      {screen === "remediate" && assessment?.analysis ? (
        <Remediation
          findings={assessment.analysis.findings}
          remediation={remediation}
          saving={saving}
          onChange={(id, patch) => setRemediation((current) => ({
            ...current,
            [id]: { ...{ owner: "", due: "", status: "open" as const, evidence: "", verified: false }, ...current[id], ...patch },
          }))}
          onSave={() => void save(false).then((next) => { if (next) setScreen("results"); })}
        />
      ) : null}
    </div>
  );
}

function Home({
  loading,
  saving,
  history,
  draft,
  onStart,
  onContinue,
  onOpen,
  onReassess,
}: {
  loading: boolean;
  saving: boolean;
  history: HistoryItem[];
  draft: HistoryItem | undefined;
  onStart: () => void;
  onContinue: (id: string) => void;
  onOpen: (id: string) => void;
  onReassess: (item: HistoryItem) => void;
}) {
  return (
    <>
      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" className="btn btn-primary" disabled={saving} onClick={onStart}>Start new assessment</button>
        {draft ? <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => onContinue(draft.id)}>Continue assessment</button> : null}
      </div>
      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
          <h2 className="text-base font-semibold text-[#0B2C4A]">What the assessment covers</h2>
          <ul className="mt-3 space-y-1 text-sm leading-6 text-[#4B5563]">
            {GAP_AREAS.map((area) => <li key={area.id}>{area.label}</li>)}
          </ul>
        </article>
        <article className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
          <h2 className="text-base font-semibold text-[#0B2C4A]">Legal framework</h2>
          <p className="mt-3 text-sm leading-6 text-[#4B5563]">{GAP_LEGAL_NOTE}</p>
          <p className="mt-3 text-sm leading-6 text-[#4B5563]">Operational duties for notice, consent, rights, security, breach, children, processors, and transfers commence on 13 May 2027. Consent Manager registration commences on 13 November 2026. A missing control is not shown as a present breach when the duty has not commenced.</p>
        </article>
      </section>
      <section className="mt-8">
        <h2 className="text-lg font-bold text-[#0B2C4A]">Previous assessments</h2>
        {loading ? <p className="mt-3 text-sm text-[#5D6B73]">Loading assessments…</p> : null}
        {!loading && history.length === 0 ? <p className="mt-3 text-sm text-[#5D6B73]">No assessments are stored for this workspace yet.</p> : null}
        <ul className="mt-4 divide-y divide-[#E5E7EB] rounded-2xl border border-[#E5E7EB] bg-white">
          {history.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-[#0B2C4A]">{item.companyName || "Untitled assessment"}</p>
                <p className="text-xs text-[#5D6B73]">{item.status === "completed" ? item.label : "Draft"} · {item.score === null ? "No score" : `${item.score} / 100`} · {new Date(item.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => item.status === "completed" ? onOpen(item.id) : onContinue(item.id)}>{item.status === "completed" ? "Open" : "Continue"}</button>
                {item.status === "completed" ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => onReassess(item)}>Reassess</button> : null}
                {item.status === "completed" ? <a className="btn btn-ghost btn-sm" href={`/api/tools/gap-assessment/${item.id}/pdf`}>Download</a> : null}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function ProfileForm({
  profile,
  cmp,
  saving,
  onChange,
  onBack,
  onNext,
}: {
  profile: GapProfile;
  cmp: GapCmp | null;
  saving: boolean;
  onChange: (profile: GapProfile) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  function set<K extends keyof GapProfile>(key: K, value: GapProfile[K]) {
    onChange({ ...profile, [key]: value });
  }
  return (
    <form className="mt-8 space-y-4" onSubmit={(event) => { event.preventDefault(); onNext(); }}>
      <h2 className="text-xl font-bold text-[#0B2C4A]">Company information</h2>
      <p className="text-sm text-[#4B5563]">These answers decide which controls are shown. They do not by themselves prove compliance.</p>
      {cmp ? <p className="text-sm text-[#4B5563]">This workspace currently has {cmp.consentRecords} consent records, {cmp.publishedPolicies} published policy versions, and {cmp.purposes} configured purposes. Those counts are context for the consent controls. They are not treated as a pass.</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Company name"><input className="field-input w-full" value={profile.companyName} onChange={(event) => set("companyName", event.target.value)} required /></Field>
        <Field label="Industry"><Select value={profile.industry} onChange={(value) => set("industry", value)} options={INDUSTRY_OPTIONS} /></Field>
        <Field label="Organisation size"><Select value={profile.organisationSize} onChange={(value) => set("organisationSize", value)} options={SIZE_OPTIONS} /></Field>
        <Field label="Employee count"><Select value={profile.employeeRange} onChange={(value) => set("employeeRange", value)} options={EMPLOYEE_OPTIONS} /></Field>
        <Field label="Location"><input className="field-input w-full" value={profile.location} onChange={(event) => set("location", event.target.value)} required /></Field>
        <Field label="Role">
          <Select value={profile.role} onChange={(value) => set("role", value as GapProfile["role"])} options={["fiduciary", "processor", "both"]} labels={["Data Fiduciary", "Data Processor", "Both"]} />
        </Field>
      </div>
      <fieldset>
        <legend className="text-xs font-medium text-[#5D6B73]">Personal data processed</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {DATA_TYPE_OPTIONS.map((option) => (
            <label key={option} className="flex items-center gap-2 text-sm text-[#0B2C4A]">
              <input
                type="checkbox"
                checked={profile.dataTypes.includes(option)}
                onChange={(event) => {
                  const dataTypes = event.target.checked ? [...profile.dataTypes, option] : profile.dataTypes.filter((item) => item !== option);
                  set("dataTypes", dataTypes);
                }}
              />
              {option}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Purpose of processing"><textarea className="field-input min-h-24 w-full" value={profile.purposes} onChange={(event) => set("purposes", event.target.value)} required /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Children's data"><Select value={profile.childrenData} onChange={(value) => set("childrenData", value as GapProfile["childrenData"])} options={["yes", "no", "unsure"]} labels={["Yes", "No", "Not sure"]} /></Field>
        <Field label="Third-party processors"><Select value={profile.processors} onChange={(value) => set("processors", value as GapProfile["processors"])} options={["yes", "no", "unsure"]} labels={["Yes", "No", "Not sure"]} /></Field>
        <Field label="International transfers"><Select value={profile.crossBorder} onChange={(value) => set("crossBorder", value as GapProfile["crossBorder"])} options={["yes", "no", "unsure"]} labels={["Yes", "No", "Not sure"]} /></Field>
        <Field label="Significant Data Fiduciary"><Select value={profile.sdf} onChange={(value) => set("sdf", value as GapProfile["sdf"])} options={["designated", "not_designated", "unsure"]} labels={["Notified as an SDF", "Not notified", "Not sure"]} /></Field>
      </div>
      <Field label="Existing privacy and security governance"><textarea className="field-input min-h-24 w-full" value={profile.governance} onChange={(event) => set("governance", event.target.value)} required /></Field>
      <div className="flex gap-2">
        <button type="button" className="btn btn-secondary" onClick={onBack}>Back</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>Save and continue</button>
      </div>
    </form>
  );
}

function Results({ assessment, onRemediate, onQuestions }: { assessment: Assessment; onRemediate: () => void; onQuestions: () => void }) {
  const analysis = assessment.analysis;
  const narrative = useMemo(
    () => (analysis ? gapReportNarrative(assessment.profile, assessment.responses, analysis) : []),
    [analysis, assessment.profile, assessment.responses],
  );
  if (!analysis) return null;
  const maxSeverity = Math.max(1, ...Object.values(analysis.severityCounts));
  const areas = GAP_AREAS.map((area) => ({
    ...area,
    controls: GAP_CONTROLS.filter((item) => item.area === area.id && controlApplies(item, assessment.profile)),
  }));
  return (
    <section className="mt-8 space-y-6">
      <article className="rounded-2xl border border-[#E5E7EB] bg-white p-6">
        <BrandLogo height={52} />
        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-[#00A88F]">DPDP Compliance Gap Assessment</p>
        <h2 className="mt-1 text-2xl font-bold text-[#0B2C4A]">{assessment.profile.companyName || "Organisation"}</h2>
        <p className="mt-1 text-sm text-[#5D6B73]">
          {analysis.assessedOn} · {analysis.label} · Score {analysis.score === null ? "not scored" : `${analysis.score} / 100`} · Coverage {analysis.coverage}%
        </p>
      </article>
      <div className="flex flex-wrap gap-2">
        <a className="btn btn-primary" href={`/api/tools/gap-assessment/${assessment.id}/pdf`}>Download assessment report</a>
        <button type="button" className="btn btn-secondary" onClick={onRemediate}>Remediation tracker</button>
        <button type="button" className="btn btn-ghost" onClick={onQuestions}>Review answers</button>
      </div>
      <article className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
        <h2 className="text-base font-semibold text-[#0B2C4A]">Detailed summary</h2>
        <div className="mt-3 space-y-3">
          {narrative.map((paragraph) => (
            <p key={paragraph.slice(0, 48)} className="text-sm leading-6 text-[#4B5563]">{paragraph}</p>
          ))}
        </div>
      </article>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Readiness" value={analysis.score === null ? "—" : `${analysis.score}`} hint="Internal indicator, not a certificate" />
        <Metric label="Coverage" value={`${analysis.coverage}%`} hint={`${analysis.assessed} of ${analysis.applicable} applicable controls`} />
        <Metric label="Implemented" value={String(analysis.implemented)} hint={`${analysis.partial} partial · ${analysis.missing} missing`} />
        <Metric label="Critical gaps" value={String(analysis.criticalGaps)} hint="Includes duties that have not commenced" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Chart title="Category readiness" rows={analysis.areas.filter((area) => area.applicable > 0).map((area) => ({ label: area.label, value: area.score ?? 0 }))} max={100} />
        <Chart title="Findings by severity" rows={(["critical", "high", "medium", "low"] as const).map((key) => ({ label: key, value: analysis.severityCounts[key] ?? 0 }))} max={maxSeverity} />
      </div>
      <Chart
        title="Implementation status"
        rows={[
          { label: "Implemented", value: analysis.implemented },
          { label: "Partial", value: analysis.partial },
          { label: "Missing", value: analysis.missing },
          { label: "Not applicable", value: analysis.notApplicable },
          { label: "Not assessed", value: analysis.unassessed },
        ]}
        max={Math.max(1, analysis.applicable)}
      />
      <article className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
        <h2 className="text-base font-semibold text-[#0B2C4A]">Category scores</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-[640px] w-full text-left text-sm">
            <thead className="border-b border-[#E5E7EB] text-xs uppercase tracking-wide text-[#5D6B73]">
              <tr>
                <th className="py-2 pr-3">Area</th>
                <th className="py-2 pr-3">Score</th>
                <th className="py-2 pr-3">Implemented</th>
                <th className="py-2 pr-3">Partial</th>
                <th className="py-2 pr-3">Missing</th>
                <th className="py-2">Applicable</th>
              </tr>
            </thead>
            <tbody>
              {analysis.areas.map((area) => (
                <tr key={area.id} className="border-b border-[#E5E7EB]">
                  <td className="py-2 pr-3 text-[#0B2C4A]">{area.label}</td>
                  <td className="py-2 pr-3 tabular-nums">{area.score === null ? "—" : `${area.score} / 100`}</td>
                  <td className="py-2 pr-3 tabular-nums">{area.implemented}</td>
                  <td className="py-2 pr-3 tabular-nums">{area.partial}</td>
                  <td className="py-2 pr-3 tabular-nums">{area.missing}</td>
                  <td className="py-2 tabular-nums">{area.applicable}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
      <article className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
        <h2 className="text-base font-semibold text-[#0B2C4A]">Questions and answers</h2>
        <div className="mt-4 space-y-6">
          {areas.map((area) => (
            <section key={area.id}>
              <h3 className="text-sm font-semibold text-[#0B2C4A]">{area.label}</h3>
              <p className="mt-1 text-sm leading-6 text-[#5D6B73]">{area.summary}</p>
              {area.controls.length === 0 ? <p className="mt-2 text-sm text-[#5D6B73]">No control in this area applied to the company profile.</p> : null}
              <ol className="mt-3 space-y-3">
                {area.controls.map((item, index) => {
                  const response = responseOf(assessment.responses, item.id);
                  const finding = analysis.findings.find((entry) => entry.id === item.id);
                  return (
                    <li key={item.id} className="rounded-xl border border-[#E5E7EB] px-4 py-3">
                      <p className="text-sm font-semibold text-[#0B2C4A]">{index + 1}. {item.title}</p>
                      <p className="mt-1 text-sm font-semibold text-[#00A88F]">Answer: {answerLabel(response.status as GapAnswer)}</p>
                      <p className="mt-2 text-sm leading-6 text-[#4B5563]">{item.description}</p>
                      <p className="mt-1 text-xs text-[#5D6B73]">{controlReference(item)}</p>
                      <p className="mt-2 text-sm text-[#0B2C4A]">Remarks: {response.remarks.trim() || "None recorded."}</p>
                      <p className="mt-1 text-sm text-[#0B2C4A]">Evidence note: {response.evidence.trim() || "None recorded."}</p>
                      {finding ? (
                        <div className="mt-2 space-y-1 text-sm leading-6 text-[#4B5563]">
                          <p>Gap: {finding.explanation}</p>
                          <p>Recommended action: {finding.action}</p>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      </article>
      <article className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
        <h2 className="text-base font-semibold text-[#0B2C4A]">Regulatory status</h2>
        <ul className="mt-3 space-y-3">
          {analysis.regulatory.map((item) => (
            <li key={item.id}>
              <p className="text-sm font-semibold text-[#0B2C4A]">{item.title} · {item.state === "in_force" ? "In force" : "Upcoming"}</p>
              <p className="text-sm leading-6 text-[#4B5563]">{item.detail}</p>
            </li>
          ))}
        </ul>
      </article>
      <article className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
        <h2 className="text-base font-semibold text-[#0B2C4A]">Findings</h2>
        {analysis.findings.length === 0 ? <p className="mt-3 text-sm text-[#5D6B73]">No gaps were recorded from the answers given.</p> : null}
        <div className="mt-3 space-y-3">
          {analysis.findings.map((finding) => (
            <details key={finding.id} className="rounded-xl border border-[#E5E7EB] px-4 py-3">
              <summary className="cursor-pointer text-sm font-semibold text-[#0B2C4A]">{finding.title}</summary>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-[#B54708]">{finding.severity} · {finding.enforceability === "upcoming" ? `Upcoming ${finding.commences}` : "In force"} · {finding.kind}</p>
              <p className="mt-2 text-sm leading-6 text-[#4B5563]">{finding.explanation}</p>
              <p className="mt-2 text-sm text-[#0B2C4A]">{finding.action}</p>
              <p className="mt-2 text-xs text-[#5D6B73]">{finding.reference}</p>
              <p className="mt-1 text-xs text-[#5D6B73]">Evidence to keep: {finding.evidence}</p>
            </details>
          ))}
        </div>
      </article>
      {assessment.cmp ? <p className="text-sm text-[#4B5563]">Workspace context used as evidence to review, not as a pass: {assessment.cmp.consentRecords} consent records, {assessment.cmp.publishedPolicies} published policy versions, {assessment.cmp.purposes} purposes.</p> : null}
    </section>
  );
}

function Remediation({
  findings,
  remediation,
  saving,
  onChange,
  onSave,
}: {
  findings: GapAnalysis["findings"];
  remediation: Record<string, GapRemediation>;
  saving: boolean;
  onChange: (id: string, patch: Partial<GapRemediation>) => void;
  onSave: () => void;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold text-[#0B2C4A]">Remediation tracker</h2>
      <p className="mt-2 text-sm text-[#4B5563]">A finding is verified only after someone marks it verified while it is under review or resolved. Verification is an internal review, not a Board sign-off.</p>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-[#E5E7EB] bg-white">
        <table className="min-w-[760px] w-full text-left text-sm">
          <thead className="border-b border-[#E5E7EB] text-xs uppercase tracking-wide text-[#5D6B73]">
            <tr>
              <th className="px-3 py-3">Finding</th>
              <th className="px-3 py-3">Owner</th>
              <th className="px-3 py-3">Due</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Evidence</th>
            </tr>
          </thead>
          <tbody>
            {findings.map((finding) => {
              const item = remediation[finding.id] ?? { owner: "", due: "", status: "open" as RemediationStatus, evidence: "", verified: false };
              return (
                <tr key={finding.id} className="border-b border-[#E5E7EB] align-top">
                  <td className="px-3 py-3">
                    <p className="font-medium text-[#0B2C4A]">{finding.title}</p>
                    <p className="text-xs text-[#5D6B73]">{finding.severity}</p>
                    <label className="mt-2 flex items-center gap-2 text-xs text-[#4B5563]">
                      <input
                        type="checkbox"
                        checked={item.verified}
                        disabled={item.status !== "under_review" && item.status !== "resolved"}
                        onChange={(event) => onChange(finding.id, { verified: event.target.checked })}
                      />
                      Verified after review
                    </label>
                  </td>
                  <td className="px-3 py-3"><input className="field-input w-36" value={item.owner} maxLength={120} onChange={(event) => onChange(finding.id, { owner: event.target.value })} /></td>
                  <td className="px-3 py-3"><input className="field-input w-36" type="date" value={item.due} onChange={(event) => onChange(finding.id, { due: event.target.value })} /></td>
                  <td className="px-3 py-3">
                    <select className="field-input w-40" value={item.status} onChange={(event) => onChange(finding.id, { status: event.target.value as RemediationStatus, verified: false })}>
                      {REMEDIATION_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-3"><textarea className="field-input min-h-16 w-52" value={item.evidence} maxLength={2000} onChange={(event) => onChange(finding.id, { evidence: event.target.value })} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button type="button" className="btn btn-primary mt-4" disabled={saving} onClick={onSave}>Save remediation</button>
    </section>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <article className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#5D6B73]">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[#0B2C4A]">{value}</p>
      <p className="mt-1 text-xs text-[#5D6B73]">{hint}</p>
    </article>
  );
}

function Chart({ title, rows, max }: { title: string; rows: Array<{ label: string; value: number }>; max: number }) {
  return (
    <article className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
      <h2 className="text-base font-semibold text-[#0B2C4A]">{title}</h2>
      <ul className="mt-4 space-y-2">
        {rows.map((row) => (
          <li key={row.label}>
            <div className="flex items-center justify-between gap-3 text-xs text-[#4B5563]">
              <span className="truncate">{row.label}</span>
              <span className="tabular-nums">{row.value}</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-[#E6F7F3]">
              <div className="h-full rounded-full bg-[#00A88F]" style={{ width: `${Math.max(0, Math.min(100, (row.value / max) * 100))}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </article>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-xs font-medium text-[#5D6B73]">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Select({ value, onChange, options, labels }: { value: string; onChange: (value: string) => void; options: readonly string[]; labels?: string[] }) {
  return (
    <select className="field-input w-full" value={value} onChange={(event) => onChange(event.target.value)} required>
      <option value="">Select</option>
      {options.map((option, index) => <option key={option} value={option}>{labels?.[index] ?? option}</option>)}
    </select>
  );
}
