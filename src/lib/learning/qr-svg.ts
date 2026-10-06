import QRCode from "qrcode";

export async function certificateQrSvg(url: string): Promise<string> {
  const svg = await QRCode.toString(url, {
    type: "svg",
    margin: 1,
    width: 168,
    errorCorrectionLevel: "M",
    color: { dark: "#0B2C4A", light: "#FFFFFF" },
  });
  return svg.replace(/<\?xml[^>]*>/, "").trim();
}
