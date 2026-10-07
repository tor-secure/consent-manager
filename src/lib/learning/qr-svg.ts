import QRCode from "qrcode";

/** Shield mark from public/brand/consent-guru-mark.svg (viewBox 0 0 100 118). */
const MARK_WIDTH = 100;
const MARK_HEIGHT = 118;
const SHIELD =
  "M50 8.2L88.4 24.2v35.4c0 21.6-14.6 37.4-38.4 45.8C26.2 97 11.6 81.2 11.6 59.6V24.2L50 8.2z";
const CHECK = "M34.2 57.2l13.4 13.6 24.8-26.4";

/** Center plate is about 30% of the symbol. Level H recovers up to 30% of codewords. */
const PLATE_RATIO = 0.3;

function embedCenterMark(svg: string): string {
  const match = svg.match(/viewBox="0 0 ([0-9.]+) ([0-9.]+)"/);
  if (!match) return svg;

  const width = Number(match[1]);
  const height = Number(match[2]);
  const plate = Math.round(Math.min(width, height) * PLATE_RATIO);
  const plateX = (width - plate) / 2;
  const plateY = (height - plate) / 2;

  const inner = plate * 0.78;
  const scale = inner / MARK_HEIGHT;
  const markX = (width - MARK_WIDTH * scale) / 2;
  const markY = (height - MARK_HEIGHT * scale) / 2;

  const overlay = [
    `<g shape-rendering="geometricPrecision">`,
    `<rect x="${plateX}" y="${plateY}" width="${plate}" height="${plate}" rx="${plate * 0.18}" fill="#FFFFFF"/>`,
    `<g transform="translate(${markX} ${markY}) scale(${scale})" fill="none">`,
    `<path d="${SHIELD}" stroke="#0B2C4A" stroke-width="11" stroke-linejoin="miter" stroke-miterlimit="3"/>`,
    `<path d="${CHECK}" stroke="#00C4A7" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>`,
    `</g></g>`,
  ].join("");

  return svg.replace("</svg>", `${overlay}</svg>`);
}

export async function certificateQrSvg(url: string): Promise<string> {
  const svg = await QRCode.toString(url, {
    type: "svg",
    margin: 1,
    width: 168,
    errorCorrectionLevel: "H",
    color: { dark: "#0B2C4A", light: "#FFFFFF" },
  });
  return embedCenterMark(svg.replace(/<\?xml[^>]*>/, "").trim());
}
