import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { auditLogs } from "@/db/schema/audit-logs";
import { toolAssessments } from "@/db/schema/tool-assessments";
import { GAP_TOOL_ID, GAP_VERSION, type GapProfile, type GapRemediation, type GapResponse } from "@/config/tools/gap";
import { analyseGap, missingAnswers } from "./gap-engine";
import { loadGapCmpSnapshot } from "./gap-cmp";
import {
  blankDocument,
  profileReady,
  readGapDocument,
  type GapCmp,
  type GapDocument,
} from "./gap-document";

export type GapView = {
  id: string;
  status: string;
  score: number | null;
  updatedAt: Date;
  completedAt: string | null;
  profile: GapProfile;
  responses: Record<string, GapResponse>;
  remediation: Record<string, GapRemediation>;
  cmp: GapCmp | null;
  analysis: GapDocument["analysis"];
  label: string;
  summary: string;
};

function viewOf(id: string, status: string, score: number | null, updatedAt: Date, document: GapDocument): GapView {
  return {
    id,
    status,
    score,
    updatedAt,
    completedAt: document.completedAt,
    profile: document.profile,
    responses: document.responses,
    remediation: document.remediation,
    cmp: document.cmp,
    analysis: document.analysis,
    label: document.label,
    summary: document.summary,
  };
}

function flatAnswers(document: GapDocument): Record<string, string> {
  const answers: Record<string, string> = {
    companyName: document.profile.companyName,
    industry: document.profile.industry,
    role: document.profile.role,
  };
  for (const [id, response] of Object.entries(document.responses)) answers[id] = response.status;
  return answers;
}

export async function listGapAssessments(organizationId: string) {
  const rows = await db
    .select({
      id: toolAssessments.id,
      status: toolAssessments.status,
      score: toolAssessments.score,
      updatedAt: toolAssessments.updatedAt,
      result: toolAssessments.result,
    })
    .from(toolAssessments)
    .where(and(eq(toolAssessments.organizationId, organizationId), eq(toolAssessments.toolType, GAP_TOOL_ID)))
    .orderBy(desc(toolAssessments.updatedAt))
    .limit(40);

  return rows.map((row) => {
    const document = readGapDocument(row.result);
    return {
      id: row.id,
      status: row.status,
      score: row.score,
      updatedAt: row.updatedAt,
      completedAt: document?.completedAt ?? null,
      companyName: document?.profile.companyName ?? "",
      label: document?.label ?? (row.status === "completed" ? "Completed" : "Draft"),
    };
  });
}

export async function loadGapAssessment(organizationId: string, id: string): Promise<GapView | null> {
  const [row] = await db
    .select()
    .from(toolAssessments)
    .where(and(eq(toolAssessments.id, id), eq(toolAssessments.organizationId, organizationId), eq(toolAssessments.toolType, GAP_TOOL_ID)))
    .limit(1);
  if (!row) return null;
  const document = readGapDocument(row.result);
  if (!document) return null;
  return viewOf(row.id, row.status, row.score, row.updatedAt, document);
}

export async function createGapAssessment(input: { organizationId: string; userId: string; companyName: string; profile?: GapProfile }) {
  const document = blankDocument(input.companyName);
  if (input.profile) document.profile = { ...input.profile, companyName: input.profile.companyName || input.companyName };
  document.cmp = await loadGapCmpSnapshot(input.organizationId);
  const [row] = await db
    .insert(toolAssessments)
    .values({
      organizationId: input.organizationId,
      userId: input.userId,
      toolType: GAP_TOOL_ID,
      status: "draft",
      score: null,
      methodologyVersion: GAP_VERSION,
      answers: flatAnswers(document),
      result: document as unknown as Record<string, unknown>,
    })
    .returning({ id: toolAssessments.id, updatedAt: toolAssessments.updatedAt });
  return viewOf(row.id, "draft", null, row.updatedAt, document);
}

export async function saveGapAssessment(input: {
  organizationId: string;
  userId: string;
  id: string;
  profile: GapProfile;
  responses: Record<string, GapResponse>;
  remediation: Record<string, GapRemediation>;
  complete: boolean;
}) {
  const [existing] = await db
    .select()
    .from(toolAssessments)
    .where(and(eq(toolAssessments.id, input.id), eq(toolAssessments.organizationId, input.organizationId), eq(toolAssessments.toolType, GAP_TOOL_ID)))
    .limit(1);
  if (!existing) return { error: "Assessment not found" as const, status: 404 as const };

  const current = readGapDocument(existing.result) ?? blankDocument();
  const document: GapDocument = {
    ...current,
    version: GAP_VERSION,
    profile: input.profile,
    responses: input.responses,
    remediation: input.remediation,
    cmp: await loadGapCmpSnapshot(input.organizationId),
  };

  const unfinished = missingAnswers(document.profile, document.responses);
  const completing = input.complete || current.completedAt !== null;
  if (input.complete && (!profileReady(document.profile) || unfinished.length > 0)) {
    return { error: "Answer every applicable control before completing the assessment." as const, status: 400 as const, missing: unfinished };
  }

  if (completing && profileReady(document.profile) && unfinished.length === 0) {
    const analysis = analyseGap(document.profile, document.responses);
    document.analysis = analysis;
    document.completedAt = current.completedAt ?? new Date().toISOString();
    document.label = analysis.label;
    document.summary = analysis.summary;
  } else {
    document.analysis = null;
    document.completedAt = null;
    document.label = "Draft";
    document.summary = "";
  }

  const status = document.completedAt ? "completed" : "draft";
  const score = document.analysis?.score ?? null;
  const [row] = await db
    .update(toolAssessments)
    .set({
      status,
      score,
      methodologyVersion: GAP_VERSION,
      answers: flatAnswers(document),
      result: document as unknown as Record<string, unknown>,
      updatedAt: new Date(),
    })
    .where(eq(toolAssessments.id, existing.id))
    .returning({ updatedAt: toolAssessments.updatedAt });

  if (input.complete && status === "completed") {
    await db.insert(auditLogs).values({
      organizationId: input.organizationId,
      userId: input.userId,
      action: "tool_assessment_completed",
      resourceType: "tool_assessment",
      resourceId: existing.id,
      description: "Completed DPDP gap assessment",
      metadata: { toolType: GAP_TOOL_ID, methodologyVersion: GAP_VERSION, score },
    });
  }

  return { assessment: viewOf(existing.id, status, score, row.updatedAt, document) };
}
