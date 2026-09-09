import "dotenv/config";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
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
