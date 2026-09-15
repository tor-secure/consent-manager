require("dotenv").config();
const postgres = require("postgres");

(async () => {
  const sql = postgres(process.env.DATABASE_URL, { prepare: false });
  const rows = await sql`
    select
      w.id,
      w.name,
      w.domain,
      w.site_key,
      p.id as policy_id,
      v.version,
      v.is_published
    from websites w
    left join consent_policies p on p.website_id = w.id
    left join consent_policy_versions v on v.policy_id = p.id and v.is_published = true
    order by w.created_at desc
    limit 20
  `;
  console.log(JSON.stringify(rows, null, 2));
  await sql.end();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
