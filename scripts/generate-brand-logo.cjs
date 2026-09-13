const fs = require("fs");
const path = require("path");
const opentype = require("opentype.js");

const file = fs.readFileSync(path.resolve(".tmp/fonts/Nunito-variable.ttf"));
const font = opentype.parse(
  file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength),
);
font.variation.set({ wght: 800 });

const FONT_SIZE = 78;
const TRACKING_EM = -0.05;
const LINE_GAP = FONT_SIZE * 0.6;
const TEXT_X = 104;
const CONSENT_BASELINE = 54;
const GURU_BASELINE = CONSENT_BASELINE + LINE_GAP;

function wordPath(text, x, y) {
  const combined = new opentype.Path();
  const scale = FONT_SIZE / font.unitsPerEm;
  const trackingPx = TRACKING_EM * FONT_SIZE;
  let cursor = x;

  for (let i = 0; i < text.length; i += 1) {
    const glyph = font.charToGlyph(text[i]);
    const varied = font.variation.process.getTransform(glyph);
    combined.extend(varied.getPath(cursor, y, FONT_SIZE));

    let advance = (varied.advanceWidth ?? glyph.advanceWidth) * scale;
    if (i < text.length - 1) {
      const next = font.charToGlyph(text[i + 1]);
      advance += font.getKerningValue(glyph, next) * scale;
    }
    cursor += advance + trackingPx;
  }

  return combined;
}

const consent = wordPath("consent", TEXT_X, CONSENT_BASELINE);
const guru = wordPath("guru", TEXT_X, GURU_BASELINE);
const consentBox = consent.getBoundingBox();
const guruBox = guru.getBoundingBox();

const pad = 8;
const minX = Math.min(6, consentBox.x1, guruBox.x1) - pad;
const minY = Math.min(2, consentBox.y1, guruBox.y1) - pad;
const maxX = Math.max(94, consentBox.x2, guruBox.x2) + pad;
const maxY = Math.max(114, consentBox.y2, guruBox.y2) + pad;
const width = maxX - minX;
const height = maxY - minY;

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX.toFixed(1)} ${minY.toFixed(1)} ${width.toFixed(1)} ${height.toFixed(1)}" fill="none" role="img" aria-labelledby="cgTitle">
  <title id="cgTitle">Consent Guru</title>
  <path class="cg-shield" d="M50 8.2L88.4 24.2v35.4c0 21.6-14.6 37.4-38.4 45.8C26.2 97 11.6 81.2 11.6 59.6V24.2L50 8.2z" stroke="#0B2C4A" stroke-width="11" stroke-linejoin="miter" stroke-miterlimit="3"/>
  <path class="cg-check" d="M34.2 57.2l13.4 13.6 24.8-26.4" stroke="#00C4A7" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
  <path class="cg-consent" d="${consent.toPathData(2)}" fill="#0B2C4A"/>
  <path class="cg-guru" d="${guru.toPathData(2)}" fill="#00C4A7"/>
</svg>
`;

const mark = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 118" fill="none" role="img" aria-labelledby="cgMarkTitle">
  <title id="cgMarkTitle">Consent Guru</title>
  <path class="cg-shield" d="M50 8.2L88.4 24.2v35.4c0 21.6-14.6 37.4-38.4 45.8C26.2 97 11.6 81.2 11.6 59.6V24.2L50 8.2z" stroke="#0B2C4A" stroke-width="11" stroke-linejoin="miter" stroke-miterlimit="3"/>
  <path class="cg-check" d="M34.2 57.2l13.4 13.6 24.8-26.4" stroke="#00C4A7" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;

fs.mkdirSync("public/brand", { recursive: true });
fs.writeFileSync("public/brand/consent-guru-logo.svg", svg);
fs.writeFileSync("public/brand/consent-guru-mark.svg", mark);
console.log({ minX, minY, width, height, consentBox, guruBox });
