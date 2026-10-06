/** Public Drive previews for the 30 DPDP lesson videos (folder shared as viewer). */
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

export function moduleDrivePreviewUrl(moduleNumber: number): string | null {
  const fileId = MODULE_DRIVE_FILE_IDS[moduleNumber];
  if (!fileId) return null;
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

/** Use a saved https video when one exists. Otherwise play the published Drive lesson. */
export function lessonVideo(moduleNumber: number, storedProvider: string, storedUrl: string | null): { provider: string; url: string | null } {
  if (storedUrl && storedProvider !== "placeholder") {
    return { provider: storedProvider, url: storedUrl };
  }
  const driveUrl = moduleDrivePreviewUrl(moduleNumber);
  if (driveUrl) return { provider: "embed", url: driveUrl };
  return { provider: storedProvider, url: storedUrl };
}
