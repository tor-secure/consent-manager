export type AbTestVariant = {
  id: string;
  label: string;
  weight: number;
  overrides: Record<string, string | number | boolean>;
};

export type BannerAbTest = {
  enabled: boolean;
  variants: AbTestVariant[];
};

const ID_RE = /^[a-z0-9-]{1,40}$/;

export function parseBannerAbTest(raw: unknown): BannerAbTest | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  if (!Array.isArray(row.variants)) return null;
  const variants: AbTestVariant[] = [];
  for (const item of row.variants) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const variant = item as Record<string, unknown>;
    if (typeof variant.id !== "string" || !ID_RE.test(variant.id)) continue;
    const overrides: Record<string, string | number | boolean> = {};
    if (variant.overrides && typeof variant.overrides === "object" && !Array.isArray(variant.overrides)) {
      for (const [key, value] of Object.entries(variant.overrides as Record<string, unknown>)) {
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
          overrides[key] = value;
        }
      }
    }
    variants.push({
      id: variant.id,
      label: typeof variant.label === "string" ? variant.label.slice(0, 80) : variant.id,
      weight: Math.max(0, Math.min(100, Number(variant.weight) || 0)),
      overrides,
    });
  }
  if (variants.length < 2) return null;
  return { enabled: row.enabled === true, variants };
}

const OVERRIDE_KEYS = new Set([
  "layout",
  "position",
  "showRejectAll",
  "showAcceptAll",
  "showCustomize",
  "showCloseButton",
  "overlayEnabled",
  "blockPageUntilConsent",
  "title",
  "description",
]);

export function pickAbVariant(test: BannerAbTest, random = Math.random): AbTestVariant {
  const weights = test.variants.map((row) => Math.max(0, row.weight));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (total <= 0) {
    const index = Math.min(test.variants.length - 1, Math.floor(random() * test.variants.length));
    return test.variants[Math.max(0, index)];
  }
  let cursor = random() * total;
  for (let i = 0; i < test.variants.length; i++) {
    cursor -= weights[i];
    if (cursor <= 0) return test.variants[i];
  }
  return test.variants[test.variants.length - 1];
}

export function applyAbOverrides<T extends Record<string, unknown>>(
  banner: T,
  overrides: Record<string, string | number | boolean>,
): T {
  const next = { ...banner };
  for (const [key, value] of Object.entries(overrides)) {
    if (!OVERRIDE_KEYS.has(key)) continue;
    (next as Record<string, unknown>)[key] = value;
  }
  if (next.layout === "dialog") {
    (next as Record<string, unknown>).position = "center";
  }
  return next;
}

export function defaultBannerAbTest(): BannerAbTest {
  return {
    enabled: true,
    variants: [
      { id: "control", label: "Control (current banner)", weight: 50, overrides: {} },
      {
        id: "dialog-reject",
        label: "Dialog + reject all",
        weight: 50,
        overrides: { layout: "dialog", position: "center", showRejectAll: true },
      },
    ],
  };
}
