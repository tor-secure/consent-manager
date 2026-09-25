import { PENALTY_FACTORS } from "../../config/tools/penalty";
import { READINESS_CHOICES, READINESS_QUESTIONS } from "../../config/tools/readiness";
import { SDF_CHOICES, SDF_QUESTIONS } from "../../config/tools/sdf";
import { TIMELINE_INPUTS } from "../../config/tools/timeline";
import type { ToolId } from "./types";

export type QuestionView = {
  id: string;
  prompt: string;
  help: string;
  kind: "choice" | "text";
  options: Array<{ value: string; label: string }>;
  required: boolean;
};

const NOTICE_FIELDS: QuestionView[] = [
  {
    id: "language",
    prompt: "Notice language",
    help: "Optional. The phrase checks are written for English. Another language can still be pasted, and missed phrases should be reviewed by a person who reads that language.",
    kind: "choice",
    required: false,
    options: [
      { value: "en", label: "English" },
      { value: "hi", label: "Hindi" },
      { value: "other", label: "Another language" },
    ],
  },
  {
    id: "context",
    prompt: "Where is this notice shown?",
    help: "Optional context for your own notes. It does not change the phrase score.",
    kind: "choice",
    required: false,
    options: [
      { value: "banner", label: "Consent banner or preference center" },
      { value: "page", label: "Privacy notice page" },
      { value: "app", label: "In-app screen" },
    ],
  },
  {
    id: "organisation",
    prompt: "Organisation type",
    help: "Optional.",
    kind: "choice",
    required: false,
    options: [
      { value: "company", label: "Company" },
      { value: "startup", label: "Startup" },
      { value: "public", label: "Public body or institution" },
    ],
  },
  {
    id: "channel",
    prompt: "Property type",
    help: "Optional.",
    kind: "choice",
    required: false,
    options: [
      { value: "website", label: "Website" },
      { value: "app", label: "Mobile app" },
      { value: "both", label: "Website and app" },
    ],
  },
  {
    id: "notice",
    prompt: "Paste the notice text",
    help: "Paste plain text. HTML is stripped and is not rendered. Do not paste passwords, payment numbers, or a customer's personal data.",
    kind: "text",
    required: true,
    options: [],
  },
];

export function questionView(tool: ToolId, id: string): QuestionView | null {
  if (tool === "penalty-risk") {
    const factor = PENALTY_FACTORS.find((item) => item.id === id);
    if (!factor) return null;
    return { id, prompt: factor.prompt, help: factor.help, kind: "choice", required: true, options: factor.options };
  }
  if (tool === "readiness-gap") {
    const question = READINESS_QUESTIONS.find((item) => item.id === id);
    if (!question) return null;
    return {
      id,
      prompt: question.prompt,
      help: "Yes means the control is in place. Partial means it is inconsistent. No means it is missing.",
      kind: "choice",
      required: true,
      options: [...READINESS_CHOICES],
    };
  }
  if (tool === "compliance-timeline") {
    const input = TIMELINE_INPUTS.find((item) => item.id === id);
    if (!input) return null;
    return { id, prompt: input.prompt, help: input.help, kind: "choice", required: true, options: input.options };
  }
  if (tool === "sdf-checker") {
    const question = SDF_QUESTIONS.find((item) => item.id === id);
    if (!question) return null;
    return { id, prompt: question.prompt, help: question.help, kind: "choice", required: true, options: [...SDF_CHOICES] };
  }
  return NOTICE_FIELDS.find((field) => field.id === id) ?? null;
}
