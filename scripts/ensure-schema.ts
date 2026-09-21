import "dotenv/config";
import { setServers } from "node:dns";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";

import { hashForPublishedVersion } from "../src/lib/policy/lifecycle-core";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  if (
    process.env.DATABASE_USE_SYSTEM_DNS !== "1" &&
    process.env.DATABASE_URL.includes("neon.tech")
  ) {
    setServers(["8.8.8.8", "1.1.1.1"]);
  }

  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  const file = path.resolve("scripts/neon-ensure-schema.sql");
  const source = readFileSync(file, "utf8");
  await sql.unsafe(source);

  const websiteCols = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'websites'
      AND column_name IN ('consent_integrations', 'default_regulation_key')
    ORDER BY column_name
  `;
  const pending = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'consent_evidence_snapshots',
        'retention_policies',
        'legal_holds',
        'portable_consent_exchanges',
        'iab_gvl_cache',
        'intelligence_runs',
        'digital_twin_snapshots',
        'autopilot_plans',
        'roi_configurations',
        'negotiation_configurations',
        'negotiation_outcomes',
        'rights_request_verifications',
        'rights_request_exports'
      )
    ORDER BY table_name
  `;
  console.log(
    "websites extra columns:",
    websiteCols.map((row) => row.column_name).join(",") || "(none)",
  );
  console.log(
    "phase5 tables:",
    pending.map((row) => row.table_name).join(",") || "(none)",
  );

  const policyVersionCols = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'consent_policy_versions'
      AND column_name IN (
        'version',
        'status',
        'is_published',
        'configuration',
        'processing_snapshot',
        'config_hash',
        'scheduled_publish_at',
        'unpublished_at',
        'effective_from',
        'published_at',
        'created_at',
        'updated_at'
      )
    ORDER BY column_name
  `;
  console.log(
    "consent_policy_versions lifecycle columns:",
    policyVersionCols.map((row) => row.column_name).join(",") || "(none)",
  );

  const missingHash = await sql`
    SELECT id, configuration, processing_snapshot
    FROM consent_policy_versions
    WHERE config_hash IS NULL
  `;
  let hashed = 0;
  for (const row of missingHash) {
    const configHash = hashForPublishedVersion({
      id: String(row.id),
      configuration: row.configuration,
      processingSnapshot: row.processing_snapshot,
    });
    await sql`
      UPDATE consent_policy_versions
      SET config_hash = ${configHash}
      WHERE id = ${row.id} AND config_hash IS NULL
    `;
    hashed += 1;
  }
  console.log(`config_hash backfilled: ${hashed}`);

  const journal = JSON.parse(
    readFileSync(path.resolve("drizzle/meta/_journal.json"), "utf8"),
  ) as { entries: Array<{ tag: string; when: number }> };
  const applied = await sql`
    SELECT created_at FROM drizzle.__drizzle_migrations
  `;
  const appliedWhen = new Set(applied.map((row) => String(row.created_at)));
  let stamped = 0;
  for (const entry of journal.entries) {
    if (appliedWhen.has(String(entry.when))) continue;
    const contents = readFileSync(
      path.resolve("drizzle", `${entry.tag}.sql`),
      "utf8",
    );
    const hash = createHash("sha256").update(contents).digest("hex");
    await sql`
      INSERT INTO drizzle.__drizzle_migrations ("hash", "created_at")
      VALUES (${hash}, ${entry.when})
    `;
    stamped += 1;
    console.log("stamped", entry.tag);
  }
  console.log(`drizzle journal stamped: ${stamped} new, ${applied.length + stamped} total`);

  await sql.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
