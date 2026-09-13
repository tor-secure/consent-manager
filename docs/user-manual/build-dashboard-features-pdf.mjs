import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const mdPath = path.join(root, "Dashboard-Features-Guide.md");
const htmlPath = path.join(root, "dashboard-features-guide.html");
const pdfPath = path.join(root, "..", "Consent-Guru-Dashboard-Features.pdf");

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function inline(value) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function mdToHtml(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let i = 0;
  let inCode = false;
  let code = [];
  let listType = null;
  let table = [];

  function closeList() {
    if (listType) {
      out.push(listType === "ol" ? "</ol>" : "</ul>");
      listType = null;
    }
  }

  function flushTable() {
    if (table.length === 0) return;
    const rows = table.filter((row) => !/^\s*\|?\s*-{2,}/.test(row));
    const parsed = rows.map((row) =>
      row
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((cell) => inline(cell.trim())),
    );
    if (parsed.length === 0) {
      table = [];
      return;
    }
    out.push("<table>");
    parsed.forEach((cells, index) => {
      const tag = index === 0 ? "th" : "td";
      out.push(`<tr>${cells.map((cell) => `<${tag}>${cell}</${tag}>`).join("")}</tr>`);
    });
    out.push("</table>");
    table = [];
  }

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("```")) {
      if (inCode) {
        out.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
        code = [];
        inCode = false;
      } else {
        closeList();
        flushTable();
        inCode = true;
      }
      i += 1;
      continue;
    }
    if (inCode) {
      code.push(line);
      i += 1;
      continue;
    }

    if (line.startsWith("|")) {
      closeList();
      table.push(line);
      i += 1;
      continue;
    }
    flushTable();

    if (/^\s*$/.test(line)) {
      closeList();
      i += 1;
      continue;
    }

    if (line.startsWith("# ")) {
      i += 1;
      continue;
    }

    const heading = /^(#{2,3})\s+(.+)$/.exec(line);
    if (heading) {
      closeList();
      const title = heading[2].trim();
      const level = heading[1].length;
      out.push(`<h${level} id="${slugify(title)}">${inline(title)}</h${level}>`);
      i += 1;
      continue;
    }

    if (line.startsWith("> ")) {
      closeList();
      const quote = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        quote.push(lines[i].slice(2));
        i += 1;
      }
      out.push(`<div class="note">${inline(quote.join(" "))}</div>`);
      continue;
    }

    if (line.startsWith("---")) {
      closeList();
      i += 1;
      continue;
    }

    const ol = /^\d+\.\s+(.+)$/.exec(line);
    if (ol) {
      if (listType !== "ol") {
        closeList();
        out.push("<ol>");
        listType = "ol";
      }
      out.push(`<li>${inline(ol[1])}</li>`);
      i += 1;
      continue;
    }

    const ul = /^[-*]\s+(.+)$/.exec(line);
    if (ul) {
      if (listType !== "ul") {
        closeList();
        out.push("<ul>");
        listType = "ul";
      }
      out.push(`<li>${inline(ul[1])}</li>`);
      i += 1;
      continue;
    }

    closeList();
    if (
      line.startsWith("**Product:**") ||
      line.startsWith("**Audience:**") ||
      line.startsWith("**What this guide covers:**")
    ) {
      i += 1;
      continue;
    }

    out.push(`<p>${inline(line)}</p>`);
    i += 1;
  }

  closeList();
  flushTable();
  return out.join("\n");
}

