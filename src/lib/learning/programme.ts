import mcqBank from "./mcq-bank.json";
import programme from "./programme-modules.json";
import { single, type CatalogModule, type CatalogQuestion } from "./question";

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

type McqChapter = {
  number: number;
  title: string;
  questions: Array<{ prompt: string; options: [string, string, string, string]; answer: "A" | "B" | "C" | "D" }>;
};

const ANSWER_LETTERS = ["A", "B", "C", "D"] as const;

function questionsFor(module: ProgrammeModule): { quiz: CatalogQuestion[]; exam: CatalogQuestion[] } {
  const chapter = (mcqBank as McqChapter[]).find((item) => item.number === module.number);
  if (!chapter || chapter.questions.length !== 15) {
    throw new Error(`Module ${module.number} is missing its 15-question bank`);
  }
  const pad = String(module.number).padStart(2, "0");
  const quiz = chapter.questions.map((question, index) =>
    single(
      `m${pad}-q${String(index + 1).padStart(2, "0")}`,
      "module",
      question.prompt,
      question.options.map((label, optionIndex) => [label, ANSWER_LETTERS[optionIndex] === question.answer]),
      "",
    ),
  );
  return { quiz, exam: [] };
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
