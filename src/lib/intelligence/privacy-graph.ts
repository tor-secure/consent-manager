import "server-only";
import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import { purposes } from "@/db/schema/purposes";
import { vendors } from "@/db/schema/vendors";
import { trackers } from "@/db/schema/trackers";
import { vendorPurposes } from "@/db/schema/vendor-purposes";
import { consentPolicies } from "@/db/schema/consent-policies";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import { policyPurposes } from "@/db/schema/policy-purposes";
import { consentRecords } from "@/db/schema/consent-records";
import { consentDecisions } from "@/db/schema/consent-decisions";
import { consentSessions } from "@/db/schema/consent-sessions";
import { privacyEvents } from "@/db/schema/privacy-events";
import { experiments, experimentEvents } from "@/db/schema/experiments";
import { processingActivities, crossBorderTransfers } from "@/db/schema/processing-inventory";
import { secureTransferEnvelopes, transferAuthorizations, transferRecipientKeys } from "@/db/schema/transfer-security";
import { runtimeDiscoveryObservations } from "@/db/schema/runtime-discovery-observations";
import { crawlPages } from "@/db/schema/crawl-pages";
import { scans } from "@/db/schema/scans";
import { privacyFindings } from "@/db/schema/privacy-findings";
import { uniqueGraph, type GraphProvenance, type PrivacyGraphNode, type PrivacyGraphEdge } from "./privacy-graph-core";

const id = (type: string, value: string) => `${type}:${value}`;
const provenances = new Set<GraphProvenance>(["observed", "configured", "inferred", "enforced", "unknown"]);
const provenance = (value: string): GraphProvenance => provenances.has(value as GraphProvenance) ? value as GraphProvenance : "unknown";

