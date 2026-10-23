import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_HTML_BYTES = 150_000;
const MAX_HOPS = 4;

function isPrivateAddress(address: string) {
  const ip = address.toLowerCase().replace(/^::ffff:/, "");
  if (ip === "::1" || ip === "0.0.0.0") return true;
  if (ip.startsWith("127.") || ip.startsWith("10.") || ip.startsWith("192.168.") || ip.startsWith("169.254.") || ip.startsWith("0.")) {
    return true;
  }
  const octets = ip.split(".").map((part) => Number(part));
  if (octets.length === 4 && octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true;
  if (octets.length === 4 && octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127) return true;
  if (ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80:")) return true;
  return false;
}

export function isPublicHostname(host: string) {
  const name = host.trim().toLowerCase().replace(/\.$/, "");
  if (!name || name.length > 253 || isIP(name)) return false;
  if (!/^[a-z0-9.-]+$/.test(name) || name.includes("..") || name.startsWith(".") || name.startsWith("-")) return false;
  if (name === "localhost" || name.endsWith(".local") || name.endsWith(".internal") || name.endsWith(".localhost")) {
    return false;
  }
  return name.includes(".");
}

async function assertPublicHost(host: string) {
  if (!isPublicHostname(host)) throw new Error("Host is not public");
  const records = await lookup(host, { all: true, verbatim: true });
  if (records.length === 0 || records.some((record) => isPrivateAddress(record.address))) {
    throw new Error("Host does not resolve to a public address");
  }
}

function attr(tag: string, name: string) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return (match?.[2] ?? match?.[3] ?? match?.[4] ?? "").trim();
}

export function pickDeclaredIcon(html: string, pageUrl: URL) {
  const tags = html.match(/<link\b[^>]*>/gi) ?? [];
  let best: { url: string; score: number } | null = null;

  for (const tag of tags) {
    const rel = attr(tag, "rel").toLowerCase();
    const parts = rel.split(/\s+/);
    const isIcon = parts.includes("icon") || parts.includes("shortcut") || parts.includes("apple-touch-icon");
    if (!isIcon || parts.includes("mask-icon") || parts.includes("preload")) continue;
    const href = attr(tag, "href");
    if (!href || href.startsWith("data:")) continue;

    let score = 1;
    if (parts.includes("icon") || parts.includes("shortcut")) score += 4;
    if (parts.includes("apple-touch-icon")) score += 1;
    const type = attr(tag, "type").toLowerCase();
    if (type.includes("png")) score += 2;
    if (type.includes("svg")) score += 1;
    const size = Number(attr(tag, "sizes").split("x")[0]);
    if (Number.isFinite(size) && size > 0) score += Math.min(size, 512) / 256;

    let url: URL;
    try {
      url = new URL(href, pageUrl);
    } catch {
      continue;
    }
    if (url.protocol !== "https:") continue;
    if (!best || score > best.score) best = { url: url.toString(), score };
  }

  return best?.url ?? null;
}

async function fetchPublic(start: URL, method: "GET" | "HEAD") {
  let current = start;
  for (let hop = 0; hop < MAX_HOPS; hop += 1) {
    await assertPublicHost(current.hostname);
    const response = await fetch(current, {
      method,
      redirect: "manual",
      signal: AbortSignal.timeout(4000),
      headers: {
        "User-Agent": "ConsentGuru-Favicon/1.0",
        Accept: method === "HEAD" ? "image/*,*/*;q=0.8" : "text/html,application/xhtml+xml",
      },
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) return null;
      const next = new URL(location, current);
      if (next.protocol !== "https:") return null;
      current = next;
      continue;
    }
    return { response, url: current };
  }
  return null;
}

async function readLimitedHtml(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < MAX_HTML_BYTES) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    chunks.push(value);
    total += value.byteLength;
  }
  await reader.cancel().catch(() => undefined);
  const merged = new Uint8Array(Math.min(total, MAX_HTML_BYTES));
  let offset = 0;
  for (const chunk of chunks) {
    const take = Math.min(chunk.byteLength, merged.length - offset);
    merged.set(chunk.subarray(0, take), offset);
    offset += take;
    if (offset >= merged.length) break;
  }
  return new TextDecoder().decode(merged);
}

async function fallbackFavicon(host: string) {
  const probed = await fetchPublic(new URL(`https://${host}/favicon.ico`), "HEAD");
  if (!probed?.response.ok) return null;
  const type = probed.response.headers.get("content-type") ?? "";
  if (!type.startsWith("image/")) return null;
  await assertPublicHost(probed.url.hostname);
  return probed.url.toString();
}

export async function resolveSiteFavicon(host: string) {
  const page = await fetchPublic(new URL(`https://${host}/`), "GET");
  if (!page?.response.ok) return fallbackFavicon(host);
  const html = await readLimitedHtml(page.response);
  const declared = pickDeclaredIcon(html, page.url);
  if (!declared) return fallbackFavicon(host);
  const icon = new URL(declared);
  await assertPublicHost(icon.hostname);
  return icon.toString();
}
