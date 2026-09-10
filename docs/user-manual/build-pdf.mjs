import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

execFileSync(process.execPath, [path.join(path.dirname(fileURLToPath(import.meta.url)), "render-guide.mjs")], {
  stdio: "inherit",
});

const root = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(root, "consentflow-user-manual.html");
const pdfPath = path.join(root, "..", "ConsentFlow-User-Manual.pdf");
const fileUrl = pathToFileURL(htmlPath).href;

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
    fileUrl,
  ],
  { stdio: "inherit" },
);

console.log(`Wrote ${pdfPath}`);
