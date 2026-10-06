import { MODULES_01_10 } from "./modules-01-10";
import { MODULES_11_20 } from "./modules-11-20";
import { MODULES_21_30 } from "./modules-21-30";
import { buildLesson, buildScript, type CatalogModule } from "./question";
import { COURSE_SLUG, MODULE_COUNT } from "./engine";

export const COURSE_CONTENT_VERSION = "2026-10-02";
export const COURSE_LAST_REVIEWED = "2026-10-02";

export const COURSE_DISCLAIMER =
  "This course is educational. It is not legal advice, a government certification, or a statement that Consent Guru is a Consent Manager registered with the Data Protection Board. Check the Digital Personal Data Protection Act, 2023, the Digital Personal Data Protection Rules, 2025, and the Official Gazette before you rely on a compliance decision. Content last reviewed on 2 October 2026.";

export const COURSE_CATALOG: CatalogModule[] = [...MODULES_01_10, ...MODULES_11_20, ...MODULES_21_30];

export function assertCatalogShape(): void {
  if (COURSE_CATALOG.length !== MODULE_COUNT) {
    throw new Error(`Expected ${MODULE_COUNT} modules, found ${COURSE_CATALOG.length}`);
  }
  const slugs = new Set<string>();
  const keys = new Set<string>();
  for (const courseModule of COURSE_CATALOG) {
    if (slugs.has(courseModule.slug)) throw new Error(`Duplicate slug ${courseModule.slug}`);
    slugs.add(courseModule.slug);
    if (courseModule.quiz.length < 5 || courseModule.exam.length < 4) {
      throw new Error(`Module ${courseModule.number} is missing questions`);
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
  return buildLesson(courseModule);
}

export function scriptText(courseModule: CatalogModule): string {
  return buildScript(courseModule);
}

export { COURSE_SLUG };
