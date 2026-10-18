/** Client sessionStorage payload for a quiz already started with the lesson-complete request. */
export type PreloadedQuizStart = {
  attemptId: string;
  questions: Array<{
    id: string;
    type: string;
    prompt: string;
    options: Array<{ id: string; label: string }>;
  }>;
  passPercent?: number;
};

export function quizStartStorageKey(slug: string) {
  return `cg-quiz-start:${slug}`;
}

export function takePreloadedQuizStart(slug: string): PreloadedQuizStart | null {
  if (typeof window === "undefined") return null;
  try {
    const key = quizStartStorageKey(slug);
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    sessionStorage.removeItem(key);
    const parsed = JSON.parse(raw) as PreloadedQuizStart;
    if (!parsed?.attemptId || !Array.isArray(parsed.questions) || parsed.questions.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}
