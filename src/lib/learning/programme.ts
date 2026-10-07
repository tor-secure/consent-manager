import programme from "./programme-modules.json";
import { bool, type CatalogModule, type CatalogQuestion } from "./question";

type ProgrammeModule = {
  number: number;
  slug: string;
  title: string;
  summary: string;
  minutes: number;
  objectives: string[];
  concepts: string[];
  lesson: string[];
  example: string;
  caseStudy: string;
  takeaways: string[];
  scriptBeats: string[];
  dos: string[];
  donts: string[];
  checklist: string[];
  orgAction: string;
  keyConcept: string;
};

const PDF_HEADINGS = new Set([
  "Learning Objectives",
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

function pdfStatements(module: ProgrammeModule): string[] {
  const seen = new Set<string>();
  const statements: string[] = [];
  const add = (text: string) => {
    const value = text.replace(/\s+/g, " ").trim();
    if (value.length < 20 || PDF_HEADINGS.has(value) || value.endsWith("?")) return;
    const key = value.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    statements.push(value);
  };
  for (const block of [
    ...module.lesson,
    module.keyConcept,
    module.example,
    module.caseStudy,
    module.summary,
    module.orgAction,
    ...module.dos,
    ...module.donts,
    ...module.checklist,
    ...module.objectives,
  ]) {
    for (const sentence of block.split(/(?<=[.!?])\s+/)) add(sentence);
  }
  if (statements.length < 10) throw new Error(`Module ${module.number} does not have 10 PDF sentences`);
  return statements;
}

function questionsFor(module: ProgrammeModule): { quiz: CatalogQuestion[]; exam: CatalogQuestion[] } {
  const pad = String(module.number).padStart(2, "0");
  const statements = pdfStatements(module);
  const quiz = statements.slice(0, 6).map((statement, index) =>
    bool(`m${pad}-q${index + 1}`, "module", statement, true, ""),
  );
  const exam = statements.slice(6, 10).map((statement, index) =>
    bool(`m${pad}-e${index + 1}`, "final", statement, true, ""),
  );
  return { quiz, exam };
}

export const PROGRAMME_MODULES: CatalogModule[] = (programme as ProgrammeModule[]).map((module) => {
  const { quiz, exam } = questionsFor(module);
  return {
    number: module.number,
    slug: module.slug,
    title: module.title,
    summary: module.summary,
    minutes: module.minutes,
    objectives: module.objectives,
    concepts: module.concepts,
    lesson: module.lesson,
    example: module.example,
    caseStudy: module.caseStudy,
    takeaways: module.takeaways,
    scriptBeats: module.scriptBeats,
    quiz,
    exam,
  };
});
