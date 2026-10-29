import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import { GAP_AREAS, GAP_CONTROLS, controlApplies, controlReference, type GapAnswer } from "@/config/tools/gap";
import { answerLabel, gapReportNarrative, type GapAnalysis } from "./gap-engine";
import type { GapDocument } from "./gap-document";

function clean(text: string): string {
  return text
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, "\"")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "")
    .replace(/[^\S\n]+/g, " ")
    .trim();
}

function wrap(text: string, width: number): string[] {
  const cleaned = clean(text);
  if (!cleaned) return [];
  const lines: string[] = [];
  let line = "";
  for (const word of cleaned.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > width) {
      if (line) lines.push(line);
      line = word.slice(0, width);
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function gapAssessmentPdf(document: GapDocument, completedAt: Date, logoBytes: Uint8Array): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const logo = await doc.embedJpg(logoBytes);
  const navy = rgb(0.043, 0.173, 0.29);
  const teal = rgb(0, 0.769, 0.655);
  const muted = rgb(0.29, 0.35, 0.39);
  let page = doc.addPage([595, 842]);
  let y = 812;

  function paintHeader(first: boolean) {
    const width = first ? 176 : 96;
    const height = (logo.height / logo.width) * width;
    page.drawImage(logo, { x: 48, y: y - height, width, height });
    y -= height + 8;
    page.drawRectangle({ x: 48, y, width: 499, height: 2.5, color: teal });
    y -= 18;
  }

  function nextPage() {
    page = doc.addPage([595, 842]);
    y = 812;
    paintHeader(false);
  }

  function write(text: string, size: number, useBold = false, color = navy) {
    const lines = wrap(text, size > 14 ? 46 : 92);
    if (lines.length === 0) return;
    for (const line of lines) {
      if (y < 56) nextPage();
      page.drawText(line, { x: 48, y, size, font: useBold ? bold : font, color });
      y -= size + 4;
    }
  }

  function gap(amount = 8) {
    y -= amount;
    if (y < 56) nextPage();
  }

  paintHeader(true);
  const analysis = document.analysis as GapAnalysis | null;
  const profile = document.profile;
  const responses = document.responses ?? {};
  write("DPDP Compliance Gap Assessment", 18, true);
  write(profile.companyName || "Organisation not named", 12, true, muted);
  write(`Assessment date: ${completedAt.toISOString().slice(0, 10)}    Methodology: ${document.version}`, 10, false, muted);
  gap(10);

  write("Detailed summary", 14, true);
  if (analysis) {
    for (const paragraph of gapReportNarrative(profile, responses, analysis)) {
      write(paragraph, 10, false, muted);
      gap(4);
    }
  } else {
    write("This assessment has no stored result.", 10, false, muted);
  }
  gap(6);

  write("Scores", 14, true);
  if (!analysis || analysis.score === null) {
    write("No overall score was stored.", 10);
  } else {
    write(`Overall readiness: ${analysis.score} / 100`, 12, true);
    write(`Coverage: ${analysis.coverage}% (${analysis.assessed} of ${analysis.applicable} applicable controls answered)`, 10);
    write(`Fully implemented: ${analysis.implemented}`, 10);
    write(`Partially implemented: ${analysis.partial}`, 10);
    write(`Not implemented: ${analysis.missing}`, 10);
    write(`Not applicable: ${analysis.notApplicable}`, 10);
    write(`Not yet assessed: ${analysis.unassessed}`, 10);
    write(`Critical findings: ${analysis.criticalGaps}`, 10);
    const counts = analysis.severityCounts;
    write(`Finding severity: critical ${counts.critical ?? 0}, high ${counts.high ?? 0}, medium ${counts.medium ?? 0}, low ${counts.low ?? 0}.`, 10);
  }
  gap(4);
  write("Category scores", 12, true);
  for (const area of analysis?.areas ?? []) {
    const score = area.score === null ? "Not scored" : `${area.score} / 100`;
    write(`${area.label}: ${score}. Implemented ${area.implemented}, partial ${area.partial}, missing ${area.missing}, applicable ${area.applicable}.`, 10);
  }
  gap(8);

  write("Questions and answers", 14, true);
  write("Each applicable control is shown with the answer recorded for this assessment, the legal reference, and any remark or evidence note.", 10, false, muted);
  gap(4);

  for (const area of GAP_AREAS) {
    const controls = GAP_CONTROLS.filter((item) => item.area === area.id);
    const shown = controls.filter((item) => controlApplies(item, profile));
    write(area.label, 12, true);
    write(area.summary, 10, false, muted);
    if (shown.length === 0) {
      write("No control in this area applied to the company profile.", 10, false, muted);
      gap(4);
      continue;
    }
    shown.forEach((item, index) => {
      const response = responses[item.id];
      const status = (response?.status ?? "unassessed") as GapAnswer;
      const finding = analysis?.findings.find((entry) => entry.id === item.id);
      gap(3);
      write(`${index + 1}. ${item.title}`, 11, true);
      write(`Answer: ${answerLabel(status)}`, 10, true);
      write(item.description, 10, false, muted);
      write(controlReference(item), 9, false, muted);
      write(`Remarks: ${response?.remarks?.trim() || "None recorded."}`, 10);
      write(`Evidence note: ${response?.evidence?.trim() || "None recorded."}`, 10);
      if (finding) {
        write(`Gap: ${finding.explanation}`, 10);
        write(`Recommended action: ${finding.action}`, 10);
        write(`Evidence to keep: ${finding.evidence}`, 10, false, muted);
      }
    });
    gap(8);
  }

  write("Regulatory deadlines", 14, true);
  for (const item of analysis?.regulatory ?? []) {
    write(`${item.title} (${item.state === "in_force" ? "in force" : "upcoming"})`, 11, true);
    write(item.detail, 10, false, muted);
    gap(3);
  }
  if (document.cmp) {
    gap(4);
    write("Workspace context", 12, true);
    write(`Consent records: ${document.cmp.consentRecords}. Published policy versions: ${document.cmp.publishedPolicies}. Configured purposes: ${document.cmp.purposes}. These counts are context for review. They are not a pass mark.`, 10, false, muted);
  }

  const pages = doc.getPages();
  pages.forEach((item, index) => {
    item.drawText(`Consent Guru  ·  DPDP gap assessment  ·  ${index + 1} of ${pages.length}`, {
      x: 48,
      y: 28,
      size: 9,
      font,
      color: muted,
    });
  });
  return doc.save();
}
