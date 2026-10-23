// Serves the browser-verified UI fixtures without Next auth or tenant data.
import fs from "node:fs/promises";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, ".tmp", "ui-review");
await fs.access(path.join(output, "ui-review.js"));
const server = http.createServer(async (request, response) => {
  const pathname = new URL(request.url, "http://localhost").pathname;
  if (pathname === "/" || pathname.startsWith("/dashboard")) {
    response.setHeader("content-type", "text/html; charset=utf-8");
    response.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/review.css"><title>Consent Guru UI preview</title></head><body><div id="root"></div><script type="module" src="/ui-review.js"></script></body></html>');
    return;
  }
  const base = pathname.startsWith("/brand/") || pathname.startsWith("/images/") ? path.join(root, "public") : output;
  const file = path.resolve(base, `.${pathname}`);
  if (!file.startsWith(`${base}${path.sep}`)) { response.writeHead(403).end(); return; }
  try {
    response.setHeader("content-type", ({ ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".js": "text/javascript" })[path.extname(file)] ?? "application/octet-stream");
    response.end(await fs.readFile(file));
  } catch { response.writeHead(404).end(); }
});
const port = Number(process.env.UI_PREVIEW_PORT ?? 4173);
server.listen(port, "127.0.0.1", () => console.log(`Synthetic Consent Guru UI preview: http://127.0.0.1:${port}/?view=public`));
