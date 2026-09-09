import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { auditLogs } from "@/db/schema/audit-logs";
import {
  ageAssuranceSessions,
  guardianAuthorizationRequests,
} from "@/db/schema/age-assurance";
import { websites } from "@/db/schema/websites";
import {
  generateRightsToken,
  hashRightsToken,
  tokenReusable,
  tokensMatch,
} from "@/lib/privacy-rights/tokens";

import { parseChildProtectionConfig } from "./config";
import { issueAgeContext } from "./context";
import {
  applyGuardianContactVerified,
  applyGuardianFailure,
  applyGuardianStaffVerified,
  expireState,
  nextStateFromAssertion,
  publicAgeView,
  restrictedProcessingAllowed,
  type AgeAssuranceState,
} from "./state";
import {
  CHILD_AUDIT_ACTIONS,
  GUARDIAN_TOKEN_TTL_MS,
  type AssuranceMethod,
} from "./types";

export function rowToState(row: typeof ageAssuranceSessions.$inferSelect): AgeAssuranceState {
  return {
    ageStatus: row.ageStatus as AgeAssuranceState["ageStatus"],
    ageBand: row.ageBand as AgeAssuranceState["ageBand"],
    assuranceMethod: row.assuranceMethod as AgeAssuranceState["assuranceMethod"],
    assertedOverThreshold: row.assertedOverThreshold,
    guardianRequired: row.guardianRequired,
    guardianStatus: row.guardianStatus as AgeAssuranceState["guardianStatus"],
    expiresAt: row.expiresAt,
  };
}

async function writeAudit(input: {
  organizationId: string;
  websiteId: string;
  sessionId: string;
  action: string;
  description: string;
}) {
  await db.insert(auditLogs).values({
    organizationId: input.organizationId,
    action: input.action,
    resourceType: "age_assurance_session",
    resourceId: input.sessionId,
    description: input.description,
    metadata: { websiteId: input.websiteId },
  });
}

export async function loadWebsiteChildContext(websiteId: string) {
  const [website] = await db
    .select({
      id: websites.id,
      organizationId: websites.organizationId,
      childProtection: websites.childProtection,
      siteKey: websites.siteKey,
      status: websites.status,
    })
    .from(websites)
    .where(eq(websites.id, websiteId))
    .limit(1);
  if (!website || website.status !== "active") return null;
  return {
    website,
    config: parseChildProtectionConfig(website.childProtection),
  };
}

export async function loadLatestSession(input: {
  organizationId: string;
  websiteId: string;
  consentId?: string | null;
  sessionId?: string | null;
}) {
  if (input.sessionId) {
    const [row] = await db
      .select()
      .from(ageAssuranceSessions)
      .where(
        and(
          eq(ageAssuranceSessions.id, input.sessionId),
          eq(ageAssuranceSessions.organizationId, input.organizationId),
          eq(ageAssuranceSessions.websiteId, input.websiteId),
        ),
      )
      .limit(1);
    return row ?? null;
  }
  if (!input.consentId) return null;
  const [row] = await db
    .select()
    .from(ageAssuranceSessions)
    .where(
      and(
        eq(ageAssuranceSessions.organizationId, input.organizationId),
        eq(ageAssuranceSessions.websiteId, input.websiteId),
        eq(ageAssuranceSessions.consentId, input.consentId),
      ),
    )
    .orderBy(desc(ageAssuranceSessions.createdAt))
    .limit(1);
  return row ?? null;
}

