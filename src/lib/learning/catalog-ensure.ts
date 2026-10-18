/**
 * Rules for ensuring the course row exists without clobbering operator settings.
 * Defaults apply only on initial insert (see service loadOrSeedCatalog).
 */

export type CourseSettingsFields = {
  difficulty: string;
  passPercent: number;
  examPassPercent: number;
  examQuestionCount: number;
};

/** Sync only non-scoring catalog metadata; never reset pass marks or exam size. */
export function courseEnsureMetadataPatch(
  existing: CourseSettingsFields,
  defaults: Pick<CourseSettingsFields, "difficulty">,
): Partial<Pick<CourseSettingsFields, "difficulty">> | null {
  if (existing.difficulty === defaults.difficulty) return null;
  return { difficulty: defaults.difficulty };
}

/** Content refresh must not rewrite operator-tuned scoring settings. */
export function courseRefreshSettingsPatch(
  _existing: CourseSettingsFields,
  catalog: CourseSettingsFields,
): Omit<CourseSettingsFields, "passPercent" | "examPassPercent" | "examQuestionCount"> & {
  difficulty: string;
} {
  void _existing;
  return { difficulty: catalog.difficulty };
}
