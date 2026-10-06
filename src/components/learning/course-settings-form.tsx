"use client";

import { useState, type FormEvent } from "react";

export function CourseSettingsForm({
  passPercent,
  examPassPercent,
  examQuestionCount,
}: {
  passPercent: number;
  examPassPercent: number;
  examQuestionCount: number;
}) {
  const [message, setMessage] = useState<string | null>(null);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/learning/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        passPercent: Number(formData.get("passPercent")),
        examPassPercent: Number(formData.get("examPassPercent")),
        examQuestionCount: Number(formData.get("examQuestionCount")),
      }),
    });
    setMessage(response.ok ? "Course settings saved." : "Settings were not saved.");
  }

  return (
    <form onSubmit={save} className="grid gap-3 rounded-xl border border-[var(--border)] bg-white p-4 sm:grid-cols-3">
      <label className="text-sm">Module pass score %
        <input className="mt-1 w-full rounded-lg border px-3 py-2" name="passPercent" type="number" min={1} max={100} defaultValue={passPercent} />
      </label>
      <label className="text-sm">Final exam pass score %
        <input className="mt-1 w-full rounded-lg border px-3 py-2" name="examPassPercent" type="number" min={1} max={100} defaultValue={examPassPercent} />
      </label>
      <label className="text-sm">Final exam questions
        <input className="mt-1 w-full rounded-lg border px-3 py-2" name="examQuestionCount" type="number" min={30} max={120} defaultValue={examQuestionCount} />
      </label>
      <button type="submit" className="rounded-lg bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white sm:col-span-3 sm:w-fit">
        Save settings
      </button>
      {message ? <p className="text-sm sm:col-span-3">{message}</p> : null}
    </form>
  );
}
