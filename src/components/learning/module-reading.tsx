"use client";

import { useEffect, useMemo, useState } from "react";

import { LessonActions } from "@/components/learning/lesson-actions";
import { StatusIcon } from "@/components/learning/status-icon";
import { VideoPlayer } from "@/components/learning/video-player";
import { card } from "@/components/learning/ui";
import { PDF_SECTION_HEADINGS, readingSectionIds } from "@/lib/learning/lesson-sections";
import { moduleGlossary } from "@/lib/learning/module-glossary";
import { modulePrerequisite } from "@/lib/learning/module-prerequisites";

const LIST_SECTIONS = new Set(["objectives", "Do's", "Don'ts", "Practical Checklist", "5-Question Knowledge Check"]);
const ORDERED_SECTIONS = new Set(["objectives", "Practical Checklist", "5-Question Knowledge Check"]);

type ReadingSection = {
  id: string;
  title: string;
  paragraphs: string[];
};

type VideoLesson = {
  provider: string;
  url: string | null;
  title: string;
  minutes: number;
};

function sectionsFromLesson(moduleNumber: number, objectives: string[], lesson: string): ReadingSection[] {
  const fromLesson: ReadingSection[] = [];
  let current: ReadingSection | null = null;
  for (const block of lesson.split("\n\n")) {
    if (PDF_SECTION_HEADINGS.has(block)) {
      current = { id: block, title: block, paragraphs: [] };
      fromLesson.push(current);
      continue;
    }
    if (current) current.paragraphs.push(block);
  }
  const introduction = fromLesson.find((section) => section.id === "Introduction");
  const glossary = moduleGlossary(moduleNumber);
  const rest = fromLesson
    .filter((section) => section.id !== "Introduction")
    .map((section) =>
      section.id === "What Should the Organisation Do?" && glossary
        ? { ...section, paragraphs: [glossary.organisationAction] }
        : section,
    );
  const prerequisite = modulePrerequisite(moduleNumber);
  return [
    { id: "prerequisites", title: "Prerequisites", paragraphs: prerequisite ? [prerequisite] : [] },
    { id: "glossary", title: "Glossary", paragraphs: [] },
    ...(introduction ? [introduction] : []),
    { id: "objectives", title: "Learning Objectives", paragraphs: objectives },
    { id: "video", title: "Video", paragraphs: [] },
    ...rest,
  ];
}