export async function startAgeAssertion(input: {
  organizationId: string;
  websiteId: string;
  consentId?: string | null;
  assertedOverThreshold: boolean;
  method?: AssuranceMethod;
}) {
  const loaded = await loadWebsiteChildContext(input.websiteId);
  if (!loaded || loaded.website.organizationId !== input.organizationId) {
    return { ok: false as const, reason: "website_not_found" };
  }
  const method = input.method ?? "self_declaration";
  if (method !== "self_declaration" && method !== "staff_verification") {
    return { ok: false as const, reason: "method_not_supported" };
  }
  const state = nextStateFromAssertion({
    config: loaded.config,
    assertedOverThreshold: input.assertedOverThreshold,
    method,
  });
  const [row] = await db
    .insert(ageAssuranceSessions)
    .values({
      organizationId: input.organizationId,
      websiteId: input.websiteId,
      consentId: input.consentId ?? null,
      ageStatus: state.ageStatus,
      ageBand: state.ageBand,
      assuranceMethod: state.assuranceMethod,
      assertedOverThreshold: state.assertedOverThreshold,
      guardianRequired: state.guardianRequired,
      guardianStatus: state.guardianStatus,
      expiresAt: state.expiresAt,
    })
    .returning();

  let guardianToken: string | null = null;
  if (state.guardianRequired) {
    guardianToken = generateRightsToken();
    await db.insert(guardianAuthorizationRequests).values({
      organizationId: input.organizationId,
      websiteId: input.websiteId,
      sessionId: row.id,
      purpose: "guardian",
      tokenHash: hashRightsToken(guardianToken),
      expiresAt: new Date(Date.now() + GUARDIAN_TOKEN_TTL_MS),
    });
    await writeAudit({
      organizationId: input.organizationId,
      websiteId: input.websiteId,
      sessionId: row.id,
      action: CHILD_AUDIT_ACTIONS.guardianCreated,
      description: "Guardian authorization request created",
    });
  }

  await writeAudit({
    organizationId: input.organizationId,
    websiteId: input.websiteId,
    sessionId: row.id,
    action: input.assertedOverThreshold ? CHILD_AUDIT_ACTIONS.started : CHILD_AUDIT_ACTIONS.minorIdentified,
    description: input.assertedOverThreshold
      ? "Age assertion recorded (not verified assurance)"
      : "Under-threshold assertion recorded",
  });

  const view = publicAgeView({ config: loaded.config, state });
  const ageContext = issueAgeContext({
    organizationId: input.organizationId,
    websiteId: input.websiteId,
    sessionId: row.id,
    ageStatus: view.ageStatus,
    guardianStatus: view.guardianStatus,
    restrictedProcessingAllowed: view.restrictedProcessingAllowed,
  });
  return {
    ok: true as const,
    sessionId: row.id,
    view,
    ageContext,
    guardianToken,
  };
}

export async function verifyGuardianToken(input: { token: string }) {
  const hash = hashRightsToken(input.token);
  const [challenge] = await db
    .select()
    .from(guardianAuthorizationRequests)
    .where(eq(guardianAuthorizationRequests.tokenHash, hash))
    .limit(1);
  if (!challenge) return { ok: false as const, reason: "invalid" };
  const reusable = tokenReusable({
    usedAt: challenge.usedAt,
    expiresAt: challenge.expiresAt,
    failedAttempts: challenge.failedAttempts,
  });
  if (!reusable.ok) {
    await db
      .update(guardianAuthorizationRequests)
      .set({ failedAttempts: challenge.failedAttempts + 1 })
      .where(eq(guardianAuthorizationRequests.id, challenge.id));
    if (reusable.reason === "expired") {
      await writeAudit({
        organizationId: challenge.organizationId,
        websiteId: challenge.websiteId,
        sessionId: challenge.sessionId,
        action: CHILD_AUDIT_ACTIONS.guardianExpired,
        description: "Guardian verification expired",
      });
    } else {
      await writeAudit({
        organizationId: challenge.organizationId,
        websiteId: challenge.websiteId,
        sessionId: challenge.sessionId,
        action: CHILD_AUDIT_ACTIONS.guardianFailed,
        description: "Guardian verification failed",
      });
    }
    return { ok: false as const, reason: reusable.reason ?? "invalid" };
  }
  if (!tokensMatch(input.token, challenge.tokenHash)) {
    return { ok: false as const, reason: "invalid" };
  }

  const [session] = await db
    .select()
    .from(ageAssuranceSessions)
    .where(
      and(
        eq(ageAssuranceSessions.id, challenge.sessionId),
        eq(ageAssuranceSessions.organizationId, challenge.organizationId),
      ),
    )
    .limit(1);
  if (!session) return { ok: false as const, reason: "invalid" };

  const next = applyGuardianContactVerified(rowToState(session));
  await db
    .update(guardianAuthorizationRequests)
    .set({ usedAt: new Date() })
    .where(eq(guardianAuthorizationRequests.id, challenge.id));
  await db
    .update(ageAssuranceSessions)
    .set({
      guardianStatus: next.guardianStatus,
      ageStatus: next.ageStatus,
      updatedAt: new Date(),
    })
    .where(eq(ageAssuranceSessions.id, session.id));
  await writeAudit({
    organizationId: challenge.organizationId,
    websiteId: challenge.websiteId,
    sessionId: session.id,
    action: CHILD_AUDIT_ACTIONS.guardianSent,
    description: "Guardian contact proven; legal authority remains unverified",
  });
  const loaded = await loadWebsiteChildContext(session.websiteId);
  const view = publicAgeView({ config: loaded?.config ?? parseChildProtectionConfig({}), state: next });
  return { ok: true as const, view, authorityVerified: false };
}

