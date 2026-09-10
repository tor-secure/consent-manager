import { GVL, TCModel, TCString } from "@iabtcf/core";
import { GppModel } from "@iabgpp/cmpapi";

export type IabFrameworkStatus = "disabled" | "blocked" | "ready";

export type IabTcfConfig = {
  enabled: boolean;
  purposeMappings: Record<string, number>;
  vendorMappings: Record<string, number>;
};

export type IabGppConfig = {
  enabled: boolean;
  sectionIds: number[];
};

export function parseIabTcfConfig(raw: unknown): IabTcfConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { enabled: false, purposeMappings: {}, vendorMappings: {} };
  const value = raw as Record<string, unknown>;
  return {
    enabled: value.enabled === true,
    purposeMappings: parseMappings(value.purposeMappings, 24),
    vendorMappings: parseMappings(value.vendorMappings, 65_535),
  };
}

export function parseIabGppConfig(raw: unknown): IabGppConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { enabled: false, sectionIds: [] };
  const value = raw as Record<string, unknown>;
  return {
    enabled: value.enabled === true,
    sectionIds: Array.isArray(value.sectionIds)
      ? [...new Set(value.sectionIds.filter((id): id is number => Number.isInteger(id) && id > 0 && id <= 63))]
      : [],
  };
}

function parseMappings(raw: unknown, max: number): Record<string, number> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return Object.fromEntries(Object.entries(raw as Record<string, unknown>)
    .filter(([key, id]) => key.length <= 100 && Number.isInteger(id) && Number(id) > 0 && Number(id) <= max)
    .map(([key, id]) => [key, Number(id)]));
}

export function getIabRegistration(env: NodeJS.ProcessEnv = process.env, config?: unknown) {
  const value = config && typeof config === "object" && !Array.isArray(config)
    ? config as Record<string, unknown>
    : {};
  const cmpId = Number(value.cmpId ?? env.IAB_CMP_ID);
  const cmpVersion = Number(value.cmpVersion ?? env.IAB_CMP_VERSION);
  const valid = Number.isInteger(cmpId) && cmpId > 1 && cmpId <= 4095 &&
    Number.isInteger(cmpVersion) && cmpVersion > 0 && cmpVersion <= 4095;
  return { cmpId: valid ? cmpId : null, cmpVersion: valid ? cmpVersion : null, valid };
}

export type IabSignalSnapshot = {
  tcf: {
    enabled: boolean;
    status: IabFrameworkStatus;
    api: "__tcfapi";
    spec: "TCF v2.2";
    tcString: string | null;
    cmpId: number | null;
    cmpVersion: number | null;
    gvlVersion: number | null;
    mappingComplete: boolean;
    blockedReason: string | null;
  };
  gpp: {
    enabled: boolean;
    status: IabFrameworkStatus;
    api: "__gpp";
    spec: "GPP 1.1";
    gppString: string | null;
    applicableSections: number[];
    blockedReason: string | null;
  };
};

export function buildIabSignalSnapshot(input: {
  tcf: IabTcfConfig;
  gpp: IabGppConfig;
  registration?: ReturnType<typeof getIabRegistration>;
  gvlVersion?: number | null;
  mappingComplete?: boolean;
  applicableSections?: number[];
}): IabSignalSnapshot {
  const registration = input.registration ?? getIabRegistration();
  const tcfReady = input.tcf.enabled && registration.valid && Boolean(input.gvlVersion) && input.mappingComplete === true;
  const gppReady = input.gpp.enabled && registration.valid && (input.applicableSections?.length ?? 0) > 0;
  return {
    tcf: {
      enabled: input.tcf.enabled,
      status: !input.tcf.enabled ? "disabled" : tcfReady ? "ready" : "blocked",
      api: "__tcfapi",
      spec: "TCF v2.2",
      tcString: null,
      cmpId: registration.cmpId,
      cmpVersion: registration.cmpVersion,
      gvlVersion: input.gvlVersion ?? null,
      mappingComplete: input.mappingComplete === true,
      blockedReason: !input.tcf.enabled || tcfReady ? null : "CMP registration, current GVL, and complete mappings are required",
    },
    gpp: {
      enabled: input.gpp.enabled,
      status: !input.gpp.enabled ? "disabled" : gppReady ? "ready" : "blocked",
      api: "__gpp",
      spec: "GPP 1.1",
      gppString: null,
      applicableSections: input.applicableSections ?? [],
      blockedReason: !input.gpp.enabled || gppReady ? null : "CMP registration and an applicable legal-profile section are required",
    },
  };
}

