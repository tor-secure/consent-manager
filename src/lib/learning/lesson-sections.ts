export const PDF_SECTION_HEADINGS = new Set([
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

/** Section ids the learner must finish, in order, before a lesson can be marked complete. */
export function readingSectionIds(lesson: string): string[] {
  const headings: string[] = [];
  for (const block of lesson.split("\n\n")) {
    if (PDF_SECTION_HEADINGS.has(block)) headings.push(block);
  }
  const ids = ["prerequisites", "glossary"];
  if (headings.includes("Introduction")) ids.push("Introduction");
  ids.push("objectives", "video");
  for (const heading of headings) {
    if (heading !== "Introduction") ids.push(heading);
  }
  return ids;
}
