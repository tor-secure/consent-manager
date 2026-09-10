import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const mdPath = path.join(root, "ConsentFlow-Operator-Guide.md");
const htmlPath = path.join(root, "consentflow-user-manual.html");

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
      closeList();
      i += 1;
      continue;
    }

    const heading = /^(#{2,3})\s+(.+)$/.exec(line);
    if (heading) {
      closeList();
      const title = heading[2].trim();
      if (title === "Contents") {
        i += 1;
        while (i < lines.length && (lines[i] === "" || /^\d+\.\s+\[/.test(lines[i]))) {
          i += 1;
        }
        continue;
      }
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
    if (line.startsWith("**Product:**") || line.startsWith("**Audience:**") || line.startsWith("**Version:**")) {
      i += 1;
      continue;
    }
    if (line === "## Contents" || line.startsWith("1. [What ConsentFlow")) {
      while (i < lines.length && (lines[i].startsWith("## Contents") || /^\d+\.\s+\[/.test(lines[i]) || lines[i] === "")) {
        i += 1;
      }
      continue;
    }

    out.push(`<p>${inline(line)}</p>`);
    i += 1;
  }

  closeList();
  flushTable();
  return out.join("\n");
}

const FIGURES = `
  <div class="fig">
    <div class="browser">
      <div class="chrome"><div class="dots"><span></span><span></span><span></span></div><div class="url">/dashboard</div></div>
      <div class="app">
        <div class="side">
          <div class="brand">ConsentFlow</div>
          <div class="g">Overview</div>
          <div class="on">Dashboard</div>
          <div class="g">Websites</div>
          <div>Websites</div>
          <div class="g">Consent</div>
          <div>Policies</div>
          <div>Purposes</div>
          <div>Vendors</div>
          <div>Trackers</div>
          <div class="g">Intelligence</div>
          <div>Firewall</div>
        </div>
        <div class="main">
          <p class="title">Get live</p>
          <p class="sub">Website → Purposes → Vendors → Policy → Publish → Install</p>
          <div class="card">
            <span class="pill">1 Website</span>
            <span class="pill">2 Purposes</span>
            <span class="pill-amber pill">3 Set vendor role</span>
            <span class="pill-amber pill">4 Publish</span>
          </div>
        </div>
      </div>
    </div>
    <p class="fig-cap">Figure 1. After login the navy sidebar lists every module. The home Get live strip is the path that produces a banner.</p>
  </div>
  <div class="fig">
    <div class="browser">
      <div class="banner-demo">
        <div class="cookie">
          <strong>We use cookies</strong>
          <p style="margin:6px 0 10px;font-size:8.5pt;color:#5b6b80;">Necessary cookies keep this site working. Analytics and advertising wait for your choice.</p>
          <span class="btn">Accept all</span>
          <span class="btn btn-ghost">Reject</span>
          <span class="btn btn-ghost">Customize</span>
        </div>
      </div>
    </div>
    <p class="fig-cap">Figure 2. Visitor banner after a policy is published and the SDK snippet is first in &lt;head&gt;.</p>
  </div>
`;

const CSS = readFileSync(htmlPath, "utf8").match(/<style>([\s\S]*?)<\/style>/)?.[1]
  ?? "";

const markdown = readFileSync(mdPath, "utf8");
const body = mdToHtml(markdown);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>ConsentFlow Operator Guide — Dashboard modules, tracker blocking, templates, and regulations</title>
  <style>${CSS}</style>
</head>
<body>
  <section class="cover">
    <div class="eyebrow">ConsentFlow · Operator guide</div>
    <h1>Operator Guide</h1>
    <p class="lede">Every sidebar module, tracker blocking, purpose and policy templates, and what DPDP, GDPR, CCPA, and the other catalog acts do in this product — step by step from first sign-in to a live banner.</p>
    <div class="meta">
      <p><strong>Product:</strong> ConsentFlow Consent Management Platform</p>
      <p><strong>Audience:</strong> site owners, privacy operators, and developers</p>
      <p><strong>Source:</strong> docs/user-manual/ConsentFlow-Operator-Guide.md</p>
      <p><strong>Version:</strong> September 2026</p>
      <p>This is an operations manual, not legal advice or a compliance certification.</p>
    </div>
  </section>
  <section class="toc">
    <h2>Contents</h2>
    <ol>
      <li>What ConsentFlow does</li>
      <li>Sign in, organization, and the sidebar</li>
      <li>Get live path</li>
      <li>Dashboard home</li>
      <li>Websites</li>
      <li>Regulations, enforcement, and child protection</li>
      <li>Consent records</li>
      <li>Policies, Banner Studio, and publish</li>
      <li>Purposes</li>
      <li>Vendors</li>
      <li>Transfers</li>
      <li>Trackers</li>
      <li>Tracker blocking</li>
      <li>Scanner through Analytics</li>
      <li>Intelligence tools</li>
      <li>Governance, developer, and admin</li>
      <li>Templates</li>
      <li>DPDP, GDPR, CCPA, and other acts</li>
      <li>Publish rules and troubleshooting</li>
    </ol>
    ${FIGURES}
  </section>
  ${body}
</body>
</html>
`;

writeFileSync(htmlPath, html);
console.log(`Wrote ${htmlPath}`);
