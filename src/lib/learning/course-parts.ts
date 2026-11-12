/**
 * Curriculum parts for the DPDP programme.
 * Module numbers follow the live catalog (programme-modules.json), grouped by topic
 * to match the nine-part course outline.
 */

export type CoursePart = {
  number: number;
  title: string;
  moduleNumbers: readonly number[];
};

export const COURSE_PARTS: readonly CoursePart[] = [
  {
    number: 1,
    title: "Foundations of Data Protection and the DPDP Framework",
    moduleNumbers: [1, 2, 3],
  },
  {
    number: 2,
    title: "Applicability and Scope of the DPDP Framework",
    moduleNumbers: [4, 5],
  },
  {
    number: 3,
    title: "The Data Principal: Rights and Duties",
    moduleNumbers: [6, 15, 16],
  },
  {
    number: 4,
    title: "The Data Fiduciary and Processor: Core Obligations",
    moduleNumbers: [7, 12, 8, 19, 20, 27],
  },
  {
    number: 5,
    title: "Lawful Processing: Notice, Consent and Legitimate Uses",
    moduleNumbers: [10, 9, 22, 11],
  },
  {
    number: 6,
    title: "Enhanced Compliance Requirements",
    moduleNumbers: [13, 14, 23],
  },
  {
    number: 7,
    title: "Cross-Border Processing and Statutory Exemptions",
    moduleNumbers: [17, 18],
  },
  {
    number: 8,
    title: "Grievance Redressal, Regulatory Oversight and Enforcement",
    moduleNumbers: [24, 21, 25, 26],
  },
  {
    number: 9,
    title: "Compliance Implementation and Assessment",
    moduleNumbers: [28, 29, 30],
  },
] as const;

export function partForModuleNumber(moduleNumber: number): CoursePart | null {
  return COURSE_PARTS.find((part) => part.moduleNumbers.includes(moduleNumber)) ?? null;
}

/** Catalog module numbers in Part 1→9 sidebar/curriculum order. */
export function curriculumModuleOrder(): readonly number[] {
  return COURSE_PARTS.flatMap((part) => part.moduleNumbers);
}

const DISPLAY_NUMBER_BY_CATALOG = new Map(
  curriculumModuleOrder().map((catalogNumber, index) => [catalogNumber, index + 1]),
);

/**
 * Learner-facing module number for sidebar/curriculum UI.
 * Follows Part order (1…30) without changing unlock/catalog numbers.
 */
export function displayModuleNumber(catalogNumber: number): number {
  return DISPLAY_NUMBER_BY_CATALOG.get(catalogNumber) ?? catalogNumber;
}

export function groupModulesByPart<T extends { number: number }>(
  modules: T[],
): Array<{ part: CoursePart; modules: T[] }> {
  const byNumber = new Map(modules.map((item) => [item.number, item]));
  const used = new Set<number>();
  const groups: Array<{ part: CoursePart; modules: T[] }> = [];

  for (const part of COURSE_PARTS) {
    const items = part.moduleNumbers
      .map((number) => byNumber.get(number))
      .filter((item): item is T => Boolean(item));
    for (const item of items) used.add(item.number);
    if (items.length > 0) groups.push({ part, modules: items });
  }

  const leftover = modules.filter((item) => !used.has(item.number));
  if (leftover.length > 0) {
    groups.push({
      part: {
        number: 0,
        title: "Additional modules",
        moduleNumbers: leftover.map((item) => item.number),
      },
      modules: leftover,
    });
  }

  return groups;
}
