"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { LessonActions } from "@/components/learning/lesson-actions";
import { StatusIcon } from "@/components/learning/status-icon";
import { VideoPlayer } from "@/components/learning/video-player";
import {
  DOS_AND_DONTS_SECTION_ID,
  PDF_SECTION_HEADINGS,
  readingSectionIds,
} from "@/lib/learning/lesson-sections";
import { moduleGlossary } from "@/lib/learning/module-glossary";
import { modulePrerequisite } from "@/lib/learning/module-prerequisites";

const LIST_SECTIONS = new Set(["objectives", "Do's", "Don'ts", DOS_AND_DONTS_SECTION_ID, "Practical Checklist", "5-Question Knowledge Check"]);
const ORDERED_SECTIONS = new Set(["objectives", "Practical Checklist", "5-Question Knowledge Check"]);

type ReadingGroup = {
  heading: string;
  paragraphs: string[];
};

type ReadingSection = {
  id: string;
  title: string;
  paragraphs: string[];
  groups?: ReadingGroup[];
};

type VideoLesson = {
  provider: string;
  url: string | null;
  title: string;
  minutes: number;
};

function mergeDosAndDonts(sections: ReadingSection[]): ReadingSection[] {
  const merged: ReadingSection[] = [];
  for (const section of sections) {
    if (section.id === "Do's" || section.id === "Don'ts") {
      const existing = merged.find((item) => item.id === DOS_AND_DONTS_SECTION_ID);
      const group = { heading: section.id, paragraphs: section.paragraphs };
      if (existing) {
        existing.groups = [...(existing.groups ?? []), group];
        continue;
      }
      merged.push({
        id: DOS_AND_DONTS_SECTION_ID,
        title: DOS_AND_DONTS_SECTION_ID,
        paragraphs: [],
        groups: [group],
      });
      continue;
    }
    merged.push(section);
  }
  return merged;
}

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
  const rest = mergeDosAndDonts(
    fromLesson
      .filter((section) => section.id !== "Introduction")
      .map((section) =>
        section.id === "What Should the Organisation Do?" && glossary
          ? { ...section, paragraphs: [glossary.organisationAction] }
          : section,
      ),
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
    <ul className="mt-5 space-y-3 text-justify">
      {glossary.terms.map((item) => (
        <li key={item.term} className="flex gap-3 text-[15px] leading-7 text-[#0B2C4A]">
          <span aria-hidden="true" className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#00C4A7]" />
          <span className="min-w-0 flex-1">
            <strong className="font-semibold">{item.term}</strong>
            {" — "}
            {emphasizeCitations(item.definition)}
          </span>
        </li>
      ))}
    </ul>
  );
}

const CITE_SOURCE =
  "(?:Sections|Section|Rules|Rule)\\s+\\d+(?:\\(\\d+\\))?(?:-\\(\\d+\\)|-\\d+)?(?:(?:\\s*,\\s*|\\s+and\\s+)\\d+(?:\\(\\d+\\))?(?:-\\(\\d+\\)|-\\d+)?)*";

function continues(previous: string, next: string) {
  if (/[.!?:;]$/.test(previous)) return false;
  if (new RegExp(`^(?:${CITE_SOURCE}\\s*:|Real-life:|Corporate:|Technology:|\\d+\\.\\s)`).test(next)) return false;
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
    .split(new RegExp(`\\s+(?=(?:${CITE_SOURCE}\\s*:|Real-life:|Corporate:|Technology:|Learning point:|\\d+\\.\\s))`))
    .map((part) => part.trim())
    .filter(Boolean);
}

const LEGAL_CITE = new RegExp(`\\b${CITE_SOURCE}`, "g");

