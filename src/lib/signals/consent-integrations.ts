import {
  defaultGoogleConsentModeConfig,
  parseGoogleConsentModeConfig,
  type GoogleConsentModeConfig,
} from "./google-consent-mode";
import { parseIabGppConfig, parseIabTcfConfig, type IabGppConfig, type IabTcfConfig } from "./iab-adapter";

export type ConsentIntegrations = {
  googleConsentMode: GoogleConsentModeConfig;
  iabTcf: IabTcfConfig;
  iabGpp: IabGppConfig;
  trackerEnforcement: {
    unknownTrackerBehavior: "BLOCK" | "ALLOW" | "WARN";
    debugMode: boolean;
  };
};

export function defaultConsentIntegrations(): ConsentIntegrations {
  return {
    googleConsentMode: defaultGoogleConsentModeConfig(),
    iabTcf: { enabled: false, purposeMappings: {}, vendorMappings: {} },
    iabGpp: { enabled: false, sectionIds: [] },
    trackerEnforcement: {
      unknownTrackerBehavior: "BLOCK",
      debugMode: false,
    },
  };
}

export function parseConsentIntegrations(raw: unknown): ConsentIntegrations {
  const defaults = defaultConsentIntegrations();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return defaults;
  const value = raw as Record<string, unknown>;
  const enforcement =
    value.trackerEnforcement &&
    typeof value.trackerEnforcement === "object" &&
    !Array.isArray(value.trackerEnforcement)
      ? (value.trackerEnforcement as Record<string, unknown>)
      : {};
  const unknownBehavior = String(
    enforcement.unknownTrackerBehavior ?? defaults.trackerEnforcement.unknownTrackerBehavior,
  ).toUpperCase();
  return {
    googleConsentMode: parseGoogleConsentModeConfig(value.googleConsentMode),
    iabTcf: parseIabTcfConfig(value.iabTcf),
    iabGpp: parseIabGppConfig(value.iabGpp),
    trackerEnforcement: {
      unknownTrackerBehavior:
        unknownBehavior === "ALLOW" || unknownBehavior === "WARN"
          ? unknownBehavior
          : "BLOCK",
      debugMode: enforcement.debugMode === true,
    },
  };
}

export function serializeConsentIntegrations(config: ConsentIntegrations): Record<string, unknown> {
  return {
    googleConsentMode: {
      enabled: config.googleConsentMode.enabled,
      waitForUpdateMs: config.googleConsentMode.waitForUpdateMs,
      adsDataRedaction: config.googleConsentMode.adsDataRedaction,
      urlPassthrough: config.googleConsentMode.urlPassthrough,
      purposeSignals: config.googleConsentMode.purposeSignals,
    },
    iabTcf: {
      enabled: config.iabTcf.enabled,
      purposeMappings: config.iabTcf.purposeMappings,
      vendorMappings: config.iabTcf.vendorMappings,
    },
    iabGpp: { enabled: config.iabGpp.enabled, sectionIds: config.iabGpp.sectionIds },
    trackerEnforcement: config.trackerEnforcement,
  };
}