export function encodeTcString(input: {
  cmpId: number; cmpVersion: number; gvl: Record<string, unknown>;
  purposeIds: number[]; vendorIds: number[]; grantedPurposeIds: number[]; grantedVendorIds: number[];
  language?: string; now?: Date;
}): string {
  const gvl = new GVL(input.gvl as never);
  const model = new TCModel(gvl);
  model.cmpId = input.cmpId;
  model.cmpVersion = input.cmpVersion;
  model.consentScreen = 0;
  model.consentLanguage = (input.language || "EN").slice(0, 2).toUpperCase();
  model.isServiceSpecific = true;
  model.created = input.now ?? new Date();
  model.lastUpdated = input.now ?? new Date();
  model.purposeConsents.set(input.grantedPurposeIds);
  model.publisherConsents.set(input.grantedPurposeIds);
  model.vendorConsents.set(input.grantedVendorIds);
  model.vendorsDisclosed.set(input.vendorIds);
  model.vendorsAllowed.set(input.vendorIds);
  return TCString.encode(model, { isForVendors: true });
}

export function encodeGppString(input: {
  sectionIds: number[];
  optedOut?: boolean;
  saleOptOut?: boolean;
  sharingOptOut?: boolean;
  sensitiveLimit?: boolean;
}): string {
  const sale = input.saleOptOut === true || input.optedOut === true;
  const share = input.sharingOptOut === true || input.optedOut === true;
  const sensitive = input.sensitiveLimit === true;
  const model = new GppModel();
  for (const id of input.sectionIds) {
    if (id === 6) {
      model.setFieldValueBySectionId(6, "Notice", "Y");
      model.setFieldValueBySectionId(6, "OptOutSale", sale ? "Y" : "N");
      model.setFieldValueBySectionId(6, "LspaCovered", "N");
    } else if (id >= 7) {
      const sectionName = ({ 7: "usnat", 8: "usca", 9: "usva", 10: "usco", 11: "usut", 12: "usct" } as Record<number, string>)[id];
      if (sectionName) {
        model.setFieldValue(sectionName, "SaleOptOutNotice", 1);
        model.setFieldValue(sectionName, "SharingNotice", 1);
        model.setFieldValue(sectionName, "SensitiveDataLimitUseNotice", 1);
        model.setFieldValue(sectionName, "SaleOptOut", sale ? 1 : 2);
        model.setFieldValue(sectionName, "SharingOptOut", share ? 1 : 2);
        model.setFieldValue(sectionName, "SensitiveDataLimitUseOptOut", sensitive ? 1 : 2);
      }
    }
  }
  return model.encode();
}

export function decodeGppSections(encoded: string): Record<string, unknown> {
  return new GppModel(encoded).toObject() as Record<string, unknown>;
}

export function tcfPingResponse(enabled: boolean, registration = getIabRegistration()) {
  return {
    gdprApplies: enabled,
    cmpLoaded: enabled && registration.valid,
    cmpStatus: enabled && registration.valid ? "loaded" : enabled ? "stub" : "disabled",
    displayStatus: "hidden",
    apiVersion: "2.2",
    cmpId: registration.cmpId ?? 0,
    cmpVersion: registration.cmpVersion ?? 0,
    tcfPolicyVersion: 4,
    gvlVersion: 0,
    tncs: false,
  };
}

export function gppPingResponse(enabled: boolean) {
  return {
    gppVersion: "1.1",
    cmpStatus: enabled ? "stub" : "disabled",
    cmpDisplayStatus: "hidden",
    signalStatus: "not ready",
    supportedAPIs: [] as string[],
    sectionList: [] as number[],
    applicableSections: [-1],
    gppString: "",
    parsedSections: {},
  };
}