function emphasizeCitations(text: string): ReactNode {
  const nodes: ReactNode[] = [];
  let last = 0;
  LEGAL_CITE.lastIndex = 0;
  for (const match of text.matchAll(LEGAL_CITE)) {
    const index = match.index ?? 0;
    if (index > last) nodes.push(text.slice(last, index));
    nodes.push(
      <strong key={`${index}-${match[0]}`} className="font-semibold">
        {match[0]}
      </strong>,
    );
    last = index + match[0].length;
  }
  if (nodes.length === 0) return text;
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function labeled(text: string) {
  const match = text.match(
    new RegExp(`^(${CITE_SOURCE}|Real-life|Corporate|Technology|Learning point)\\s*:\\s*([\\s\\S]*)$`),
  );
  if (!match) return { text };
  return { label: `${match[1].trim()}:`, text: match[2].trim() };
}

function RichText({ label, text }: { label?: string; text: string }) {
  return (
    <>
      {label ? <strong className="font-semibold">{label} </strong> : null}
      {emphasizeCitations(text)}
    </>
  );
}

const VISITED_STORAGE_PREFIX = "cg-lesson-finished:";

/** Prerequisites + Glossary are always available; later sections unlock one by one after the previous is opened. */
const ALWAYS_OPEN_COUNT = 2;

function visitedStorageKey(learnerId: string, slug: string) {
  return `${VISITED_STORAGE_PREFIX}${learnerId}:${slug}`;
}

function storedVisited(learnerId: string, slug: string, sectionIds: string[]): string[] {
  try {
    const raw = localStorage.getItem(visitedStorageKey(learnerId, slug));
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    const known = new Set(sectionIds);
    const next = new Set<string>();
    for (const id of parsed) {
      if (typeof id !== "string") continue;
      if (id === "Do's" || id === "Don'ts") {
        if (known.has(DOS_AND_DONTS_SECTION_ID)) next.add(DOS_AND_DONTS_SECTION_ID);
        continue;
      }
      if (known.has(id)) next.add(id);
    }
    return [...next];
  } catch {
    return [];
  }
}

function sectionUnlocked(sections: ReadingSection[], visited: string[], index: number) {
  if (index < ALWAYS_OPEN_COUNT) return true;
  const previous = sections[index - 1];
  return Boolean(previous && visited.includes(previous.id));
}

function ListBody({ sectionId, paragraphs }: { sectionId: string; paragraphs: string[] }) {
  const units = mergeLines(paragraphs).flatMap(splitUnits);
  const ordered = ORDERED_SECTIONS.has(sectionId);
  const ListTag = ordered ? "ol" : "ul";
  return (
    <ListTag className={`space-y-3 text-justify ${ordered ? "list-decimal pl-6" : ""}`}>
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

function NextSectionButton({ title, onClick }: { title: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-xl border border-[#d5e3e0] bg-[#fbfdfc] px-4 py-2.5 text-sm font-semibold text-[#0B2C4A] transition-colors hover:border-[#0B2C4A] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00C4A7]"
    >
      Next: {title}
      <span aria-hidden="true">→</span>
    </button>
  );
}

function SectionBody({
  sectionId,
  paragraphs,
  groups,
}: {
  sectionId: string;
  paragraphs: string[];
  groups?: ReadingGroup[];
}) {
  if (groups && groups.length > 0) {
    return (
      <div className="mt-5 space-y-8 text-justify">
        {groups.map((group) => (
          <div key={group.heading}>
            <h3 className="text-base font-semibold text-[#0B2C4A]">{group.heading}</h3>
            <div className="mt-3">
              <ListBody sectionId={group.heading} paragraphs={group.paragraphs} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (LIST_SECTIONS.has(sectionId)) {
    return (
      <div className="mt-5 text-justify">
        <ListBody sectionId={sectionId} paragraphs={paragraphs} />
      </div>
    );
  }

  const units = mergeLines(paragraphs).flatMap(splitUnits);
  return (
    <div className="mt-5 space-y-4 text-justify">
      {units.map((item) => {
        const piece = labeled(item);
        return (
          <p key={item} className="text-justify text-base leading-8 text-[#0B2C4A]">
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
  learnerId,
}: {
  moduleNumber: number;
  objectives: string[];
  lesson: string;
  video: VideoLesson;
  slug: string;
  lessonComplete: boolean;
  quizPassed: boolean;
  passPercent: number;
  learnerId: string;
}) {
  const sections = useMemo(() => sectionsFromLesson(moduleNumber, objectives, lesson), [moduleNumber, objectives, lesson]);
  const requiredIds = useMemo(() => readingSectionIds(lesson), [lesson]);
  const contentStartRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState(sections[0]?.id ?? "prerequisites");
  const [visited, setVisited] = useState<string[]>([]);
  const selected = sections.find((section) => section.id === selectedId) ?? sections[0];
  const openedSlug = useRef(slug);
  if (openedSlug.current !== slug) {
    openedSlug.current = slug;
    setSelectedId(sections[0]?.id ?? "prerequisites");
    setVisited([]);
  }

  useEffect(() => {
    const stored = storedVisited(
      learnerId,
      slug,
      sections.map((section) => section.id),
    );
    const startId = sections[0]?.id ?? "prerequisites";
    // Prerequisites is recorded as soon as it is shown. That must not skip it for Glossary.
    if (stored.length === 0 || stored.every((id) => id === startId)) {
      setSelectedId(startId);
      if (stored.length > 0) setVisited(stored);
      return;
    }
    setVisited(stored);
    const nextIndex = sections.findIndex(
      (section, index) => sectionUnlocked(sections, stored, index) && !stored.includes(section.id),
    );
    if (nextIndex >= 0) setSelectedId(sections[nextIndex].id);
    else if (sections.every((section) => stored.includes(section.id))) {
      setSelectedId(sections[sections.length - 1].id);
    }
  }, [learnerId, sections, slug]);

  function markVisited(id: string) {
    setVisited((current) => {
      if (current.includes(id)) return current;
      const nextVisited = [...current, id];
      try {
        localStorage.setItem(visitedStorageKey(learnerId, slug), JSON.stringify(nextVisited));
      } catch {
        // Progress still applies for this visit if storage is unavailable.
      }
      return nextVisited;
    });
  }

  function openSection(id: string) {
    const index = sections.findIndex((section) => section.id === id);
    if (index < 0 || !sectionUnlocked(sections, visited, index)) return;
    setSelectedId(id);
    markVisited(id);
    contentStartRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Opening/viewing a section counts as progress and unlocks the next one.
  useEffect(() => {
    if (!selected) return;
    const index = sections.findIndex((section) => section.id === selected.id);
    if (index >= 0 && sectionUnlocked(sections, visited, index)) markVisited(selected.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the open section changes
  }, [selected?.id, sections, slug]);

  if (!selected) return null;

  const visitedCount = requiredIds.filter((id) => visited.includes(id)).length;
  const progressPercent = requiredIds.length ? Math.round((visitedCount / requiredIds.length) * 100) : 0;
  const selectedIndex = sections.findIndex((section) => section.id === selected.id);
  const nextSection = sections.find((section, index) => index > selectedIndex && sectionUnlocked(sections, visited, index));
  const onModuleSummary = selected.id === "Module Summary";
  // Mark-complete / quiz CTA appears after Module Summary (or anytime once the lesson is done).
  const showLessonActions = onModuleSummary || lessonComplete || quizPassed;

  return (
    <div className="rounded-2xl border border-[#d5e3e0] bg-white shadow-[0_18px_40px_-32px_rgba(11,44,74,0.35)]">
      <div className="flex flex-col border-b border-[#e4eeec] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#4d6570]">Lesson progress</p>
          <p className="mt-1 text-sm font-semibold text-[#0B2C4A]">
            {visitedCount} of {requiredIds.length} sections opened
          </p>
        </div>
        <div className="mt-3 flex min-w-[12rem] items-center gap-3 sm:mt-0 sm:w-56">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#e6eef0]" aria-hidden="true">
            <div className="h-full rounded-full bg-[#00C4A7] transition-[width] duration-300" style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="text-xs font-semibold tabular-nums text-[#4d6570]">{progressPercent}%</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-[17.5rem_minmax(0,1fr)] lg:items-start xl:grid-cols-[19rem_minmax(0,1fr)]">
        <aside className="border-b border-[#e4eeec] lg:border-b-0 lg:border-r lg:border-[#e4eeec]">
          <div className="px-4 py-3 lg:px-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#4d6570]">Sections</p>
          </div>
          <ol className="space-y-0.5 px-2 pb-4" aria-label="Lesson sections">
            {sections.map((section, index) => {
              const active = section.id === selected.id;
              const done = visited.includes(section.id);
              const unlocked = sectionUnlocked(sections, visited, index);
              return (
                <li key={section.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    aria-disabled={!unlocked}
                    disabled={!unlocked}
                    onClick={() => openSection(section.id)}
                    className={`relative flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00C4A7] disabled:cursor-not-allowed ${
                      active
                        ? "bg-[#E6F9F5] text-[#0B2C4A] shadow-[inset_3px_0_0_0_#00C4A7]"
                        : unlocked
                          ? "text-[#0B2C4A] hover:bg-[#f7fbfa]"
                          : "text-[#8aa0a8]"
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold tabular-nums ${
                        active ? "bg-white text-[#0B2C4A]" : done ? "bg-[#E6F9F5] text-[#0B2C4A]" : "bg-[#f3f7f6] text-[#4d6570]"
                      }`}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className={`min-w-0 flex-1 text-sm leading-5 ${active ? "font-semibold" : "font-medium"}`}>
                      {section.title}
                    </span>
                    {done ? (
                      <StatusIcon status="completed" size={18} />
                    ) : unlocked ? (
                      <span className="sr-only">Available</span>
                    ) : (
                      <StatusIcon status="locked" size={18} />
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>

        <div className="flex min-w-0 flex-col">
          <div ref={contentStartRef} className="scroll-mt-16 lg:scroll-mt-4">
            {selected.id === "video" ? (
              <div>
                <div className="flex items-center justify-center bg-[#0f172a] p-3 sm:p-5">
                  <div className="relative aspect-video w-full max-w-4xl overflow-hidden rounded-xl">
                    <div className="absolute inset-0">
                      <VideoPlayer video={video} moduleNumber={moduleNumber} moduleSlug={slug} />
                    </div>
                  </div>
                </div>
                {nextSection ? (
                  <div className="border-t border-[#e4eeec] px-5 py-5 sm:px-8">
                    <NextSectionButton title={nextSection.title} onClick={() => openSection(nextSection.id)} />
                  </div>
                ) : null}
              </div>
            ) : (
              <article className="mx-auto w-full max-w-[42rem] px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#00C4A7]">
                  Section {String(selectedIndex + 1).padStart(2, "0")} of {String(sections.length).padStart(2, "0")}
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight text-[#0B2C4A] sm:text-2xl">{selected.title}</h2>
                {selected.id === "glossary" ? (
                  <GlossaryBody moduleNumber={moduleNumber} />
                ) : (
                  <SectionBody
                    sectionId={selected.id}
                    paragraphs={selected.paragraphs}
                    groups={selected.groups}
                  />
                )}
                {nextSection && !onModuleSummary ? (
                  <div className="mt-8 border-t border-[#e4eeec] pt-5">
                    <NextSectionButton title={nextSection.title} onClick={() => openSection(nextSection.id)} />
                  </div>
                ) : null}
              </article>
            )}
          </div>

          {showLessonActions ? (
            <section
              aria-label="Module actions"
              className="flex flex-col gap-4 border-t border-[#e4eeec] bg-[#fbfdfc] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
            >
              <div className="min-w-0 max-w-xl">
                <p className="text-sm font-semibold text-[#0B2C4A]">
                  {quizPassed ? "Module complete" : lessonComplete ? "Ready for the quiz" : "Finished the lesson?"}
                </p>
                <p className="mt-1 text-sm leading-6 text-[#4d6570]">
                  {quizPassed
                    ? "You passed this module quiz. You can retake it at any time."
                    : lessonComplete
                      ? `Score ${passPercent}% or more to unlock the next module.`
                      : visitedCount === requiredIds.length
                        ? "Mark the lesson complete to open the module quiz."
                        : `Open each section in order. ${requiredIds.length - visitedCount} still to open.`}
                </p>
              </div>
              <LessonActions
                slug={slug}
                lessonComplete={lessonComplete}
                quizPassed={quizPassed}
                sectionsReady={visitedCount === requiredIds.length}
                sectionIds={requiredIds.filter((id) => visited.includes(id))}
              />
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
