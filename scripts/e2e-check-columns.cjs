require("dotenv").config();
const postgres = require("postgres");
(async () => {
  const sql = postgres(process.env.DATABASE_URL, { prepare: false });
  const cols = await sql`
    select column_name
    from information_schema.columns
    where table_name = 'consent_policy_versions'
    order by ordinal_position
  `;
  console.log(cols.map((c) => c.column_name).join("\n"));
  await sql.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
