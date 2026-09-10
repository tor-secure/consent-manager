require("dotenv").config();
const postgres = require("postgres");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL missing");
  process.exit(2);
}

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

async function main() {
  const cols = await sql`
    select table_name, column_name
    from information_schema.columns
    where table_schema = 'public'
      and (
        column_name in (
          'role','ccpa_sale','ccpa_share','ccpa_sensitive_pi','processing_snapshot','site_key'
        )
        or table_name in (
          'california_opt_out_states','processing_activities','cross_border_transfers','vendor_relationships'
        )
      )
    order by table_name, column_name
  `;
  console.log("---columns---");
  console.log(JSON.stringify(cols, null, 2));

  let migrations;
  try {
    migrations = await sql`select id, hash, created_at from drizzle.__drizzle_migrations order by created_at`;
  } catch (error) {
    migrations = { error: String(error) };
  }
  console.log("---migrations---");
  console.log(JSON.stringify(migrations, null, 2));

  const websites = await sql`
    select id, name, domain, site_key, status, default_regulation_key, default_region
    from websites
    order by created_at desc
    limit 20
  `;
  console.log("---websites---");
  console.log(JSON.stringify(websites, null, 2));

  let vendors;
  try {
    vendors = await sql`
      select id, name, role, status, country, dpa_status, ccpa_sale, ccpa_share, ccpa_sensitive_pi,
             (deleted_at is not null) as deleted
      from vendors
      order by created_at desc
      limit 50
    `;
  } catch (error) {
    vendors = { error: String(error) };
  }
  console.log("---vendors---");
  console.log(JSON.stringify(vendors, null, 2));

  try {
    const roleCounts = await sql`
      select role, status, count(*)::int as n
      from vendors
      group by role, status
      order by n desc
    `;
    console.log("---vendor_role_counts---");
    console.log(JSON.stringify(roleCounts, null, 2));
  } catch (error) {
    console.log("---vendor_role_counts---", String(error));
  }

  const policies = await sql`
    select p.id, p.name, p.status, p.website_id, w.name as website, w.site_key,
           w.default_regulation_key, w.default_region, w.status as website_status
    from consent_policies p
    join websites w on w.id = p.website_id
    order by p.created_at desc
    limit 20
  `;
  console.log("---policies---");
  console.log(JSON.stringify(policies, null, 2));

  const versions = await sql`
    select v.id, v.policy_id, v.version, v.is_published, v.status, v.published_at
    from consent_policy_versions v
    order by v.created_at desc
    limit 40
  `;
  console.log("---versions---");
  console.log(JSON.stringify(versions, null, 2));

  try {
    const trackers = await sql`
      select id, name, website_id, status, is_essential,
             (purpose_id is not null) as has_purpose,
             (vendor_id is not null) as has_vendor,
             ccpa_sale, ccpa_share, scanner_classification
      from trackers
      order by created_at desc
      limit 40
    `;
    console.log("---trackers---");
    console.log(JSON.stringify(trackers, null, 2));
  } catch (error) {
    console.log("---trackers---", String(error));
  }

  try {
    const acts = await sql`select count(*)::int as n from processing_activities`;
    const xfers = await sql`select count(*)::int as n from cross_border_transfers`;
    const rels = await sql`select count(*)::int as n from vendor_relationships`;
    console.log("---inventory_counts---", { activities: acts[0], transfers: xfers[0], relationships: rels[0] });
  } catch (error) {
    console.log("---inventory_counts---", String(error));
  }

  await sql.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
