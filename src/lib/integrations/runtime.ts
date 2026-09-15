import {
  parseConsentIntegrations,
  serializeConsentIntegrations,
  type ConsentIntegrations,
} from "@/lib/signals/consent-integrations";

export type IntegrationRuntimeKind = "google_consent_mode" | "iab_tcf" | "iab_gpp" | "none";

export function runtimeKindForIntegration(key: string, category: string): IntegrationRuntimeKind {
  const value = `${key} ${category}`.toLowerCase();
  if (value.includes("consent-mode") || value.includes("consent_mode") || value.includes("google-analytics") || value.includes("gtm") || value.includes("tag-manager") || value.includes("tag_manager")) {
    return "google_consent_mode";
  }
  if (value.includes("tcf") || value.includes("iab-tcf")) return "iab_tcf";
  if (value.includes("gpp") || value.includes("iab-gpp")) return "iab_gpp";
  return "none";
}

export function applyIntegrationRuntime(
  current: unknown,
  kind: IntegrationRuntimeKind,
  enabled: boolean,
): ConsentIntegrations {
  const next = parseConsentIntegrations(current);
  if (kind === "google_consent_mode") next.googleConsentMode.enabled = enabled;
  if (kind === "iab_tcf") next.iabTcf.enabled = enabled;
  if (kind === "iab_gpp") next.iabGpp.enabled = enabled;
  return next;
}

export function serializeRuntime(config: ConsentIntegrations) {
  return serializeConsentIntegrations(config);
}
