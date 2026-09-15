require("dotenv").config();
const postgres = require("postgres");

const WEBSITE_ID = "f666c342-75fa-4419-ad23-06c2bd5f597d";

(async () => {
  const sql = postgres(process.env.DATABASE_URL, { prepare: false });
  const purposes = await sql`
    select p.id, p.key, p.name, p.is_required
    from purposes p
    join websites w on w.organization_id = p.organization_id
    where w.id = ${WEBSITE_ID}
    order by p.key
  `;
  const byKey = Object.fromEntries(purposes.map((row) => [row.key, row]));
  const specs = [
    { name: "E2E Analytics", domain: "cmp-e2e-analytics.test", purposeKey: "analytics", category: "analytics", identifier: "e2e:analytics" },
    { name: "E2E Advertising", domain: "cmp-e2e-ads.test", purposeKey: "advertising", category: "advertising", identifier: "e2e:advertising" },
    { name: "E2E Marketing", domain: "cmp-e2e-marketing.test", purposeKey: "marketing", category: "marketing", identifier: "e2e:marketing" },
  ];
  for (const spec of specs) {
    const purpose = byKey[spec.purposeKey];
    if (!purpose) throw new Error("Missing purpose " + spec.purposeKey + " keys=" + Object.keys(byKey));
    const existing = await sql`
      select id from trackers
      where website_id = ${WEBSITE_ID} and identifier = ${spec.identifier}
      limit 1
    `;
    if (existing[0]) {
      await sql`
        update trackers
        set name = ${spec.name},
            domain = ${spec.domain},
            purpose_id = ${purpose.id},
            category = ${spec.category},
            type = 'pixel',
            status = 'active',
            is_essential = false,
            party = 'third-party',
            updated_at = now()
        where id = ${existing[0].id}
      `;
    } else {
      await sql`
        insert into trackers (
          website_id, name, type, domain, identifier, purpose_id, category,
          status, is_essential, party, cookie_names
        ) values (
          ${WEBSITE_ID}, ${spec.name}, 'pixel', ${spec.domain}, ${spec.identifier},
          ${purpose.id}, ${spec.category}, 'active', false, 'third-party', '[]'::jsonb
        )
      `;
    }
  }
  console.log(JSON.stringify({ purposes: purposes.map((p) => ({ key: p.key, required: p.is_required })), seeded: specs.map((s) => s.identifier) }, null, 2));
  await sql.end();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
