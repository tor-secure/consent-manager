export type IabFrameworkStatus = "disabled" | "foundation";

export type IabTcfConfig = {
  enabled: boolean;
};

export type IabGppConfig = {
  enabled: boolean;
};

export function parseIabTcfConfig(raw: unknown): IabTcfConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { enabled: false };
  return { enabled: (raw as { enabled?: unknown }).enabled === true };
}

export function parseIabGppConfig(raw: unknown): IabGppConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { enabled: false };
  return { enabled: (raw as { enabled?: unknown }).enabled === true };
}

export type IabSignalSnapshot = {
  tcf: {
    enabled: boolean;
    status: IabFrameworkStatus;
    api: "__tcfapi";
    spec: "TCF v2.2 ping/stub only";
    tcString: null;
    cmpId: null;
  };
  gpp: {
    enabled: boolean;
    status: IabFrameworkStatus;
    api: "__gpp";
    spec: "GPP ping/stub only";
    gppString: null;
  };
};

export function buildIabSignalSnapshot(input: {
  tcf: IabTcfConfig;
  gpp: IabGppConfig;
}): IabSignalSnapshot {
  return {
    tcf: {
      enabled: input.tcf.enabled,
      status: input.tcf.enabled ? "foundation" : "disabled",
      api: "__tcfapi",
      spec: "TCF v2.2 ping/stub only",
      tcString: null,
      cmpId: null,
    },
    gpp: {
      enabled: input.gpp.enabled,
      status: input.gpp.enabled ? "foundation" : "disabled",
      api: "__gpp",
      spec: "GPP ping/stub only",
      gppString: null,
    },
  };
}

export function tcfPingResponse(enabled: boolean) {
  return {
    gdprApplies: enabled,
    cmpLoaded: false,
    cmpStatus: enabled ? "stub" : "disabled",
    displayStatus: "hidden",
    apiVersion: "2.2",
    cmpId: 0,
    cmpVersion: 0,
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
