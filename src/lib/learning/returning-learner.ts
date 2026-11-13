/** Browser flag: this device has used the learning portal before (enrolled / signed in). */
export const LEARNING_RETURNING_KEY = "cg-learning-returning";

export function markReturningLearner() {
  try {
    window.localStorage.setItem(LEARNING_RETURNING_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function isReturningLearner(): boolean {
  try {
    return window.localStorage.getItem(LEARNING_RETURNING_KEY) === "1";
  } catch {
    return false;
  }
}
