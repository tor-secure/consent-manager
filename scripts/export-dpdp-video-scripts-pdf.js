"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const pdf_lib_1 = require("pdf-lib");
const catalog_1 = require("../src/lib/learning/catalog");
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 54;
const MARGIN_TOP = 64;
const MARGIN_BOTTOM = 52;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;
const navy = (0, pdf_lib_1.rgb)(11 / 255, 44 / 255, 74 / 255);
const teal = (0, pdf_lib_1.rgb)(0, 196 / 255, 167 / 255);
const ink = (0, pdf_lib_1.rgb)(0.12, 0.16, 0.2);
const muted = (0, pdf_lib_1.rgb)(0.33, 0.39, 0.45);
function toWinAnsi(text) {
    return text
        .replace(/\u2018|\u2019|\u2032/g, "'")
        .replace(/\u201C|\u201D/g, '"')
        .replace(/\u2013|\u2014/g, "-")
        .replace(/\u2026/g, "...")
        .replace(/\u00A0/g, " ")
        .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, "");
}
function wrap(text, font, size, width) {
    const clean = toWinAnsi(text).replace(/\s+/g, " ").trim();
    if (!clean)
        return [];
    const words = clean.split(" ");
    const lines = [];
    let line = "";
    for (const word of words) {
        const next = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(next, size) <= width) {
            line = next;
            continue;
        }
        if (line)
            lines.push(line);
        if (font.widthOfTextAtSize(word, size) <= width) {
            line = word;
            continue;
        }
        let chunk = "";
        for (const char of word) {
            const trial = chunk + char;
            if (font.widthOfTextAtSize(trial, size) > width && chunk) {
                lines.push(chunk);
                chunk = char;
            }
            else {
                chunk = trial;
            }
        }
        line = chunk;
    }
    if (line)
        lines.push(line);
    return lines;
}
async function main() {
    const doc = await pdf_lib_1.PDFDocument.create();
    doc.setTitle("30 Days DPDP Act - Video scripts");
    doc.setAuthor("Consent Guru");
    doc.setSubject("Narration scripts for the 30 DPDP Act training videos");
    const font = await doc.embedFont(pdf_lib_1.StandardFonts.Helvetica);
    const bold = await doc.embedFont(pdf_lib_1.StandardFonts.HelveticaBold);
    let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN_TOP;
    let pageNumber = 1;
    function paintChrome() {
        page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 28, width: PAGE_WIDTH, height: 28, color: navy });
        page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 32, width: PAGE_WIDTH, height: 4, color: teal });
        page.drawText("Consent Guru", {
            x: MARGIN_X,
            y: PAGE_HEIGHT - 19,
            size: 9,
            font: bold,
            color: (0, pdf_lib_1.rgb)(1, 1, 1),
        });
        page.drawText("30 Days DPDP Act  |  Video scripts", {
            x: MARGIN_X + 88,
            y: PAGE_HEIGHT - 19,
            size: 9,
            font,
            color: (0, pdf_lib_1.rgb)(0.82, 0.9, 0.93),
        });
        const label = String(pageNumber);
        page.drawText(label, {
            x: PAGE_WIDTH - MARGIN_X - font.widthOfTextAtSize(label, 9),
            y: 28,
            size: 9,
            font,
            color: muted,
        });
    }
    function newPage() {
        page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        pageNumber += 1;
        y = PAGE_HEIGHT - MARGIN_TOP;
        paintChrome();
    }
    function ensure(height) {
        if (y - height < MARGIN_BOTTOM)
            newPage();
    }
    function drawLines(lines, size, useBold, color, gap = 3) {
        const face = useBold ? bold : font;
        for (const line of lines) {
            ensure(size + gap);
            page.drawText(line, { x: MARGIN_X, y, size, font: face, color });
            y -= size + gap;
        }
    }
    function paragraph(text, size, useBold = false, color = ink, gap = 3) {
        drawLines(wrap(text, useBold ? bold : font, size, CONTENT_WIDTH), size, useBold, color, gap);
    }
    paintChrome();
    y -= 28;
    paragraph("Video scripts", 26, true, navy, 6);
    paragraph("30 Days DPDP Act", 16, true, teal, 8);
    paragraph("Narration for all 30 training videos. Lessons, quizzes, and the final exam are not included.", 11, false, muted, 5);
    y -= 8;
    paragraph("Last reviewed: 2 October 2026", 11, false, ink, 6);
    paragraph(catalog_1.COURSE_DISCLAIMER, 10, false, muted, 4);
    y -= 16;
    paragraph("Contents", 14, true, navy, 8);
    for (const courseModule of catalog_1.COURSE_CATALOG) {
        const pad = String(courseModule.number).padStart(2, "0");
        paragraph(`${pad}   ${courseModule.title}`, 11, false, ink, 4);
    }
    for (const courseModule of catalog_1.COURSE_CATALOG) {
        newPage();
        const pad = String(courseModule.number).padStart(2, "0");
        paragraph(`Module ${pad}`, 11, true, teal, 4);
        paragraph(courseModule.title, 18, true, navy, 6);
        paragraph(`About ${courseModule.minutes} minutes`, 10, false, muted, 8);
        y -= 4;
        courseModule.scriptBeats.forEach((beat, index) => {
            paragraph(`${index + 1}`, 11, true, teal, 3);
            paragraph(beat, 11, false, ink, 4);
            y -= 8;
        });
    }
    const bytes = await doc.save();
    const out = "DPDP-Act-video-scripts.pdf";
    (0, node_fs_1.writeFileSync)(out, bytes);
    console.log(`${out} ${bytes.length} bytes, ${doc.getPageCount()} pages, ${catalog_1.COURSE_CATALOG.length} modules`);
}
main().catch((error) => {
    console.error(error);
    process.exit(1);
});
