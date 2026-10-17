/** YouTube lesson videos for the 30 DPDP modules (from consent_guru_modules.json). */
const MODULE_YOUTUBE_IDS: Record<number, string> = {
  1: "OA6100k37YI",
  2: "qEuqBeYZInA",
  3: "uIECzYJ2T-k",
  4: "oZZRoGWxO5c",
  5: "xN88qhHe-n4",
  6: "G04S6gk0M_U",
  7: "AWndcYGHrqw",
  8: "NT6bAK8P_DA",
  9: "-eibVd2_BUk",
  10: "oX--5-ElmHg",
  11: "qhCW3NXH4yI",
  12: "S7BXJStwIZ8",
  13: "Dhf00Oo0qSU",
  14: "7Ar4i0m6xhY",
  15: "A18LSMX6glo",
  16: "D5IdKAJmou0",
  17: "mDP0T56mwYc",
  18: "3reHK3mo2tY",
  19: "AKbC27c7lac",
  20: "DTrGnVzYXrE",
  21: "qF53_WVJCB0",
  22: "NAQpvCMsBMY",
  23: "eIherQvwSbY",
  24: "0bq46RJUIy4",
  25: "cy4Re__rW-g",
  26: "l65HxNhI4d8",
  27: "90iQS5E4lBA",
  28: "0R8v-DqmVVo",
  29: "b1_tkBTL8DA",
  30: "LLP3trVzj1c",
};

/** Legacy Drive file ids (kept for the optional /api/learning/video stream). */
const MODULE_DRIVE_FILE_IDS: Record<number, string> = {
  1: "1X-XF5rq9Mds_VaHA4J3EhRID9OpTKlIq",
  2: "1uS2CUk9ZpGTMoedZqWO-SS2k3ZLhHOmO",
  3: "1iPEfHjgP2Ox3NgW_08X2bmftYAFGBYyF",
  4: "1qRHpkecWRcAtkdXhLdKthxTmX97HmUE9",
  5: "1lchaj-g15xpos6scvlvDYrzYhil-xUdV",
  6: "1SDaPen-6bT9HbKjMgUh1uWkty-IHjWdn",
  7: "1IYWHis8SGxXdFSq27dYikF-3-HBK3_JH",
  8: "1lytpqjq7pKt1LBK0l-nADitwPR5g3Bjx",
  9: "1HnIxl1Zqj-AX5QkMokLZPeIeBWDsD9Q6",
  10: "1gbdGoL9NuvHeoyD7U0-D2HYA8fYsdbim",
  11: "1u6RYzLpkfuKgrDzmJK4xyYndr6xSQ9Cq",
  12: "1cqLGtWUj4HrDmIHckubliPSrMwobaHDO",
  13: "14BnvV1O7OOQD6SD8wve-NadgOyQuyOUA",
  14: "1n2w7JzjpDgCiUNOucZy2KLcmqLzLURHX",
  15: "10JeOHmQHfQtRGsAkS09tMxc8TFNIpCFE",
  16: "1jCmASsNMpC3PBRlSGhanoDre8tZRxysC",
  17: "1I24VZzTNYOHn0IHVrTT7XKSlgULoGpy0",
  18: "1ma7zMRCHdlJakHFkbTs8bxxnj-7K-L1L",
  19: "11J1GHHaVdgRqx1Mr6wo-19OWSCKdm6CV",
  20: "1rQswTV9hC9n-MEcPl6MRTHlVb5oxR1Y7",
  21: "1yWP5uH67MDLGbFSTu_eSWjz59VSpd3UE",
  22: "1CPqhXtRJifi7Dlmg9ThN_IOdIYzN4Hd8",
  23: "1LcJuhDnGxy76A-XIVV0RrFYe3qlmc_CH",
  24: "1hdbsry-oYcaZ5RNBO_wH6zRJNMOHfuE9",
  25: "1dpOZdjq4j3Z4rj4yBOLkpSWtb2y1Cisn",
  26: "1_Bg0SqLORVpC3Ok3AKW0wklQOq7awdPj",
  27: "1cP1XPcei-N_CgOz_UXL9woJjeMWHrDq1",
  28: "13J3yL67eprt1nyxLsGdNMnICcMsivWZC",
  29: "1yjGBEAJCXJJC3PyXxx0NzirxQUtJ3Oyy",
  30: "1jYwMLfHG7G8zTFqyB-favS--oU1-RTvk",
};

