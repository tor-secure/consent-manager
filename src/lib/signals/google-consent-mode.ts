export const GOOGLE_CONSENT_SIGNALS = [
  "ad_storage",
  "ad_user_data",
  "ad_personalization",
  "analytics_storage",
  "functionality_storage",
  "personalization_storage",
  "security_storage",
] as const;

export type GoogleConsentSignal = (typeof GOOGLE_CONSENT_SIGNALS)[number];
export type GoogleConsentValue = "granted" | "denied";

export type GoogleConsentModeConfig = {
  enabled: boolean;
  waitForUpdateMs: number;
  adsDataRedaction: boolean;
  urlPassthrough: boolean;
  purposeSignals: Record<string, GoogleConsentSignal[]>;
};

export const DEFAULT_PURPOSE_SIGNAL_MAP: Record<string, GoogleConsentSignal[]> = {
  necessary: ["security_storage"],
  essential: ["security_storage"],
  security: ["security_storage"],
  functional: ["functionality_storage"],
  functionality: ["functionality_storage"],
  analytics: ["analytics_storage"],
  statistics: ["analytics_storage"],
  measurement: ["analytics_storage"],
  advertising: ["ad_storage", "ad_user_data", "ad_personalization"],
  ads: ["ad_storage", "ad_user_data", "ad_personalization"],
  marketing: ["ad_storage", "ad_user_data", "ad_personalization"],
  targeting: ["ad_storage", "ad_user_data", "ad_personalization"],
  personalization: ["personalization_storage"],
  preferences: ["personalization_storage"],
};

export function defaultGoogleConsentModeConfig(): GoogleConsentModeConfig {
  return {
    enabled: false,
    waitForUpdateMs: 500,
    adsDataRedaction: true,
    urlPassthrough: false,
    purposeSignals: { ...DEFAULT_PURPOSE_SIGNAL_MAP },
  };
}

export function isGoogleConsentSignal(value: string): value is GoogleConsentSignal {
  return (GOOGLE_CONSENT_SIGNALS as readonly string[]).includes(value);
}

export function parseGoogleConsentModeConfig(raw: unknown): GoogleConsentModeConfig {
  const defaults = defaultGoogleConsentModeConfig();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return defaults;
  const value = raw as Record<string, unknown>;
  const purposeSignals = { ...defaults.purposeSignals };
  if (value.purposeSignals && typeof value.purposeSignals === "object" && !Array.isArray(value.purposeSignals)) {
    for (const [key, signals] of Object.entries(value.purposeSignals as Record<string, unknown>)) {
      if (!Array.isArray(signals)) continue;
      const mapped = signals.filter((item): item is GoogleConsentSignal =>
        typeof item === "string" && isGoogleConsentSignal(item),
      );
      if (mapped.length) purposeSignals[key.trim().toLowerCase()] = mapped;
    }
  }
  const wait = Number(value.waitForUpdateMs);
  return {
    enabled: value.enabled === true,
    waitForUpdateMs: Number.isFinite(wait) ? Math.max(0, Math.min(5000, Math.round(wait))) : defaults.waitForUpdateMs,
    adsDataRedaction: value.adsDataRedaction !== false,
    urlPassthrough: value.urlPassthrough === true,
    purposeSignals,
  };
}

export function defaultGoogleConsentState(): Record<GoogleConsentSignal, GoogleConsentValue> {
  return {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
    functionality_storage: "denied",
    personalization_storage: "denied",
    security_storage: "granted",
  };
}

export function mapDecisionsToGoogleConsent(input: {
  purposes: Array<{ key: string; isRequired: boolean }>;
  grantedByPurposeKey: Record<string, boolean>;
  config?: GoogleConsentModeConfig;
}): Record<GoogleConsentSignal, GoogleConsentValue> {
  const config = input.config ?? defaultGoogleConsentModeConfig();
  const state = defaultGoogleConsentState();
  const grantedSignals = new Set<GoogleConsentSignal>(["security_storage"]);

  for (const purpose of input.purposes) {
    const key = purpose.key.trim().toLowerCase();
    const granted = purpose.isRequired || input.grantedByPurposeKey[purpose.key] === true || input.grantedByPurposeKey[key] === true;
    if (!granted) continue;
    const signals = config.purposeSignals[key] ?? DEFAULT_PURPOSE_SIGNAL_MAP[key] ?? [];
    for (const signal of signals) grantedSignals.add(signal);
  }

  for (const signal of GOOGLE_CONSENT_SIGNALS) {
    if (signal === "security_storage") {
      state[signal] = "granted";
      continue;
    }
    state[signal] = grantedSignals.has(signal) ? "granted" : "denied";
  }
  return state;
}

export type GooglePublicConfig = {
  enabled: boolean;
  status: "implemented" | "disabled";
  waitForUpdateMs: number;
  adsDataRedaction: boolean;
  urlPassthrough: boolean;
  purposeSignals: Record<string, GoogleConsentSignal[]>;
};

export function toPublicGoogleConsentConfig(config: GoogleConsentModeConfig): GooglePublicConfig {
  return {
    enabled: config.enabled,
    status: config.enabled ? "implemented" : "disabled",
    waitForUpdateMs: config.waitForUpdateMs,
    adsDataRedaction: config.adsDataRedaction,
    urlPassthrough: config.urlPassthrough,
    purposeSignals: config.purposeSignals,
  };
}
