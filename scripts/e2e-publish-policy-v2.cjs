require("dotenv").config();
const postgres = require("postgres");
const { createHash } = require("crypto");

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
}
function hashForPublishedVersion(version) {
  return createHash("sha256")
    .update(
      stableStringify({
        versionId: version.id,
        configuration: version.configuration,
        processingSnapshot: version.processingSnapshot ?? {},
      }),
    )
    .digest("hex");
}

(async () => {
  const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
  const policyId = "6ea94963-0615-4f4e-b263-1b7bd1f50d28";

  const [draft] = await sql`
    SELECT id, version, configuration, processing_snapshot, is_published, status
    FROM consent_policy_versions
    WHERE policy_id = ${policyId} AND version = 2
    LIMIT 1
  `;
  if (!draft) throw new Error("V2 missing");

  // Ensure draft config differs from V1 for hash/content verification.
  const configuration = {
    ...(draft.configuration && typeof draft.configuration === "object" ? draft.configuration : {}),
    __e2ePolicyBump: "v2-published",
  };

  const configHash = hashForPublishedVersion({
    id: draft.id,
    configuration,
    processingSnapshot: draft.processing_snapshot || {},
  });

  await sql.begin(async (tx) => {
    await tx`
      UPDATE consent_policy_versions
      SET is_published = false, status = 'archived', unpublished_at = NOW(), updated_at = NOW()
      WHERE policy_id = ${policyId} AND is_published = true AND id <> ${draft.id}
    `;
    await tx`
      UPDATE consent_policy_versions
      SET is_published = true,
          status = 'published',
          published_at = NOW(),
          effective_from = NOW(),
          scheduled_publish_at = NULL,
          unpublished_at = NULL,
          configuration = ${tx.json(configuration)},
          config_hash = ${configHash},
          updated_at = NOW()
      WHERE id = ${draft.id}
    `;
    await tx`
      UPDATE consent_policies
      SET status = 'active', live_version_id = ${draft.id}, updated_at = NOW()
      WHERE id = ${policyId}
    `;
  });

  const rows = await sql`
    SELECT id, version, status, is_published, LEFT(config_hash, 16) AS hash, config_hash
    FROM consent_policy_versions WHERE policy_id = ${policyId} ORDER BY version
  `;
  console.log(JSON.stringify({ rows, publishedHash: configHash }, null, 2));
  await sql.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
