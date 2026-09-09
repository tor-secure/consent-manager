import "dotenv/config";
import postgres from "postgres";

const expectedTables = [
  "consent_evidence_snapshots",
  "portable_consent_exchanges",
  "retention_policies",
  "legal_holds",
  "iab_gvl_cache",
  "intelligence_runs",
  "digital_twin_snapshots",
  "autopilot_plans",
  "roi_configurations",
  "negotiation_configurations",
  "negotiation_outcomes",
];

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });

  const tables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `;
  const have = new Set(tables.map((row) => row.table_name));
  console.log("MISSING TABLES:");
  for (const name of expectedTables) {
    if (!have.has(name)) console.log("  " + name);
  }

  for (const [table, columns] of [
    ["consent_records", ["state_version"]],
    ["trackers", [
      "category", "cookie_names", "storage_types", "local_storage_keys",
      "session_storage_keys", "indexed_db_names", "script_url_patterns",
      "iframe_url_patterns", "pixel_url_patterns", "scanner_classification",
      "party", "duration", "deletion_behavior",
    ]],
    ["websites", ["default_regulation_key", "consent_integrations", "iab_registration", "iab_mapping"]],
    ["api_keys", ["scopes"]],
    ["purposes", ["iab_tcf_purpose_id", "iab_gpp_purpose_id"]],
    ["vendors", ["iab_vendor_id"]],
    ["consent_events", ["organization_id", "website_id", "consent_id"]],
  ] as Array<[string, string[]]>) {
    const cols = await sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${table}
    `;
    const present = new Set(cols.map((row) => row.column_name));
    const missing = columns.filter((col) => !present.has(col));
    console.log(`\n${table} missing: ${missing.join(", ") || "(none)"}`);
  }

  const websiteDupes = await sql`
    SELECT organization_id, domain, count(*)::int AS n
    FROM websites
    GROUP BY organization_id, domain
    HAVING count(*) > 1
  `;
  console.log("\nwebsite org+domain dupes:", websiteDupes.length);

  const trigger = await sql`
    SELECT tgname
    FROM pg_trigger
    WHERE tgname = 'consent_evidence_snapshots_immutable'
  `;
  console.log("evidence trigger:", trigger[0]?.tgname || "(missing)");

  const websiteUnique = await sql`
    SELECT conname
    FROM pg_constraint
    WHERE conname = 'websites_organization_domain_unique'
  `;
  console.log("websites unique:", websiteUnique[0]?.conname || "(missing)");

  const eventNulls = await sql`
    SELECT count(*)::int AS n
    FROM consent_events
    WHERE organization_id IS NULL OR website_id IS NULL OR consent_id IS NULL
  `;
  console.log("consent_events missing org/site/consent_id:", eventNulls[0]?.n ?? 0);

  const migrationTables = await sql`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_name IN ('__drizzle_migrations', 'drizzle_migrations')
  `;
  console.log(
    "drizzle migrations table:",
    migrationTables.map((row) => `${row.table_schema}.${row.table_name}`).join(",") || "(none)",
  );

  await sql.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