export async function staffAttestSession(input: {
  organizationId: string;
  websiteId: string;
  sessionId: string;
  kind: "age" | "guardian";
}) {
  const [session] = await db
    .select()
    .from(ageAssuranceSessions)
    .where(
      and(
        eq(ageAssuranceSessions.id, input.sessionId),
        eq(ageAssuranceSessions.organizationId, input.organizationId),
        eq(ageAssuranceSessions.websiteId, input.websiteId),
      ),
    )
    .limit(1);
  if (!session) return { ok: false as const, reason: "not_found" };
  const loaded = await loadWebsiteChildContext(input.websiteId);
  const config = loaded?.config ?? parseChildProtectionConfig({});
  const current = expireState(rowToState(session));
  const next = input.kind === "guardian"
    ? applyGuardianStaffVerified(current)
    : nextStateFromAssertion({
        config,
        assertedOverThreshold: true,
        method: "staff_verification",
      });
  await db
    .update(ageAssuranceSessions)
    .set({
      ageStatus: next.ageStatus,
      ageBand: next.ageBand,
      assuranceMethod: next.assuranceMethod,
      assertedOverThreshold: next.assertedOverThreshold,
      guardianRequired: next.guardianRequired,
      guardianStatus: next.guardianStatus,
      updatedAt: new Date(),
    })
    .where(eq(ageAssuranceSessions.id, session.id));
  await writeAudit({
    organizationId: input.organizationId,
    websiteId: input.websiteId,
    sessionId: session.id,
    action: input.kind === "guardian" ? CHILD_AUDIT_ACTIONS.guardianVerified : CHILD_AUDIT_ACTIONS.completed,
    description: input.kind === "guardian"
      ? "Staff attested guardian approval (not a legal certification)"
      : "Staff attested age assurance (not a legal certification)",
  });
  return { ok: true as const, view: publicAgeView({ config, state: next }) };
}

export async function failGuardianSession(input: {
  organizationId: string;
  websiteId: string;
  sessionId: string;
}) {
  const [session] = await db
    .select()
    .from(ageAssuranceSessions)
    .where(
      and(
        eq(ageAssuranceSessions.id, input.sessionId),
        eq(ageAssuranceSessions.organizationId, input.organizationId),
        eq(ageAssuranceSessions.websiteId, input.websiteId),
      ),
    )
    .limit(1);
  if (!session) return { ok: false as const, reason: "not_found" };
  const next = applyGuardianFailure(rowToState(session));
  await db
    .update(ageAssuranceSessions)
    .set({
      ageStatus: next.ageStatus,
      guardianStatus: next.guardianStatus,
      updatedAt: new Date(),
    })
    .where(eq(ageAssuranceSessions.id, session.id));
  return { ok: true as const };
}

export function sessionAllowsRestricted(
  config: ReturnType<typeof parseChildProtectionConfig>,
  row: typeof ageAssuranceSessions.$inferSelect | null,
) {
  return restrictedProcessingAllowed(config, row ? rowToState(row) : null);
}

export async function publicChildSnapshot(input: {
  organizationId: string;
  websiteId: string;
  consentId?: string | null;
  sessionId?: string | null;
}) {
  const loaded = await loadWebsiteChildContext(input.websiteId);
  if (!loaded || loaded.website.organizationId !== input.organizationId) return null;
  const row = await loadLatestSession(input);
  const state = row ? expireState(rowToState(row)) : null;
  const view = publicAgeView({ config: loaded.config, state });
  return {
    config: loaded.config,
    view,
    state,
    sessionId: row?.id ?? null,
    ageContext: issueAgeContext({
      organizationId: input.organizationId,
      websiteId: input.websiteId,
      sessionId: row?.id ?? null,
      ageStatus: view.ageStatus,
      guardianStatus: view.guardianStatus,
      restrictedProcessingAllowed: view.restrictedProcessingAllowed,
    }),
  };
}

export function minimizedAgeRecord(row: typeof ageAssuranceSessions.$inferSelect) {
  return {
    id: row.id,
    websiteId: row.websiteId,
    ageStatus: row.ageStatus,
    ageBand: row.ageBand,
    assuranceMethod: row.assuranceMethod,
    guardianStatus: row.guardianStatus,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
  };
}
