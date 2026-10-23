/** In-memory educational state. Never calls consent APIs, storage, or SDK events. */
export type DemoPurposes = { analytics: boolean; advertising: boolean };
export type DemoEvent = { sequence: number; kind: "decision" | "withdrawal"; purposes: DemoPurposes; recordedAt: string };
export type LearningDemo = { draft: DemoPurposes; status: "unrecorded" | "recorded" | "withdrawn"; history: DemoEvent[]; sequence: number; inspecting: number | null };
export type DemoAction = { type: "draft"; purpose: keyof DemoPurposes; value: boolean } | { type: "record" | "withdraw"; timestamp: string } | { type: "inspect"; sequence: number | null } | { type: "reset" };
const none = (): DemoPurposes => ({ analytics: false, advertising: false });
export const createLearningDemo = (): LearningDemo => ({ draft: none(), status: "unrecorded", history: [], sequence: 0, inspecting: null });
export function learningDemoReducer(state: LearningDemo, action: DemoAction): LearningDemo {
  if (action.type === "reset") return createLearningDemo();
  if (action.type === "draft") return { ...state, draft: { ...state.draft, [action.purpose]: action.value } };
  if (action.type === "inspect") return action.sequence === null || state.history.some(event => event.sequence === action.sequence) ? { ...state, inspecting: action.sequence } : state;
  if (action.type === "withdraw" && state.status !== "recorded") return state;
  const sequence = state.sequence + 1;
  const event: DemoEvent = { sequence, kind: action.type === "record" ? "decision" : "withdrawal", purposes: action.type === "record" ? { ...state.draft } : none(), recordedAt: action.timestamp };
  return { ...state, sequence, status: action.type === "record" ? "recorded" : "withdrawn", draft: action.type === "record" ? state.draft : none(), history: [...state.history, event].slice(-12), inspecting: null };
}
export function currentDemoPurposes(state: LearningDemo): DemoPurposes {
  return state.status === "recorded" ? state.history.at(-1)?.purposes ?? none() : none();
}
export function inspectedDemoEvent(state: LearningDemo): DemoEvent | undefined {
  return state.inspecting === null ? state.history.at(-1) : state.history.find(event => event.sequence === state.inspecting);
}
