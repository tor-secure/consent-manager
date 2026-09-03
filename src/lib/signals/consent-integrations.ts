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
};

export function defaultConsentIntegrations(): ConsentIntegrations {
  return {
    googleConsentMode: defaultGoogleConsentModeConfig(),
    iabTcf: { enabled: false },
    iabGpp: { enabled: false },
  };
}

export function parseConsentIntegrations(raw: unknown): ConsentIntegrations {
  const defaults = defaultConsentIntegrations();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return defaults;
  const value = raw as Record<string, unknown>;
  return {
    googleConsentMode: parseGoogleConsentModeConfig(value.googleConsentMode),
    iabTcf: parseIabTcfConfig(value.iabTcf),
    iabGpp: parseIabGppConfig(value.iabGpp),
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
    iabTcf: { enabled: config.iabTcf.enabled },
    iabGpp: { enabled: config.iabGpp.enabled },
  };
}
