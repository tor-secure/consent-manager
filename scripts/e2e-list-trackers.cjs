require("dotenv").config();
const postgres = require("postgres");

(async () => {
  const sql = postgres(process.env.DATABASE_URL, { prepare: false });
  const websiteId = "f666c342-75fa-4419-ad23-06c2bd5f597d";
  const trackers = await sql`
    select id, name, type, domain, identifier, purpose_id, vendor_id, is_essential, status
    from trackers
    where website_id = ${websiteId}
    limit 30
  `;
  const purposes = await sql`
    select id, key, name, is_required
    from purposes
    where organization_id = (select organization_id from websites where id = ${websiteId})
    limit 20
  `;
  console.log(JSON.stringify({ trackers, purposes }, null, 2));
  await sql.end();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
