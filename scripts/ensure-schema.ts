import "dotenv/config";
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
  console.log(
    "websites extra columns:",
    websiteCols.map((row) => row.column_name).join(",") || "(none)",
  );
  await sql.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
