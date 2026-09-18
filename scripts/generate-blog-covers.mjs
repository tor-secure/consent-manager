import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "images", "blogs");
mkdirSync(outDir, { recursive: true });

const covers = [
  ["india-dpdp-act-consent-manager", "#0B2C4A", "#00C4A7", "DPDP"],
  ["gdpr-consent-vs-legitimate-interest", "#123A5C", "#2EE6C8", "GDPR"],
  ["why-businesses-need-a-consent-manager", "#071E33", "#00C4A7", "CMP"],
  ["ccpa-cpra-california-opt-out", "#1B4B73", "#4ADE80", "CCPA"],
  ["lgpd-brazil-consent-requirements", "#0F3D2E", "#34D399", "LGPD"],
  ["pipeda-canada-meaningful-consent", "#102A43", "#38BDF8", "PIPEDA"],
  ["pdpa-singapore-consent-obligations", "#0B3A4A", "#22D3EE", "PDPA"],
  ["pdpa-thailand-cross-border-rules", "#3B1D0F", "#FBBF24", "TH"],
  ["pipa-south-korea-consent-banners", "#1E1B4B", "#A78BFA", "PIPA"],
  ["appi-japan-cookie-consent", "#3F1D38", "#F472B6", "APPI"],
  ["australia-privacy-act-reforms", "#14532D", "#86EFAC", "AU"],
  ["uk-gdpr-post-brexit-cmp", "#1E3A8A", "#93C5FD", "UK"],
  ["popia-south-africa-consent", "#422006", "#F59E0B", "POPIA"],
  ["uae-pdpl-consent-management", "#134E4A", "#5EEAD4", "UAE"],
  ["saudi-pdpl-data-protection", "#365314", "#A3E635", "KSA"],
  ["china-pipl-separate-consent", "#7F1D1D", "#FCA5A5", "PIPL"],
  ["cookie-consent-best-practices", "#0B2C4A", "#67E8F9", "COOKIES"],
  ["recording-consent-evidence-audits", "#111827", "#00C4A7", "EVIDENCE"],
  ["withdrawing-consent-without-friction", "#164E63", "#67E8F9", "WITHDRAW"],
  ["preference-centers-and-consent-managers", "#312E81", "#C4B5FD", "PREFS"],
  ["iab-tcf-and-global-privacy-platform", "#1F2937", "#00C4A7", "IAB"],
  ["childrens-privacy-coppa-and-dpdp", "#831843", "#F9A8D4", "KIDS"],
  ["cross-border-transfers-and-consent", "#0F172A", "#38BDF8", "TRANSFERS"],
  ["vendor-management-under-privacy-laws", "#1C1917", "#FDBA74", "VENDORS"],
  ["mobile-app-consent-sdks", "#172554", "#60A5FA", "MOBILE"],
  ["multi-jurisdiction-consent-orchestration", "#042F2E", "#2DD4BF", "GLOBAL"],
  ["data-subject-rights-and-your-cmp", "#1E293B", "#94A3B8", "RIGHTS"],
  ["age-assurance-and-parental-consent", "#4A044E", "#E879F9", "AGE"],
  ["ai-agents-permissioning-and-privacy", "#0B2C4A", "#00C4A7", "AI"],
  ["privacy-laws-around-the-world-2026", "#020617", "#00C4A7", "2026"],
];

function svg(slug, from, to, label, index) {
  const cx = 180 + (index % 5) * 40;
  const cy = 160 + (index % 4) * 28;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630" role="img" aria-label="${label} cover">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${from}"/>
      <stop offset="100%" stop-color="${to}"/>
    </linearGradient>
    <pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.4" fill="rgba(255,255,255,0.18)"/>
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#dots)"/>
  <circle cx="${920 + (index % 7) * 8}" cy="${120 + index * 6}" r="${180 + (index % 5) * 12}" fill="rgba(255,255,255,0.08)"/>
  <circle cx="${180 + index * 9}" cy="${480}" r="${120 + (index % 6) * 10}" fill="rgba(11,44,74,0.18)"/>
  <rect x="${80 + (index % 3) * 12}" y="${90}" width="220" height="220" rx="36" fill="rgba(255,255,255,0.12)"/>
  <path d="M${cx} ${cy + 70}c0-48 32-70 70-90 38 20 70 42 70 90v28c-22 18-46 30-70 38-24-8-48-20-70-38z" fill="rgba(255,255,255,0.92)"/>
  <path d="M${cx + 46} ${cy + 78}l18 18 34-36" fill="none" stroke="${from}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="80" y="430" fill="rgba(255,255,255,0.72)" font-family="Georgia, serif" font-size="28" letter-spacing="4">${String(index + 1).padStart(2, "0")} / 30</text>
  <text x="80" y="500" fill="#ffffff" font-family="Arial, sans-serif" font-size="54" font-weight="700">${label}</text>
  <text x="80" y="552" fill="rgba(255,255,255,0.8)" font-family="Arial, sans-serif" font-size="22">Consent Guru Insights</text>
</svg>
`;
}

for (const [index, [slug, from, to, label]] of covers.entries()) {
  writeFileSync(join(outDir, `${slug}.svg`), svg(slug, from, to, label, index));
}

console.log(`Wrote ${covers.length} covers to ${outDir}`);
