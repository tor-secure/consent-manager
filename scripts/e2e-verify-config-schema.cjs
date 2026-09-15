require("dotenv").config();
const postgres = require("postgres");

(async () => {
  const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });

  const cols = await sql`
    SELECT table_name, column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('consent_policy_versions', 'consent_policies')
      AND column_name IN (
        'config_hash', 'scheduled_publish_at', 'unpublished_at', 'processing_snapshot',
        'version', 'status', 'is_published', 'configuration', 'effective_from',
        'published_at', 'created_at', 'updated_at', 'live_version_id'
      )
    ORDER BY table_name, column_name
  `;
  console.log("lifecycle columns:\n" + cols.map((c) => `${c.table_name}.${c.column_name} (${c.data_type}, null=${c.is_nullable})`).join("\n"));

  const nullHashes = await sql`
    SELECT COUNT(*)::int AS n FROM consent_policy_versions WHERE config_hash IS NULL
  `;
  const published = await sql`
    SELECT id, policy_id, version, is_published, status,
           LEFT(COALESCE(config_hash, ''), 16) AS hash_prefix,
           config_hash IS NULL AS hash_null
    FROM consent_policy_versions
    WHERE is_published = true
    ORDER BY published_at DESC NULLS LAST
    LIMIT 15
  `;
  console.log("null config_hash count:", nullHashes[0].n);
  console.log("published versions:", JSON.stringify(published, null, 2));

  const idx = await sql`
    SELECT indexname, indexdef FROM pg_indexes
    WHERE tablename = 'consent_policy_versions'
      AND indexname LIKE '%published%'
  `;
  console.log("published indexes:", JSON.stringify(idx, null, 2));

  await sql.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