const CSS = `
  @page { size: A4; margin: 16mm 14mm 18mm; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    color: #111827;
    background: #fff;
    font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
    font-size: 11pt;
    line-height: 1.5;
  }
  h1, h2, h3 { page-break-after: avoid; }
  h1 { font-size: 26pt; line-height: 1.15; margin: 0 0 8px; color: #0B2C4A; }
  h2 { font-size: 16pt; margin: 28px 0 10px; color: #0B2C4A; border-bottom: 2px solid #E6F9F5; padding-bottom: 6px; }
  h3 { font-size: 12.5pt; margin: 18px 0 8px; color: #0B2C4A; }
  p, li { orphans: 3; widows: 3; }
  a { color: #0B2C4A; }
  .cover {
    page-break-after: always;
    min-height: 240mm;
    padding: 28mm 8mm 16mm;
    background:
      radial-gradient(ellipse 80% 50% at 100% 0%, rgba(0,196,167,0.16), transparent 55%),
      linear-gradient(180deg, #F3FAF8 0%, #ffffff 55%);
  }
  .eyebrow {
    display: inline-block;
    background: #E6F9F5;
    color: #0B2C4A;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 6px 10px;
    border-radius: 999px;
    margin-bottom: 18px;
  }
  .lede { font-size: 13.5pt; color: #4B5563; max-width: 42rem; }
  .meta { margin-top: 36px; color: #4B5563; font-size: 10pt; }
  .toc { page-break-after: always; }
  .toc ol { padding-left: 1.2rem; }
  .toc li { margin: 6px 0; }
  .note {
    border-radius: 12px;
    padding: 10px 14px;
    margin: 12px 0 16px;
    font-size: 10.5pt;
    background: #E6F9F5;
    border: 1px solid #99d5cf;
  }
  code {
    font-family: ui-monospace, "Cascadia Mono", Consolas, monospace;
    font-size: 9.5pt;
    background: #F3F4F6;
    padding: 1px 5px;
    border-radius: 6px;
  }
  pre {
    background: #0B2C4A;
    color: #E6F9F5;
    padding: 12px 14px;
    border-radius: 12px;
    font-size: 8.8pt;
    white-space: pre-wrap;
    page-break-inside: avoid;
  }
  table { width: 100%; border-collapse: collapse; font-size: 10pt; margin: 10px 0 16px; }
  th, td { border: 1px solid #E5E7EB; padding: 7px 8px; text-align: left; vertical-align: top; }
  th { background: #F3FAF8; color: #0B2C4A; }
  ol, ul { margin: 8px 0 16px; }
  li { margin: 4px 0; }
  strong { color: #0B2C4A; }
`;

const markdown = readFileSync(mdPath, "utf8");
const body = mdToHtml(markdown);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Consent Guru — Dashboard Features Guide</title>
  <style>${CSS}</style>
</head>
<body>
  <section class="cover">
    <div class="eyebrow">Consent Guru · Dashboard guide</div>
    <h1>Dashboard Features</h1>
    <p class="lede">What every dashboard feature is, and how to use it step by step — for someone opening the product for the first time.</p>
    <div class="meta">
      <p><strong>Product:</strong> Consent Guru</p>
      <p><strong>Audience:</strong> site owners, privacy operators, marketers, and developers</p>
      <p><strong>Source:</strong> docs/user-manual/Dashboard-Features-Guide.md</p>
      <p><strong>Version:</strong> September 2026</p>
      <p>This is an operations guide. It is not legal advice and not a compliance certification.</p>
    </div>
  </section>
  <section class="toc">
    <h2>Contents</h2>
    <ol>
      <li>How the dashboard is organized</li>
      <li>The path to a live banner</li>
      <li>Dashboard home</li>
      <li>Websites, installation, regulations, enforcement, child protection</li>
      <li>Consent Management — records, policies, Banner Studio, purposes, vendors, transfers, trackers</li>
      <li>Discovery &amp; Monitoring — scanner, drift, risk, quality, analytics</li>
      <li>Intelligence tools</li>
      <li>Security &amp; Governance</li>
      <li>Developer — SDK, API keys, integrations, webhooks</li>
      <li>Administration — organization, retention, team</li>
      <li>Public pages and common mistakes</li>
    </ol>
  </section>
  ${body}
</body>
</html>
`;

writeFileSync(htmlPath, html);
console.log(`Wrote ${htmlPath}`);

const browsers = [
  process.env.EDGE_PATH,
  process.env["PROGRAMFILES(X86)"] && path.join(process.env["PROGRAMFILES(X86)"], "Microsoft", "Edge", "Application", "msedge.exe"),
  process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, "Microsoft", "Edge", "Application", "msedge.exe"),
  process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Microsoft", "Edge", "Application", "msedge.exe"),
  process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, "Google", "Chrome", "Application", "chrome.exe"),
  process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe"),
].filter(Boolean);

const browser = browsers.find((candidate) => existsSync(candidate));
if (!browser) {
  console.error("Could not find Microsoft Edge or Google Chrome.");
  process.exit(1);
}

execFileSync(
  browser,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-pdf-header-footer",
    `--print-to-pdf=${pdfPath}`,
    "--print-to-pdf-no-header",
    pathToFileURL(htmlPath).href,
  ],
  { stdio: "inherit" },
);

console.log(`Wrote ${pdfPath}`);