export function moduleYoutubeId(moduleNumber: number): string | null {
  return MODULE_YOUTUBE_IDS[moduleNumber] ?? null;
}

/** Privacy-enhanced embed URL for the lesson iframe. */
export function moduleYoutubeEmbedUrl(moduleNumber: number): string | null {
  const id = moduleYoutubeId(moduleNumber);
  if (!id) return null;
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`;
}

export type YoutubeThumbQuality = "maxres" | "sd" | "hq";

export function youtubeThumbnailUrl(
  youtubeId: string,
  quality: YoutubeThumbQuality = "maxres",
): string {
  const file = quality === "maxres" ? "maxresdefault.jpg" : quality === "sd" ? "sddefault.jpg" : "hqdefault.jpg";
  return `https://i.ytimg.com/vi/${youtubeId}/${file}`;
}

/** Prefer true 16:9 poster; callers should fall back if maxres is missing. */
export function moduleYoutubeThumbnailUrl(
  moduleNumber: number,
  quality: YoutubeThumbQuality = "maxres",
): string | null {
  const id = moduleYoutubeId(moduleNumber);
  if (!id) return null;
  return youtubeThumbnailUrl(id, quality);
}

/** Local module card / poster art in /public (PNG for all modules). */
export function moduleCardImageUrl(moduleNumber: number, slug: string): string {
  return `/module-${String(moduleNumber).padStart(2, "0")}-${slug}.png`;
}

/** Extract a YouTube video id from watch / embed / short URLs. */
export function youtubeIdFromUrl(url: string | null): string | null {
  if (!url) return null;
  const match =
    url.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|shorts\/|watch\?v=|live\/))([A-Za-z0-9_-]{6,})/) ??
    null;
  return match?.[1] ?? null;
}

export function moduleDriveFileId(moduleNumber: number): string | null {
  return MODULE_DRIVE_FILE_IDS[moduleNumber] ?? null;
}

export function moduleDrivePreviewUrl(moduleNumber: number): string | null {
  const fileId = moduleDriveFileId(moduleNumber);
  if (!fileId) return null;
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

/** Direct file URL. Browsers cannot play this cross-origin, so the lesson route streams it. */
export function moduleDriveMediaUrl(fileId: string): string {
  return `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;
}

function driveFileId(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/drive\.google\.com\/file\/d\/([^/?]+)/);
  return match?.[1] ?? null;
}

/**
 * Prefer an operator-saved URL when present. Otherwise use the catalog YouTube
 * id, then the legacy Drive stream proxy.
 */
export function lessonVideo(
  moduleNumber: number,
  storedProvider: string,
  storedUrl: string | null,
): { provider: string; url: string | null } {
  const storedYoutubeId = youtubeIdFromUrl(storedUrl);
  if (storedYoutubeId) {
    return {
      provider: "youtube",
      url: `https://www.youtube-nocookie.com/embed/${storedYoutubeId}?rel=0&modestbranding=1`,
    };
  }

  const storedIsCustom = Boolean(
    storedUrl && storedProvider !== "placeholder" && !storedUrl.includes("drive.google.com"),
  );
  if (storedIsCustom) return { provider: storedProvider, url: storedUrl };

  const youtubeId = moduleYoutubeId(moduleNumber);
  if (youtubeId) {
    return {
      provider: "youtube",
      url: `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&modestbranding=1`,
    };
  }

  const fileId = driveFileId(storedUrl) ?? moduleDriveFileId(moduleNumber);
  if (fileId && moduleDriveFileId(moduleNumber) === fileId) {
    return { provider: "mp4", url: `/api/learning/video/${moduleNumber}` };
  }
  return { provider: storedProvider, url: storedUrl };
}
