"use client";

import { useState, type FormEvent } from "react";

type Option = { id: string; label: string; isCorrect: boolean };
type Question = { id: string; prompt: string; explanation: string; questionType: string; bank: string; options: Option[] };

export function QuestionEditor({ question }: { question: Question }) {
  const [message, setMessage] = useState<string | null>(null);
  const [options, setOptions] = useState(question.options.map((option) => ({ ...option })));

  function toggle(optionId: string) {
    setOptions((current) =>
      current.map((option) => {
        if (question.questionType === "multi") {
          return option.id === optionId ? { ...option, isCorrect: !option.isCorrect } : option;
        }
        return { ...option, isCorrect: option.id === optionId };
      }),
    );
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const response = await fetch(`/api/learning/questions/${question.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: String(formData.get("prompt") ?? ""),
        explanation: String(formData.get("explanation") ?? ""),
        options: options.map((option) => ({ id: option.id, label: option.label, correct: option.isCorrect })),
      }),
    });
    setMessage(response.ok ? "Question saved." : "Question was not saved.");
  }

  return (
    <form onSubmit={save} className="space-y-2 rounded-xl border border-[var(--border)] p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{question.bank} · {question.questionType}</p>
      <label className="block text-sm">Question
        <textarea className="mt-1 w-full rounded-lg border px-3 py-2" name="prompt" rows={3} defaultValue={question.prompt} />
      </label>
      <fieldset>
        <legend className="text-sm">Correct option</legend>
        {options.map((option) => (
          <label key={option.id} className="mt-1 flex gap-2 text-sm">
            <input
              type={question.questionType === "multi" ? "checkbox" : "radio"}
              name={`correct-${question.id}`}
              checked={option.isCorrect}
              onChange={() => toggle(option.id)}
            />
            <input
              className="w-full rounded-lg border px-2 py-1"
              value={option.label}
              onChange={(event) =>
                setOptions((current) => current.map((item) => (item.id === option.id ? { ...item, label: event.target.value } : item)))
              }
            />
          </label>
        ))}
      </fieldset>
      <label className="block text-sm">Explanation
        <textarea className="mt-1 w-full rounded-lg border px-3 py-2" name="explanation" rows={3} defaultValue={question.explanation} />
      </label>
      <button type="submit" className="rounded-lg border px-3 py-2 text-sm font-semibold">Save question</button>
      {message ? <p className="text-sm">{message}</p> : null}
    </form>
  );
}
