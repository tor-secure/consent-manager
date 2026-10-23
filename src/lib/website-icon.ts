const DATA_ICON = /^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i;
const MAX_ICON_LENGTH = 280_000;

export function parseWebsiteIcon(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string") {
    throw new Error("Icon must be an image file.");
  }
  const trimmed = value.trim();
  if (trimmed.length > MAX_ICON_LENGTH) {
    throw new Error("Icon must be 150 KB or smaller.");
  }
  if (trimmed.startsWith("data:")) {
    if (!DATA_ICON.test(trimmed)) throw new Error("Use a PNG, JPG, or WebP icon.");
    return trimmed;
  }
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("Icon address must be an https link or an image file.");
  }
  if (url.protocol !== "https:") throw new Error("Icon address must use https.");
  return url.toString();
}
