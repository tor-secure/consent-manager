export type CatalogOption = { label: string; correct: boolean };

export type CatalogQuestion = {
  key: string;
  bank: "module" | "final";
  type: "single" | "multi" | "boolean";
  prompt: string;
  explanation: string;
  difficulty: "foundational" | "applied" | "scenario";
  options: CatalogOption[];
};

export type CatalogModule = {
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
  quiz: CatalogQuestion[];
  exam: CatalogQuestion[];
};

export function single(
  key: string,
  bank: CatalogQuestion["bank"],
  prompt: string,
  options: Array<[string, boolean]>,
  explanation: string,
  difficulty: CatalogQuestion["difficulty"] = "foundational",
): CatalogQuestion {
  return {
    key,
    bank,
    type: "single",
    prompt,
    explanation,
    difficulty,
    options: options.map(([label, correct]) => ({ label, correct })),
  };
}

export function multi(
  key: string,
  bank: CatalogQuestion["bank"],
  prompt: string,
  options: Array<[string, boolean]>,
  explanation: string,
): CatalogQuestion {
  return {
    key,
    bank,
    type: "multi",
    prompt,
    explanation,
    difficulty: "applied",
    options: options.map(([label, correct]) => ({ label, correct })),
  };
}

export function bool(
  key: string,
  bank: CatalogQuestion["bank"],
  prompt: string,
  correct: boolean,
  explanation: string,
  difficulty: CatalogQuestion["difficulty"] = "foundational",
): CatalogQuestion {
  return {
    key,
    bank,
    type: "boolean",
    prompt,
    explanation,
    difficulty,
    options: [
      { label: "True", correct },
      { label: "False", correct: !correct },
    ],
  };
}

export function buildScript(module: Pick<CatalogModule, "number" | "title" | "objectives" | "minutes" | "scriptBeats" | "concepts">): string {
  const pad = String(module.number).padStart(2, "0");
  const narration = module.scriptBeats
    .map((beat, index) => `Narration ${index + 1}. ${beat}`)
    .join("\n\n");
  return [
    `Video title: Module ${pad} — ${module.title}`,
    "Target audience: Employees, founders, product managers, and privacy operators who need practical DPDP training. This is corporate compliance training, not a courtroom lecture.",
    `Learning objectives: ${module.objectives.join(" ")}`,
    `Estimated duration: about ${module.minutes} minutes.`,
    "Opening hook: Start with a familiar business moment, then name the legal idea in plain language.",
    narration,
    `Key legal terms to show on screen: ${module.concepts.join("; ")}.`,
    "Closing: Restate what is statutory, what depends on rules or a government notification, and what is a practical recommendation. Remind the viewer that this module is educational and is not legal advice.",
    "Suggested visuals: a simple role diagram, a timeline of 13 November 2025, 13 November 2026, and 13 May 2027, and one workplace scene that matches the example.",
  ].join("\n\n");
}

export function buildLesson(module: CatalogModule): string {
  return [
    "Status label: statutory text is described from the Digital Personal Data Protection Act, 2023 (Act No. 22 of 2023). Commencement follows Notification G.S.R. 843(E) dated 13 November 2025. The Digital Personal Data Protection Rules, 2025 were notified on 13 November 2025 (G.S.R. 846(E)). Where a rule or operational detail is not yet in force, this lesson says so. Practical steps are labelled as recommendations, not as statutory commands.",
    ...module.lesson,
    `Practical example. ${module.example}`,
    `Scenario. ${module.caseStudy}`,
  ].join("\n\n");
}
