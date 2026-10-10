import { PROGRAMME_MODULES } from "./programme";
import type { CatalogModule } from "./question";
import { COURSE_SLUG, MODULE_COUNT } from "./engine";

export const COURSE_CONTENT_VERSION = "2026-10-10-mcq";
/** Questions stored for each module. A quiz attempt draws from this bank. */
export const MODULE_QUIZ_BANK_COUNT = 15;
/** Questions shown in one module quiz attempt. */
export const MODULE_QUIZ_DRAW_COUNT = 5;
export const COURSE_LAST_REVIEWED = "";

export const COURSE_DISCLAIMER =
  "Legal status note: The Digital Personal Data Protection Rules, 2025 were notified by the Ministry of Electronics and Information Technology on 13 November 2025. The Act and Rules have a phased commencement structure. References in this programme should therefore be read subject to the applicable commencement date. This training material is educational in nature and should be read with the official Gazette notifications and the final statutory text.";

export const COURSE_CATALOG: CatalogModule[] = PROGRAMME_MODULES;

export function assertCatalogShape(): void {
  if (COURSE_CATALOG.length !== MODULE_COUNT) {
    throw new Error(`Expected ${MODULE_COUNT} modules, found ${COURSE_CATALOG.length}`);
  }
  const slugs = new Set<string>();
  const keys = new Set<string>();
  for (const courseModule of COURSE_CATALOG) {
    if (slugs.has(courseModule.slug)) throw new Error(`Duplicate slug ${courseModule.slug}`);
    slugs.add(courseModule.slug);
    if (courseModule.quiz.length !== MODULE_QUIZ_BANK_COUNT || courseModule.exam.length !== 0) {
      throw new Error(`Module ${courseModule.number} question bank is the wrong size`);
    }
    for (const question of [...courseModule.quiz, ...courseModule.exam]) {
      if (keys.has(question.key)) throw new Error(`Duplicate question ${question.key}`);
      keys.add(question.key);
      const correct = question.options.filter((option) => option.correct).length;
      if (question.type === "multi" && correct < 2) throw new Error(`${question.key} needs two correct options`);
      if (question.type !== "multi" && correct !== 1) throw new Error(`${question.key} needs one correct option`);
    }
  }
}

export function lessonText(courseModule: CatalogModule): string {
  return courseModule.lesson.join("\n\n");
}

export function scriptText(courseModule: CatalogModule): string {
  return courseModule.lesson.join("\n\n");
}

export { COURSE_SLUG };
