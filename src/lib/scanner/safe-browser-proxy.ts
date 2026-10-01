import "server-only";

import { lookup } from "node:dns/promises";
import { createServer, request as httpRequest, type Server } from "node:http";
import { request as httpsRequest } from "node:https";
import { connect as connectTcp } from "node:net";
import { isIP } from "node:net";
import type { Writable } from "node:stream";
import { assertSafeScanUrl } from "./ssrf-guard";
import { pickPublicAddress, type AddressRecord } from "./safe-browser-proxy-core";
import { crawlerSafeProxyHeaders } from "./browser-crawl-core";

type Resolver = (hostname: string) => Promise<AddressRecord[]>;

const PORTS: Record<string, number> = { "http:": 80, "https:": 443 };
const DNS_TIMEOUT_MS = 5_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("DNS resolution timeout")), timeoutMs);
    promise.then((value) => { clearTimeout(timer); resolve(value); }, (error: unknown) => { clearTimeout(timer); reject(error); });
  });
}

async function resolveAndPin(rawUrl: string, resolver: Resolver = (hostname) => lookup(hostname, { all: true, verbatim: true })) {
  const checked = await withTimeout(assertSafeScanUrl(rawUrl), DNS_TIMEOUT_MS);
  const host = checked.hostname.replace(/^\[|\]$/g, "");
  const port = checked.port ? Number(checked.port) : PORTS[checked.protocol];
  if (!port || port !== PORTS[checked.protocol]) throw new Error("Blocked proxy destination");
  const records = isIP(host) ? [{ address: host, family: isIP(host) }] : await withTimeout(resolver(host), DNS_TIMEOUT_MS);
  const selected = pickPublicAddress(records);
  if (!selected) throw new Error("Blocked proxy destination");
  return { url: checked, address: selected.address, family: selected.family, port };
}

export async function validateSafeBrowserTarget(rawUrl: string): Promise<URL> {
  return (await resolveAndPin(rawUrl)).url;
}

/** Fetches a small HTTP(S) text resource with DNS pinned to the vetted address. */
export async function fetchPublicText(rawUrl: string, options: { maxBytes: number; timeoutMs: number; resolver?: Resolver }): Promise<string | null> {
  let target: Awaited<ReturnType<typeof resolveAndPin>>;
  try { target = await resolveAndPin(rawUrl, options.resolver); } catch { return null; }
  const transport = target.url.protocol === "https:" ? httpsRequest : httpRequest;
  const pinnedLookup = ((_: string, optionsOrCallback: { all?: boolean } | ((error: NodeJS.ErrnoException | null, address: string | AddressRecord[], family?: number) => void), callbackMaybe?: (error: NodeJS.ErrnoException | null, address: string | AddressRecord[], family?: number) => void) => {
    const lookupOptions = typeof optionsOrCallback === "function" ? {} : optionsOrCallback;
    const callback = typeof optionsOrCallback === "function" ? optionsOrCallback : callbackMaybe!;
    if (lookupOptions?.all) callback(null, [{ address: target.address, family: target.family }]);
    else callback(null, target.address, target.family);
  }) as never;
  return new Promise((resolve) => {
    let bodySize = 0;
    const chunks: Buffer[] = [];
    const request = transport(target.url, { lookup: pinnedLookup, timeout: options.timeoutMs, headers: { "user-agent": "ConsentGuruBrowserCrawler/2.0", host: target.url.host } }, (response) => {
      if (response.statusCode !== 200) { response.destroy(); resolve(null); return; }
      const declaredSize = Number(response.headers["content-length"] || 0);
      if (declaredSize > options.maxBytes) { response.destroy(); resolve(null); return; }
      response.on("data", (chunk: Buffer | string) => {
        const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        bodySize += bytes.length;
        if (bodySize > options.maxBytes) { request.destroy(); resolve(null); return; }
        chunks.push(bytes);
      });
      response.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      response.on("error", () => resolve(null));
    });
    request.on("timeout", () => request.destroy(new Error("Request timeout")));
    request.on("error", () => resolve(null));
    request.end();
  });
}

function writeProxyError(socket: Writable & { destroyed: boolean }, status = 403) {
  if (socket.destroyed) return;
  socket.end(`HTTP/1.1 ${status} Forbidden\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
}

/**
 * Browser traffic is tunneled through this loopback-only proxy. Hostname checks
 * happen here and the socket connects to the exact checked address, closing the
 * DNS check/use window left by browser-native resolution.
 */
export async function startSafeBrowserProxy(options: { resolver?: Resolver } = {}): Promise<{ url: string; close: () => Promise<void> }> {
  const resolver = options.resolver;
  const server: Server = createServer(async (request, response) => {
    let target: Awaited<ReturnType<typeof resolveAndPin>>;
    try {
      if (!request.url || request.url.length > 4096) throw new Error("Invalid proxy URL");
      const parsed = new URL(request.url);
      if (parsed.protocol !== "http:" || parsed.username || parsed.password || parsed.hash) throw new Error("Invalid proxy URL");
      target = await resolveAndPin(parsed.href, resolver);
    } catch {
      response.writeHead(403, { "content-length": "0", connection: "close" }).end();
      return;
    }

    const upstream = httpRequest({
      hostname: target.address,
      family: target.family,
      port: target.port,
      method: request.method,
      path: `${target.url.pathname}${target.url.search}`,
      headers: { ...crawlerSafeProxyHeaders(request.headers), host: target.url.host, connection: "close", "proxy-connection": undefined },
      agent: false,
      timeout: 20_000,
    });
    upstream.on("response", (upstreamResponse) => {
      const headers = { ...upstreamResponse.headers };
      delete headers["proxy-authenticate"];
      response.writeHead(upstreamResponse.statusCode ?? 502, headers);
      upstreamResponse.pipe(response);
    });
    upstream.on("timeout", () => upstream.destroy(new Error("Upstream timeout")));
    upstream.on("error", () => { if (!response.headersSent) writeProxyError(response, 502); else response.destroy(); });
    request.on("aborted", () => upstream.destroy());
    response.on("close", () => upstream.destroy());
    request.pipe(upstream);
  });

  server.on("connect", async (request, clientSocket, head) => {
    let target: Awaited<ReturnType<typeof resolveAndPin>>;
    try {
      const authority = request.url ?? "";
      if (authority.length > 512 || authority.includes("@")) throw new Error("Invalid CONNECT authority");
      const parsed = new URL(`https://${authority}`);
      if (parsed.pathname !== "/" || parsed.search || parsed.hash || parsed.username || parsed.password) throw new Error("Invalid CONNECT authority");
      target = await resolveAndPin(parsed.href, resolver);
    } catch {
      writeProxyError(clientSocket);
      return;
    }
    const upstream = connectTcp({ host: target.address, family: target.family, port: target.port });
    const connectTimeout = setTimeout(() => upstream.destroy(new Error("Connect timeout")), 10_000);
    upstream.once("connect", () => {
      clearTimeout(connectTimeout);
      clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
      if (head.length) upstream.write(head);
      upstream.pipe(clientSocket);
      clientSocket.pipe(upstream);
    });
    upstream.once("error", () => { clearTimeout(connectTimeout); writeProxyError(clientSocket, 502); });
    clientSocket.once("error", () => upstream.destroy());
    clientSocket.once("close", () => upstream.destroy());
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => { server.off("error", reject); resolve(); });
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Unable to start browser proxy");
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
}
