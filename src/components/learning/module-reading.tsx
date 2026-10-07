"use client";

import { useMemo, useState } from "react";

import { VideoPlayer } from "@/components/learning/video-player";

const PDF_SECTION_HEADINGS = new Set([
  "Introduction",
  "Key Concept",
  "Sections / Rules Applicable",
  "Real-Life and Corporate Examples",
  "Cybersecurity Angle",
  "Do's",
  "Don'ts",
  "Practical Checklist",
  "Case Study",
  "What Should the Organisation Do?",
  "5-Question Knowledge Check",
  "Module Summary",
]);

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

function sectionsFromLesson(objectives: string[], lesson: string): ReadingSection[] {
  const sections: ReadingSection[] = [
    { id: "video", title: "Video", paragraphs: [] },
    { id: "objectives", title: "Learning Objectives", paragraphs: objectives },
  ];
  let current: ReadingSection | null = null;
  for (const block of lesson.split("\n\n")) {
    if (PDF_SECTION_HEADINGS.has(block)) {
      current = { id: block, title: block, paragraphs: [] };
      sections.push(current);
      continue;
    }
    if (current) current.paragraphs.push(block);
  }
  return sections;
}

export function ModuleReading({
  objectives,
  lesson,
  video,
}: {
  objectives: string[];
  lesson: string;
  video: VideoLesson;
}) {
  const sections = useMemo(() => sectionsFromLesson(objectives, lesson), [objectives, lesson]);
  const [selectedId, setSelectedId] = useState(sections[0]?.id ?? "video");
  const selected = sections.find((section) => section.id === selectedId) ?? sections[0];

  if (!selected) return null;

  return (
    <div className="grid gap-4 lg:h-[calc(100dvh-15rem)] lg:min-h-[32rem] lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)]">
      <ol className="lesson-scroll max-h-80 overflow-y-auto rounded-xl border border-[#d5e3e0] bg-white lg:h-full lg:max-h-none lg:min-h-0" aria-label="Lesson sections">
        {sections.map((section, index) => {
          const active = section.id === selected.id;
          return (
            <li key={section.id} className="border-b border-[#d5e3e0] last:border-b-0">
              <button
                type="button"
                aria-pressed={active}
                onClick={() => setSelectedId(section.id)}
                className={`flex w-full items-center gap-3 px-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00C4A7] ${
                  active ? "bg-[#E6F9F5]" : "hover:bg-[#f7fbfa]"
                }`}
              >
                <span className="w-6 shrink-0 text-xs font-semibold tabular-nums text-[#4d6570]">{String(index + 1).padStart(2, "0")}</span>
                <span className={`min-w-0 flex-1 text-sm leading-5 text-[#0B2C4A] ${active ? "font-semibold" : ""}`}>{section.title}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div
        className={
          selected.id === "video"
            ? "flex h-full min-h-[16rem] items-center justify-center overflow-hidden rounded-xl border border-[#d5e3e0] bg-[#0f172a] lg:min-h-0"
            : "lesson-scroll min-h-0 overflow-y-auto rounded-xl border border-[#d5e3e0] bg-white lg:h-full"
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
          <article className="p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-[#0B2C4A]">{selected.title}</h2>
            {selected.id === "objectives" ? (
              <ul className="mt-4 space-y-2.5">
                {selected.paragraphs.map((item) => (
                  <li key={item} className="flex gap-3 text-[15px] leading-7 text-[#0B2C4A]">
                    <span aria-hidden="true" className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#00C4A7]" />
                    <span className="min-w-0 flex-1">{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-4 space-y-4">
                {selected.paragraphs.map((paragraph, index) => (
                  <p key={`${selected.id}-${index}`} className="text-justify text-base leading-7 text-[#0B2C4A]">
                    {paragraph}
                  </p>
                ))}
              </div>
            )}
          </article>
        )}
      </div>
    </div>
  );
}
