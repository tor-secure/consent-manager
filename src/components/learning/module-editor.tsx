"use client";

import { useState, type FormEvent } from "react";

type EditorModule = {
  slug: string;
  summary: string;
  lessonContent: string;
  videoScript: string;
  videoUrl: string | null;
  videoProvider: string;
  status: string;
};

export function ModuleEditor({ module }: { module: EditorModule }) {
  const [message, setMessage] = useState<string | null>(null);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const response = await fetch(`/api/learning/modules/${module.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: String(formData.get("summary") ?? ""),
        lessonContent: String(formData.get("lessonContent") ?? ""),
        videoScript: String(formData.get("videoScript") ?? ""),
        videoUrl: String(formData.get("videoUrl") ?? "") || null,
        videoProvider: String(formData.get("videoProvider") ?? "placeholder"),
        status: String(formData.get("status") ?? "published"),
      }),
    });
    setMessage(response.ok ? "Module saved." : "Module was not saved.");
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <label className="block text-sm">Summary
        <textarea className="mt-1 w-full rounded-lg border px-3 py-2" name="summary" rows={3} defaultValue={module.summary} />
      </label>
      <label className="block text-sm">Lesson
        <textarea className="mt-1 w-full rounded-lg border px-3 py-2" name="lessonContent" rows={12} defaultValue={module.lessonContent} />
      </label>
      <label className="block text-sm">Video script
        <textarea className="mt-1 w-full rounded-lg border px-3 py-2" name="videoScript" rows={12} defaultValue={module.videoScript} />
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm">Video provider
          <select className="mt-1 w-full rounded-lg border px-3 py-2" name="videoProvider" defaultValue={module.videoProvider}>
            <option value="placeholder">placeholder</option>
            <option value="youtube">youtube</option>
            <option value="vimeo">vimeo</option>
            <option value="mp4">mp4</option>
            <option value="embed">embed</option>
          </select>
        </label>
        <label className="text-sm sm:col-span-2">Video URL
          <input className="mt-1 w-full rounded-lg border px-3 py-2" name="videoUrl" defaultValue={module.videoUrl ?? ""} />
        </label>
      </div>
      <label className="block text-sm">Status
        <select className="mt-1 rounded-lg border px-3 py-2" name="status" defaultValue={module.status}>
          <option value="published">published</option>
          <option value="draft">draft</option>
        </select>
      </label>
      <button type="submit" className="rounded-lg bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white">Save module</button>
      {message ? <p className="text-sm">{message}</p> : null}
    </form>
  );
}