/** Builds an organization- and site-scoped graph without copying payloads or visitor identifiers into graph nodes. */
export async function loadPrivacyGraph(organizationId: string, websiteId: string) {
  const [site] = await db.select().from(websites).where(and(eq(websites.id, websiteId), eq(websites.organizationId, organizationId), isNull(websites.deletedAt))).limit(1);
  if (!site) return null;

  const [purposeRows, vendorRows, trackerRows, vendorLinks, policies, observations, pages, scanRows, findings, records, sessions, events, experimentRows, activities, transfers, authorizations, envelopes] = await Promise.all([
    db.select().from(purposes).where(and(eq(purposes.organizationId, organizationId), isNull(purposes.deletedAt))),
    db.select().from(vendors).where(and(eq(vendors.organizationId, organizationId), isNull(vendors.deletedAt))),
    db.select().from(trackers).where(and(eq(trackers.websiteId, websiteId), isNull(trackers.deletedAt))),
    db.select().from(vendorPurposes),
    db.select().from(consentPolicies).where(and(eq(consentPolicies.websiteId, websiteId), isNull(consentPolicies.deletedAt))),
    db.select().from(runtimeDiscoveryObservations).where(and(eq(runtimeDiscoveryObservations.organizationId, organizationId), eq(runtimeDiscoveryObservations.websiteId, websiteId))).orderBy(desc(runtimeDiscoveryObservations.observedAt)).limit(1000),
    db.select().from(crawlPages).where(eq(crawlPages.websiteId, websiteId)).orderBy(desc(crawlPages.crawledAt)).limit(250),
    db.select().from(scans).where(and(eq(scans.websiteId, websiteId), eq(scans.scanType, "browser"))).orderBy(desc(scans.createdAt)).limit(250),
    db.select().from(privacyFindings).where(and(eq(privacyFindings.organizationId, organizationId), eq(privacyFindings.websiteId, websiteId))).orderBy(desc(privacyFindings.updatedAt)).limit(250),
    db.select().from(consentRecords).where(and(eq(consentRecords.organizationId, organizationId), eq(consentRecords.websiteId, websiteId))).orderBy(desc(consentRecords.updatedAt)).limit(500),
    db.select().from(consentSessions).where(and(eq(consentSessions.organizationId, organizationId), eq(consentSessions.websiteId, websiteId))).orderBy(desc(consentSessions.updatedAt)).limit(500),
    db.select().from(privacyEvents).where(and(eq(privacyEvents.organizationId, organizationId), eq(privacyEvents.websiteId, websiteId))).orderBy(desc(privacyEvents.occurredAt)).limit(500),
    db.select().from(experiments).where(and(eq(experiments.organizationId, organizationId), eq(experiments.websiteId, websiteId))).limit(200),
    db.select().from(processingActivities).where(and(eq(processingActivities.organizationId, organizationId), or(eq(processingActivities.websiteId, websiteId), isNull(processingActivities.websiteId)))).limit(500),
    db.select().from(crossBorderTransfers).where(and(eq(crossBorderTransfers.organizationId, organizationId), eq(crossBorderTransfers.websiteId, websiteId))).limit(250),
    db.select().from(transferAuthorizations).where(and(eq(transferAuthorizations.organizationId, organizationId), eq(transferAuthorizations.websiteId, websiteId))).limit(500),
    db.select().from(secureTransferEnvelopes).where(and(eq(secureTransferEnvelopes.organizationId, organizationId), eq(secureTransferEnvelopes.websiteId, websiteId))).limit(500),
  ]);

  const recordIds = records.map((row) => row.id);
  const experimentIds = experimentRows.map((row) => row.id);
  const recipientKeyIds = [...new Set(authorizations.map((row) => row.recipientKeyId))];
  const [decisions, experimentEventRows, keyRows] = await Promise.all([
    recordIds.length ? db.select().from(consentDecisions).where(inArray(consentDecisions.consentRecordId, recordIds)).limit(2500) : Promise.resolve([]),
    experimentIds.length ? db.select().from(experimentEvents).where(and(eq(experimentEvents.organizationId, organizationId), eq(experimentEvents.websiteId, websiteId), inArray(experimentEvents.experimentId, experimentIds))).orderBy(desc(experimentEvents.occurredAt)).limit(1000) : Promise.resolve([]),
    recipientKeyIds.length ? db.select().from(transferRecipientKeys).where(and(eq(transferRecipientKeys.organizationId, organizationId), inArray(transferRecipientKeys.id, recipientKeyIds))).limit(500) : Promise.resolve([]),
  ]);

  const nodes: PrivacyGraphNode[] = [
    { id: id("organization", organizationId), type: "organization", label: "Organization", provenance: "configured" },
    { id: id("website", site.id), type: "website", label: site.name, provenance: "configured", data: { domain: site.domain } },
  ];
  const edges: PrivacyGraphEdge[] = [{ id: `org-site-${site.id}`, source: id("organization", organizationId), target: id("website", site.id), relation: "owns", provenance: "configured" }];
  const addEdge = (edge: PrivacyGraphEdge) => edges.push(edge);
  const knownTrackers = new Set(trackerRows.map((row) => row.id));
  const knownVendors = new Set(vendorRows.map((row) => row.id));
  const knownPurposes = new Set(purposeRows.map((row) => row.id));
  const knownScans = new Set(scanRows.map((row) => row.id));

  for (const row of purposeRows) nodes.push({ id: id("purpose", row.id), type: "purpose", label: row.name, provenance: "configured" });
  for (const row of vendorRows) nodes.push({ id: id("vendor", row.id), type: "vendor", label: row.name, provenance: "configured", data: { domain: row.domain } });
  for (const row of trackerRows) {
    nodes.push({ id: id("tracker", row.id), type: "tracker", label: row.name, provenance: "configured", data: { domain: row.domain, status: row.status } });
    addEdge({ id: `site-tracker-${row.id}`, source: id("website", site.id), target: id("tracker", row.id), relation: "contains", provenance: "configured" });
    if (row.vendorId && knownVendors.has(row.vendorId)) addEdge({ id: `tracker-vendor-${row.id}`, source: id("tracker", row.id), target: id("vendor", row.vendorId), relation: "belongs_to_vendor", provenance: "configured" });
    if (row.purposeId && knownPurposes.has(row.purposeId)) addEdge({ id: `tracker-purpose-${row.id}`, source: id("tracker", row.id), target: id("purpose", row.purposeId), relation: "uses_purpose", provenance: "configured" });
    if (row.status === "active" && (row.domain || row.identifier)) {
      const rule = id("enforcement_rule", row.id);
      nodes.push({ id: rule, type: "enforcement_rule", label: `Configured rule for ${row.name}`, provenance: "configured" });
      addEdge({ id: `rule-tracker-${row.id}`, source: rule, target: id("tracker", row.id), relation: "configures", provenance: "configured" });
    }
  }
  for (const row of vendorLinks) if (knownVendors.has(row.vendorId) && knownPurposes.has(row.purposeId)) addEdge({ id: `vendor-purpose-${row.id}`, source: id("vendor", row.vendorId), target: id("purpose", row.purposeId), relation: "uses_purpose", provenance: "configured" });

  for (const policy of policies) {
    nodes.push({ id: id("policy", policy.id), type: "policy", label: policy.name, provenance: "configured" });
    addEdge({ id: `site-policy-${policy.id}`, source: id("website", site.id), target: id("policy", policy.id), relation: "governed_by", provenance: "configured" });
    const versions = await db.select().from(consentPolicyVersions).where(eq(consentPolicyVersions.policyId, policy.id));
    for (const version of versions) {
      nodes.push({ id: id("policy_version", version.id), type: "policy_version", label: `${policy.name} v${version.version}`, provenance: "configured" });
      addEdge({ id: `policy-version-${version.id}`, source: id("policy", policy.id), target: id("policy_version", version.id), relation: "has_version", provenance: "configured" });
      const links = await db.select().from(policyPurposes).where(eq(policyPurposes.policyVersionId, version.id));
      for (const link of links) if (knownPurposes.has(link.purposeId)) addEdge({ id: `policy-purpose-${link.id}`, source: id("policy_version", version.id), target: id("purpose", link.purposeId), relation: "covers_purpose", provenance: "configured" });
    }
  }

  for (const page of pages) {
    const pageNode = id("page", page.id);
    nodes.push({ id: pageNode, type: "page", label: page.url, provenance: "observed", data: { statusCode: page.statusCode, scanId: page.scanId } });
    addEdge({ id: `site-page-${page.id}`, source: id("website", site.id), target: pageNode, relation: "exposes", provenance: "observed" });
    if (knownScans.has(page.scanId)) addEdge({ id: `scan-page-${page.id}`, source: id("scan", page.scanId), target: pageNode, relation: "visited_page", provenance: "observed" });
  }
  for (const scan of scanRows) {
    const scanNode = id("scan", scan.id);
    nodes.push({ id: scanNode, type: "scan", label: `Browser scan ${scan.id.slice(0, 8)}`, provenance: "observed", data: { status: scan.status, startedAt: scan.startedAt, completedAt: scan.completedAt, pagesScanned: scan.pagesScanned, resourcesObserved: scan.resourcesObserved } });
    addEdge({ id: `site-scan-${scan.id}`, source: id("website", site.id), target: scanNode, relation: "has_scan", provenance: "observed" });
  }
  for (const observation of observations) {
    const observationId = id("observation", observation.id);
    const pageNode = id("page", `${site.id}:${observation.pageUrl}`);
    nodes.push({ id: observationId, type: "observation", label: observation.observationType, provenance: "observed", data: { source: observation.discoverySource, timestamp: observation.observedAt, sanitizationStatus: observation.sanitizationStatus, confidence: observation.confidence } });
    nodes.push({ id: pageNode, type: "page", label: observation.pageUrl, provenance: "observed" });
    addEdge({ id: `site-observation-${observation.id}`, source: id("website", site.id), target: observationId, relation: "observed", provenance: "observed", evidenceIds: [observation.id] });
    addEdge({ id: `observation-page-${observation.id}`, source: observationId, target: pageNode, relation: "occurs_on", provenance: "observed", evidenceIds: [observation.id] });
    const scanId = typeof observation.metadata?.scanId === "string" ? observation.metadata.scanId : null;
    if (scanId && knownScans.has(scanId)) addEdge({ id: `scan-observation-${observation.id}`, source: id("scan", scanId), target: observationId, relation: "generated_observation", provenance: "observed", evidenceIds: [observation.id] });
    if (observation.destinationHost) {
      const destination = id("destination", observation.destinationHost);
      nodes.push({ id: destination, type: "destination", label: observation.destinationHost, provenance: "observed" });
      addEdge({ id: `observation-destination-${observation.id}`, source: observationId, target: destination, relation: "contacts", provenance: "observed", evidenceIds: [observation.id] });
    }
    if (observation.trackerId && knownTrackers.has(observation.trackerId)) addEdge({ id: `observation-tracker-${observation.id}`, source: observationId, target: id("tracker", observation.trackerId), relation: "identifies", provenance: "observed", evidenceIds: [observation.id] });
  }
  for (const finding of findings) {
    nodes.push({ id: id("finding", finding.id), type: "privacy_finding", label: finding.title, provenance: "inferred", data: { severity: finding.severity, status: finding.status } });
    addEdge({ id: `site-finding-${finding.id}`, source: id("website", site.id), target: id("finding", finding.id), relation: "has_finding", provenance: "inferred" });
    if (finding.trackerId && knownTrackers.has(finding.trackerId)) addEdge({ id: `finding-tracker-${finding.id}`, source: id("finding", finding.id), target: id("tracker", finding.trackerId), relation: "concerns", provenance: "inferred" });
  }

  for (const record of records) {
    const recordNode = id("consent", record.id);
    nodes.push({ id: recordNode, type: "consent_state", label: `Consent ${record.consentId.slice(0, 8)}`, provenance: "observed", data: { status: record.status, stateVersion: record.stateVersion, policyVersionId: record.policyVersionId, consentedAt: record.consentedAt, withdrawnAt: record.withdrawnAt, jurisdiction: record.jurisdiction, source: record.source } });
    addEdge({ id: `consent-site-${record.id}`, source: id("website", site.id), target: recordNode, relation: "records_consent", provenance: "observed" });
    addEdge({ id: `consent-policy-${record.id}`, source: recordNode, target: id("policy_version", record.policyVersionId), relation: "decided_under", provenance: "observed" });
  }
  const knownSessions = new Set(sessions.map((row) => row.id));
  for (const session of sessions) {
    const sessionNode = id("consent_session", session.id);
    nodes.push({ id: sessionNode, type: "consent_session", label: `Session ${session.id.slice(0, 8)}`, provenance: "observed", data: { status: session.status, decisionCount: session.decisionCount, expiresAt: session.expiresAt, revokedAt: session.revokedAt } });
    addEdge({ id: `site-session-${session.id}`, source: id("website", site.id), target: sessionNode, relation: "has_session", provenance: "observed" });
    addEdge({ id: `session-policy-${session.id}`, source: sessionNode, target: id("policy_version", session.policyVersionId), relation: "uses_policy_version", provenance: "observed" });
    if (session.consentRecordId) {
      addEdge({ id: `session-consent-${session.id}`, source: sessionNode, target: id("consent", session.consentRecordId), relation: "produced_consent", provenance: "observed" });
    }
  }
  for (const decision of decisions) {
    const decisionNode = id("consent_decision", decision.id);
    nodes.push({ id: decisionNode, type: "consent_decision", label: `${decision.granted ? "Granted" : "Rejected"} purpose`, provenance: "observed", data: { decision: decision.decision, granted: decision.granted, decidedAt: decision.decidedAt } });
    addEdge({ id: `decision-consent-${decision.id}`, source: decisionNode, target: id("consent", decision.consentRecordId), relation: "part_of_consent", provenance: "observed" });
    if (decision.purposeId && knownPurposes.has(decision.purposeId)) addEdge({ id: `decision-purpose-${decision.id}`, source: decisionNode, target: id("purpose", decision.purposeId), relation: "decides_purpose", provenance: "observed" });
    if (decision.vendorId && knownVendors.has(decision.vendorId)) addEdge({ id: `decision-vendor-${decision.id}`, source: decisionNode, target: id("vendor", decision.vendorId), relation: "decides_vendor", provenance: "observed" });
  }

  for (const activity of activities) {
    const activityNode = id("processing_activity", activity.id);
    nodes.push({ id: activityNode, type: "processing_activity", label: activity.description || "Processing activity", provenance: "configured", data: { status: activity.status, processingRole: activity.processingRole, transferRequired: activity.transferRequired } });
    if (activity.vendorId && knownVendors.has(activity.vendorId)) addEdge({ id: `activity-vendor-${activity.id}`, source: activityNode, target: id("vendor", activity.vendorId), relation: "processed_by", provenance: "configured" });
    if (activity.purposeId && knownPurposes.has(activity.purposeId)) addEdge({ id: `activity-purpose-${activity.id}`, source: activityNode, target: id("purpose", activity.purposeId), relation: "uses_purpose", provenance: "configured" });
    if (activity.websiteId === site.id) addEdge({ id: `activity-site-${activity.id}`, source: id("website", site.id), target: activityNode, relation: "has_processing_activity", provenance: "configured" });
  }
  for (const transfer of transfers) {
    const transferNode = id("transfer", transfer.id);
    nodes.push({ id: transferNode, type: "transfer", label: transfer.transferPurpose || "Cross-border transfer", provenance: "configured", data: { status: transfer.status, sourceCountry: transfer.sourceCountry, destinationCountry: transfer.destinationCountry, mechanism: transfer.mechanism } });
    if (transfer.processingActivityId) addEdge({ id: `transfer-activity-${transfer.id}`, source: transferNode, target: id("processing_activity", transfer.processingActivityId), relation: "transfers_activity", provenance: "configured" });
    if (knownVendors.has(transfer.vendorId)) addEdge({ id: `transfer-vendor-${transfer.id}`, source: transferNode, target: id("vendor", transfer.vendorId), relation: "recipient", provenance: "configured" });
    addEdge({ id: `site-transfer-${transfer.id}`, source: id("website", site.id), target: transferNode, relation: "has_transfer", provenance: "configured" });
  }
  for (const authorization of authorizations) {
    const authNode = id("transfer_authorization", authorization.id);
    nodes.push({ id: authNode, type: "transfer_authorization", label: `Authorization ${authorization.id.slice(0, 8)}`, provenance: "configured", data: { state: authorization.state, expiresAt: authorization.expiresAt, singleUse: authorization.singleUse, issuedAt: authorization.issuedAt } });
    addEdge({ id: `auth-transfer-${authorization.id}`, source: authNode, target: id("transfer", authorization.transferId), relation: "authorizes_transfer", provenance: "configured" });
    addEdge({ id: `auth-consent-${authorization.id}`, source: authNode, target: id("consent", authorization.consentRecordId), relation: "authorized_by_consent", provenance: "configured" });
    addEdge({ id: `auth-purpose-${authorization.id}`, source: authNode, target: id("purpose", authorization.purposeId), relation: "limited_to_purpose", provenance: "configured" });
    addEdge({ id: `auth-activity-${authorization.id}`, source: authNode, target: id("processing_activity", authorization.processingActivityId), relation: "covers_activity", provenance: "configured" });
    if (knownVendors.has(authorization.recipientVendorId)) addEdge({ id: `auth-vendor-${authorization.id}`, source: authNode, target: id("vendor", authorization.recipientVendorId), relation: "authorized_recipient", provenance: "configured" });
    if (authorization.sessionId && knownSessions.has(authorization.sessionId)) addEdge({ id: `auth-session-${authorization.id}`, source: authNode, target: id("consent_session", authorization.sessionId), relation: "bound_to_session", provenance: "configured" });
  }
  for (const key of keyRows) {
    const keyNode = id("recipient_key", key.id);
    nodes.push({ id: keyNode, type: "recipient_key", label: key.keyId, provenance: "configured", data: { status: key.status, algorithm: key.algorithm, validFrom: key.validFrom, retiredAt: key.retiredAt } });
    if (knownVendors.has(key.vendorId)) addEdge({ id: `key-vendor-${key.id}`, source: keyNode, target: id("vendor", key.vendorId), relation: "belongs_to_vendor", provenance: "configured" });
  }
  for (const envelope of envelopes) {
    const envelopeNode = id("secure_transfer", envelope.id);
    nodes.push({ id: envelopeNode, type: "secure_transfer", label: `Envelope ${envelope.id.slice(0, 8)}`, provenance: "enforced", data: { status: envelope.status, expiresAt: envelope.expiresAt, createdAt: envelope.createdAt, recipientVendorId: envelope.recipientVendorId } });
    addEdge({ id: `envelope-auth-${envelope.id}`, source: envelopeNode, target: id("transfer_authorization", envelope.authorizationId), relation: "uses_authorization", provenance: "enforced" });
    addEdge({ id: `envelope-key-${envelope.id}`, source: envelopeNode, target: id("recipient_key", envelope.recipientKeyId), relation: "encrypted_for_key", provenance: "enforced" });
  }

  for (const experiment of experimentRows) {
    const experimentNode = id("experiment", experiment.id);
    nodes.push({ id: experimentNode, type: "experiment", label: experiment.name, provenance: "configured", data: { status: experiment.status, allocation: experiment.allocation, controlVariantId: experiment.controlVariantId } });
    addEdge({ id: `site-experiment-${experiment.id}`, source: id("website", site.id), target: experimentNode, relation: "runs_experiment", provenance: "configured" });
    addEdge({ id: `experiment-policy-${experiment.id}`, source: experimentNode, target: id("policy_version", experiment.policyVersionId), relation: "uses_policy_version", provenance: "configured" });
  }
  for (const event of experimentEventRows) {
    const eventNode = id("experiment_event", event.id);
    nodes.push({ id: eventNode, type: "experiment_event", label: event.eventType, provenance: "observed", data: { variantId: event.variantId, choice: event.choice, occurredAt: event.occurredAt } });
    addEdge({ id: `experiment-event-${event.id}`, source: eventNode, target: id("experiment", event.experimentId), relation: "belongs_to_experiment", provenance: "observed" });
    if (event.sessionId) addEdge({ id: `experiment-session-${event.id}`, source: eventNode, target: id("consent_session", event.sessionId), relation: "occurred_in_session", provenance: "observed" });
  }
  for (const event of events) {
    const eventNode = id("privacy_event", event.id);
    nodes.push({ id: eventNode, type: "privacy_event", label: event.eventType, provenance: provenance(event.provenance), data: { occurredAt: event.occurredAt } });
    addEdge({ id: `site-event-${event.id}`, source: id("website", site.id), target: eventNode, relation: "has_event", provenance: provenance(event.provenance), evidenceIds: [event.id] });
    if (event.sessionId) addEdge({ id: `event-session-${event.id}`, source: eventNode, target: id("consent_session", event.sessionId), relation: "occurred_in_session", provenance: provenance(event.provenance), evidenceIds: [event.id] });
    const eventTargets: Array<[string, string, string]> = [
      ["policyId", "policy", "references_policy"], ["policyVersionId", "policy_version", "references_policy_version"],
      ["trackerId", "tracker", "concerns_tracker"], ["vendorId", "vendor", "concerns_vendor"], ["purposeId", "purpose", "concerns_purpose"],
      ["transferId", "transfer", "concerns_transfer"], ["authorizationId", "transfer_authorization", "concerns_authorization"],
      ["envelopeId", "secure_transfer", "concerns_envelope"], ["experimentId", "experiment", "concerns_experiment"],
      ["consentRecordId", "consent", "concerns_consent"], ["observationId", "observation", "concerns_observation"], ["scanId", "scan", "concerns_scan"],
    ];
    for (const [key, targetType, relation] of eventTargets) {
      const value = event.payload[key];
      if (typeof value === "string") addEdge({ id: `event-${key}-${event.id}`, source: eventNode, target: id(targetType, value), relation, provenance: provenance(event.provenance), evidenceIds: [event.id] });
    }
  }

  const graph = uniqueGraph(nodes, edges);
  return { ...graph, websiteId };
}
