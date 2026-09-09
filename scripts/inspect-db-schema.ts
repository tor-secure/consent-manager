import "dotenv/config";
import postgres from "postgres";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });

  const tables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `;
  console.log("TABLES:\n" + tables.map((row) => row.table_name).join("\n"));

  for (const name of [
    "consent_events",
    "consent_records",
    "consent_evidence_snapshots",
    "retention_policies",
    "legal_holds",
    "trackers",
    "portable_consent_exchanges",
  ]) {
    const cols = await sql`
      SELECT column_name, is_nullable, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${name}
      ORDER BY ordinal_position
    `;
    console.log(`\n${name}:`);
    if (cols.length === 0) {
      console.log("  (missing)");
      continue;
    }
    for (const col of cols) {
      console.log(`  ${col.column_name} ${col.data_type} nullable=${col.is_nullable}`);
    }
  }

  const fks = await sql`
    SELECT
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table,
      rc.delete_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
    JOIN information_schema.referential_constraints rc
      ON rc.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name IN (
        'consent_events',
        'consent_evidence_snapshots',
        'portable_consent_exchanges',
        'retention_policies',
        'legal_holds'
      )
    ORDER BY tc.table_name, kcu.column_name
  `;
  console.log("\nFOREIGN KEYS:");
  for (const fk of fks) {
    console.log(`  ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table} ON DELETE ${fk.delete_rule}`);
  }

  await sql.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
