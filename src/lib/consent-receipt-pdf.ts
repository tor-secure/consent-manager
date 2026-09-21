import "server-only";

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import type { ConsentReceipt } from "@/lib/consent-receipt";

const NAVY = rgb(0.043, 0.173, 0.29);
const TEAL = rgb(0, 0.769, 0.655);
const SLATE = rgb(0.29, 0.333, 0.408);
const RULE = rgb(0.86, 0.89, 0.94);

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const raw = String(text || "").trim() || "—";
  if (font.widthOfTextAtSize(raw, size) <= maxWidth) return [raw];
  const words = raw.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  const pushWord = (word: string) => {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      line = next;
      return;
    }
    if (line) lines.push(line);
    if (font.widthOfTextAtSize(word, size) <= maxWidth) {
      line = word;
      return;
    }
    let chunk = "";
    for (const ch of word) {
      const trial = chunk + ch;
      if (font.widthOfTextAtSize(trial, size) <= maxWidth) chunk = trial;
      else {
        if (chunk) lines.push(chunk);
        chunk = ch;
      }
    }
    line = chunk;
  };
  for (const word of words) pushWord(word);
  if (line) lines.push(line);
  return lines.length ? lines : [raw];
}

function drawKv(
  page: PDFPage,
  font: PDFFont,
  bold: PDFFont,
  y: number,
  label: string,
  value: string,
  left: number,
  width: number,
): number {
  const size = 10;
  const labelW = 118;
  page.drawText(label, { x: left, y, size, font: bold, color: NAVY });
  const lines = wrap(value, font, size, width - labelW);
  lines.forEach((line, i) => {
    page.drawText(line, { x: left + labelW, y: y - i * 13, size, font, color: SLATE });
  });
  return y - Math.max(1, lines.length) * 13 - 4;
}

export async function buildConsentReceiptPdf(receipt: ConsentReceipt): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const left = 48;
  const width = 516;
  let y = 742;

  page.drawRectangle({ x: 0, y: 752, width: 612, height: 40, color: NAVY });
  page.drawText(receipt.brand.name.toUpperCase(), {
    x: left,
    y: 766,
    size: 13,
    font: bold,
    color: rgb(1, 1, 1),
  });
  page.drawText(`${receipt.brand.tagline}  ·  ${receipt.brand.url}`, {
    x: left + 210,
    y: 767,
    size: 9,
    font,
    color: TEAL,
  });

  y = 720;
  page.drawText("Consent Receipt", { x: left, y, size: 22, font: bold, color: NAVY });
  y -= 18;
  page.drawText("Digital Personal Data Protection Act, 2023  —  Section 6", {
    x: left,
    y,
    size: 10,
    font,
    color: SLATE,
  });
  y -= 16;
  page.drawRectangle({ x: left, y, width, height: 2, color: TEAL });
  y -= 22;

  const rows: Array<[string, string]> = [
    ["Consent Key", receipt.consentId],
    ["Property", receipt.property],
    ["Domain", receipt.domain],
    ["Date", receipt.date || "N/A"],
    ["Expires", receipt.expires || "N/A"],
    ["Status", receipt.status],
    ["Method", receipt.method],
    ["Language", receipt.language],
  ];
  for (const [label, value] of rows) {
    y = drawKv(page, font, bold, y, label, value, left, width);
  }

  y -= 8;
  page.drawText("Purpose Preferences", { x: left, y, size: 12, font: bold, color: NAVY });
  y -= 8;
  page.drawRectangle({ x: left, y, width, height: 1, color: RULE });
  y -= 16;

  if (!receipt.purposes.length) {
    page.drawText("No purpose decisions recorded.", { x: left, y, size: 10, font, color: SLATE });
    y -= 16;
  } else {
    for (const purpose of receipt.purposes) {
      page.drawText(purpose.name, { x: left, y, size: 10, font, color: SLATE });
      const mark = purpose.status;
      const markW = bold.widthOfTextAtSize(mark, 10);
      page.drawText(mark, {
        x: left + width - markW,
        y,
        size: 10,
        font: bold,
        color: purpose.granted ? rgb(0.09, 0.45, 0.32) : rgb(0.72, 0.11, 0.11),
      });
      y -= 16;
      if (y < 170) break;
    }
  }

  y -= 6;
  page.drawText("Your Rights under DPDP Act, 2023", { x: left, y, size: 12, font: bold, color: NAVY });
  y -= 16;
  const rights = [
    "Section 6(4): You have the right to withdraw your consent at any time.",
    "Section 12: You have the right to access your personal data.",
    "Section 13: You have the right to correction and erasure of your data.",
    "Section 14: You have the right to nominate a representative.",
    "Section 8(8): You have the right to access a grievance redressal mechanism.",
  ];
  for (const right of rights) {
    const lines = wrap(`•  ${right}`, font, 9.5, width);
    for (const line of lines) {
      page.drawText(line, { x: left, y, size: 9.5, font, color: SLATE });
      y -= 13;
    }
  }

  y -= 8;
  page.drawText("Revocation & Grievance Redressal", { x: left, y, size: 12, font: bold, color: NAVY });
  y -= 16;
  const revokeLines = wrap(
    "To revoke your consent, visit the website and use the Cookie Preferences widget, or contact our Data Protection Officer:",
    font,
    9.5,
    width,
  );
  for (const line of revokeLines) {
    page.drawText(line, { x: left, y, size: 9.5, font, color: SLATE });
    y -= 13;
  }
  const dpoEmail = receipt.dpoEmail || receipt.grievanceOfficerEmail;
  const dpoName = receipt.dpoName || receipt.grievanceOfficerName;
  const dpoLine = dpoEmail
    ? `Data Protection Officer${dpoName ? ` (${dpoName})` : ""}: ${dpoEmail}`
    : `Data Protection Officer not configured for ${receipt.property}. Contact ${receipt.property} directly for DPDP Act grievances.`;
  for (const line of wrap(dpoLine, font, 9.5, width)) {
    page.drawText(line, { x: left, y, size: 9.5, font, color: SLATE });
    y -= 13;
  }

  page.drawRectangle({ x: 0, y: 0, width: 612, height: 42, color: NAVY });
  page.drawText(`Generated on ${receipt.generatedAt}`, {
    x: left,
    y: 18,
    size: 9,
    font,
    color: rgb(1, 1, 1),
  });
  page.drawText(`Powered by ${receipt.brand.name}`, {
    x: 360,
    y: 18,
    size: 9,
    font: bold,
    color: TEAL,
  });

  return doc.save();
}
