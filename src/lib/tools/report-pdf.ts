import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import type { AssessmentResult } from "./types";

function wrap(text: string, width: number): string[] {
  const clean = text.replace(/[^\S\n]+/g, " ").replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "").trim();
  if (!clean) return [];
  const words = clean.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
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

export async function assessmentPdf(input: {
  organisationName: string;
  toolName: string;
  result: AssessmentResult;
  completedAt: Date;
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const navy = rgb(0.04, 0.17, 0.29);
  const muted = rgb(0.29, 0.35, 0.39);
  let page = doc.addPage([595, 842]);
  let y = 800;

  function nextPage() {
    page = doc.addPage([595, 842]);
    y = 800;
  }

  function write(text: string, size: number, useBold = false, color = navy) {
    for (const line of wrap(text, size > 14 ? 42 : 90)) {
      if (y < 56) nextPage();
      page.drawText(line, { x: 48, y, size, font: useBold ? bold : font, color });
      y -= size + 4;
    }
  }

  write("ConsentGuru", 11, true, muted);
  write(input.toolName, 18, true);
  write(`Organisation: ${input.organisationName}`, 11, false, muted);
  write(`Assessment date: ${input.completedAt.toISOString().slice(0, 10)}`, 11, false, muted);
  write(`Methodology: ${input.result.methodologyVersion}`, 11, false, muted);
  y -= 6;
  write(input.result.label, 14, true);
  write(input.result.summary, 11, false, muted);
  if (input.result.score !== null) {
    write(`Score indicator: ${input.result.score}`, 12, true);
  }
  y -= 8;
  if (input.result.pillars.length > 0) {
    write("Pillars", 13, true);
    for (const pillar of input.result.pillars) write(`${pillar.label}: ${pillar.score}`, 11);
    y -= 6;
  }
  if (input.result.indicators.length > 0) {
    write("Indicators for review", 13, true);
    for (const indicator of input.result.indicators) {
      write(indicator.title, 11, true);
      write(indicator.why, 10, false, muted);
    }
    y -= 6;
  }
  if (input.result.phases.length > 0) {
    write("Roadmap", 13, true);
    for (const phase of input.result.phases) {
      write(phase.title, 12, true);
      for (const task of phase.tasks) {
        write(`${task.timeframe} · ${task.priority} · ${task.owner}: ${task.title}`, 10, false, muted);
      }
    }
    y -= 6;
  }
  if (input.result.findings.length > 0) {
    write("Findings", 13, true);
    for (const finding of input.result.findings.slice(0, 40)) {
      write(`${finding.severity.toUpperCase()} · ${finding.category}: ${finding.finding}`, 11, true);
      write(finding.recommendation, 10, false, muted);
    }
  }
  y -= 10;
  write(input.result.disclaimer, 9, false, muted);
  return doc.save();
}