function GlossaryBody({ moduleNumber }: { moduleNumber: number }) {
  const glossary = moduleGlossary(moduleNumber);
  if (!glossary) return null;
  return (
    <div className="mt-4 space-y-4">
      <ul className="space-y-2.5">
        {glossary.terms.map((item) => (
          <li key={item.term} className="flex gap-3 text-[15px] leading-7 text-[#0B2C4A]">
            <span aria-hidden="true" className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#00C4A7]" />
            <span className="min-w-0 flex-1 text-justify">
              <strong className="font-semibold">{item.term}</strong>
              {" — "}
              {item.definition}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-justify text-base leading-7 text-[#0B2C4A]">
        <strong className="font-semibold">Before this module: </strong>
        {glossary.before}
      </p>
    </div>
  );
}

function continues(previous: string, next: string) {
  if (/[.!?:;]$/.test(previous)) return false;
  if (/^(?:Sections?\s+\d+|Rules?\s+\d+|Real-life:|Corporate:|Technology:|\d+\.\s)/.test(next)) return false;
  return true;
}

function mergeLines(parts: string[]) {
  const merged: string[] = [];
  for (const raw of parts) {
    const part = raw.replace(/\s+/g, " ").trim();
    if (!part) continue;
    const previous = merged.at(-1);
    if (previous && continues(previous, part)) merged[merged.length - 1] = `${previous} ${part}`;
    else merged.push(part);
  }
  return merged;
}

function splitUnits(text: string) {
  return text
    .split(/\s+(?=(?:Sections?\s+\d+|Rules?\s+\d+|Real-life:|Corporate:|Technology:|Learning point:|\d+\.\s))/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function labeled(text: string) {
  const match =
    text.match(
      /^((?:Sections|Section|Rules|Rule)\s+\d+(?:(?:\s*[-,]\s*|\s+and\s+)\d+)*|Real-life|Corporate|Technology|Learning point)\s*:\s*([\s\S]*)$/,
    ) ?? text.match(/^((?:Rule|Section)\s+\d+)\s+([\s\S]+)$/);
  if (!match) return { text };
  return { label: `${match[1].trim()}:`, text: match[2].trim() };
}

function RichText({ label, text }: { label?: string; text: string }) {
  return (
    <>
      {label ? <strong className="font-semibold">{label} </strong> : null}
      {text}
    </>
  );
}

const FINISHED_STORAGE_PREFIX = "cg-lesson-finished:";

function storedFinished(slug: string, sectionIds: string[]): string[] {
  try {
    const raw = localStorage.getItem(`${FINISHED_STORAGE_PREFIX}${slug}`);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    const known = new Set(sectionIds);
    return parsed.filter((id): id is string => typeof id === "string" && known.has(id));
  } catch {
    return [];
  }
}

function sectionUnlocked(sections: ReadingSection[], finished: string[], index: number) {
  return sections.slice(0, index).every((section) => finished.includes(section.id));
}

function SectionBody({ sectionId, paragraphs }: { sectionId: string; paragraphs: string[] }) {
  const units = mergeLines(paragraphs).flatMap(splitUnits);
  if (LIST_SECTIONS.has(sectionId)) {
    const ordered = ORDERED_SECTIONS.has(sectionId);
    const ListTag = ordered ? "ol" : "ul";
    return (
      <ListTag className={`mt-4 space-y-2.5 ${ordered ? "list-decimal pl-6" : ""}`}>
        {units.map((item) => {
          const piece = labeled(item.replace(/^\d+\.\s*/, ""));
          return (
            <li key={item} className="text-justify text-[15px] leading-7 text-[#0B2C4A]">
              {ordered ? (
                <RichText label={piece.label} text={piece.text} />
              ) : (
                <span className="flex gap-3">
                  <span aria-hidden="true" className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#00C4A7]" />
                  <span className="min-w-0 flex-1">
                    <RichText label={piece.label} text={piece.text} />
                  </span>
                </span>
              )}
            </li>
          );
        })}
      </ListTag>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      {units.map((item) => {
        const piece = labeled(item);
        return (
          <p key={item} className="text-justify text-base leading-7 text-[#0B2C4A]">
            <RichText label={piece.label} text={piece.text} />
          </p>
        );
      })}
    </div>
  );
}

export function ModuleReading({
  moduleNumber,
  objectives,
  lesson,
  video,
  slug,
  lessonComplete,
  quizPassed,
  passPercent,
}: {
  moduleNumber: number;
  objectives: string[];
  lesson: string;
  video: VideoLesson;
  slug: string;
  lessonComplete: boolean;
  quizPassed: boolean;
  passPercent: number;
}) {
  const sections = useMemo(() => sectionsFromLesson(moduleNumber, objectives, lesson), [moduleNumber, objectives, lesson]);
  const requiredIds = useMemo(() => readingSectionIds(lesson), [lesson]);
  const [selectedId, setSelectedId] = useState(sections[0]?.id ?? "video");
  const [finished, setFinished] = useState<string[]>([]);
  const selected = sections.find((section) => section.id === selectedId) ?? sections[0];

  useEffect(() => {
    const stored = storedFinished(slug, sections.map((section) => section.id));
    if (stored.length === 0) return;
    setFinished(stored);
    const nextIndex = sections.findIndex((section, index) => sectionUnlocked(sections, stored, index) && !stored.includes(section.id));
    if (nextIndex >= 0) setSelectedId(sections[nextIndex].id);
    else if (sections.every((section) => stored.includes(section.id))) setSelectedId(sections[sections.length - 1].id);
  }, [sections, slug]);

  function markFinished(id: string) {
    if (finished.includes(id)) return;
    const next = [...finished, id];
    try {
      localStorage.setItem(`${FINISHED_STORAGE_PREFIX}${slug}`, JSON.stringify(next));
    } catch {
      // Progress still applies for this visit if storage is unavailable.
    }
    setFinished(next);
    const index = sections.findIndex((section) => section.id === id);
    const following = sections[index + 1];
    if (following) setSelectedId(following.id);
  }

  if (!selected) return null;

  const finishedCount = requiredIds.filter((id) => finished.includes(id)).length;
  const selectedFinished = finished.includes(selected.id);

  return (
    <>
    <div className="grid gap-4 lg:h-[calc(100dvh-15rem)] lg:min-h-[32rem] lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)]">
      <ol className="lesson-scroll max-h-80 overflow-y-auto rounded-xl border border-[#d5e3e0] bg-white lg:h-full lg:max-h-none lg:min-h-0" aria-label="Lesson sections">
        {sections.map((section, index) => {
          const active = section.id === selected.id;
          const done = finished.includes(section.id);
          const unlocked = sectionUnlocked(sections, finished, index);
          return (
            <li key={section.id} className="border-b border-[#d5e3e0] last:border-b-0">
              <button
                type="button"
                aria-pressed={active}
                aria-disabled={!unlocked}
                disabled={!unlocked}
                onClick={() => {
                  if (unlocked) setSelectedId(section.id);
                }}
                className={`flex w-full items-center gap-3 px-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00C4A7] disabled:cursor-not-allowed ${
                  active ? "bg-[#E6F9F5]" : unlocked ? "hover:bg-[#f7fbfa]" : "bg-[#f7fbfa]"
                }`}
              >
                <span className={`w-6 shrink-0 text-xs font-semibold tabular-nums ${unlocked ? "text-[#4d6570]" : "text-[#8aa0a8]"}`}>{String(index + 1).padStart(2, "0")}</span>
                <span className={`min-w-0 flex-1 text-sm leading-5 ${unlocked ? "text-[#0B2C4A]" : "text-[#8aa0a8]"} ${active ? "font-semibold" : ""}`}>{section.title}</span>
                {done ? <StatusIcon status="completed" size={18} /> : unlocked ? <span className="sr-only">Not finished</span> : <StatusIcon status="locked" size={18} />}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="flex h-full min-h-[16rem] flex-col overflow-hidden rounded-xl border border-[#d5e3e0] bg-white lg:min-h-0">
        <div
          className={
            selected.id === "video"
              ? "flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[#0f172a]"
              : "lesson-scroll min-h-0 flex-1 overflow-y-auto"
          }
        >
          {selected.id === "video" ? (
            <div className="@container flex h-full w-full items-center justify-center overflow-hidden">
              <div className="relative aspect-video w-full max-h-full overflow-hidden lg:w-[min(100%,calc(100cqh*16/9))]">
                <div className="absolute inset-0">
                  <VideoPlayer video={video} />
                </div>
              </div>
            </div>
          ) : (
            <article className="p-5 text-left sm:p-6">
              <h2 className="text-lg font-semibold text-[#0B2C4A]">{selected.title}</h2>
              {selected.id === "glossary" ? (
                <GlossaryBody moduleNumber={moduleNumber} />
              ) : (
                <SectionBody sectionId={selected.id} paragraphs={selected.paragraphs} />
              )}
            </article>
          )}
        </div>
        <label className={`flex items-center gap-3 border-t border-[#d5e3e0] px-4 py-3 text-sm font-semibold text-[#0B2C4A] ${selectedFinished ? "" : "cursor-pointer"}`}>
          <input
            type="checkbox"
            checked={selectedFinished}
            disabled={selectedFinished}
            onChange={() => markFinished(selected.id)}
            className="h-5 w-5 rounded border-[#0B2C4A] accent-[#00C4A7] disabled:opacity-100"
          />
          Finished
        </label>
      </div>
    </div>
    <section aria-label="Module actions" className={`${card} flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between`}>
      <div>
        <p className="text-base font-semibold">
          {quizPassed ? "Module complete" : lessonComplete ? "Ready for the quiz" : "Finished the lesson?"}
        </p>
        <p className="mt-1 text-justify text-sm text-[#4d6570]">
          {quizPassed
            ? "You passed this module quiz. You can retake it at any time."
            : lessonComplete
              ? `Score ${passPercent}% or more to unlock the next module.`
              : finishedCount === requiredIds.length
                ? "Mark the lesson complete to open the module quiz."
                : `Finish each section in order. ${requiredIds.length - finishedCount} still to finish.`}
        </p>
      </div>
      <LessonActions
        slug={slug}
        lessonComplete={lessonComplete}
        quizPassed={quizPassed}
        sectionsReady={finishedCount === requiredIds.length}
        sectionIds={requiredIds.filter((id) => finished.includes(id))}
      />
    </section>
    </>
  );
}
