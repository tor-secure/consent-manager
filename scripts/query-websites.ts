import "dotenv/config";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL!;
const sql = postgres(connectionString, { max: 1 });

async function main() {
  const allWebsites = await sql`
    SELECT id, name, domain, site_key, status, created_at
    FROM websites
    ORDER BY created_at
  `;
  console.log("=== WEBSITES ===");
  for (const w of allWebsites) {
    console.log("ID:", w.id);
    console.log("  Name:", w.name);
    console.log("  Domain:", w.domain);
    console.log("  SiteKey:", w.site_key);
    console.log("  Status:", w.status);

    const policies = await sql`
      SELECT id, name, status, is_default
      FROM consent_policies
      WHERE website_id = ${w.id}
      ORDER BY is_default DESC
    `;
    console.log("  Policies (" + policies.length + "):");
    for (const p of policies) {
      console.log(
        "    - " + p.name + " [" + p.status + "] default=" + p.is_default + " id=" + p.id,
      );
      const versions = await sql`
        SELECT id, version, is_published, status
        FROM consent_policy_versions
        WHERE policy_id = ${p.id}
        ORDER BY version
      `;
      for (const v of versions) {
        const pps = await sql`
          SELECT COUNT(*)::int AS cnt
          FROM policy_purposes
          WHERE policy_version_id = ${v.id}
        `;
        const vendors = await sql`
          SELECT COUNT(DISTINCT vp.vendor_id)::int AS cnt
          FROM vendor_purposes vp
          INNER JOIN policy_purposes pp ON vp.purpose_id = pp.purpose_id
          WHERE pp.policy_version_id = ${v.id}
        `;
        console.log(
          "      v" + v.version + ": published=" + v.is_published +
          " status=" + v.status + " purposes=" + pps[0].cnt +
          " vendors=" + vendors[0].cnt + " id=" + v.id,
        );
      }
    }

    const trackers = await sql`
      SELECT COUNT(*)::int AS cnt
      FROM trackers
      WHERE website_id = ${w.id}
    `;
    console.log("  Trackers:", trackers[0].cnt);

    const records = await sql`
      SELECT COUNT(*)::int AS cnt,
             COUNT(*) FILTER (WHERE status = 'accepted')::int AS accepted,
             COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected,
             COUNT(*) FILTER (WHERE status = 'partial')::int AS partial,
             COUNT(*) FILTER (WHERE status = 'withdrawn')::int AS withdrawn
      FROM consent_records
      WHERE website_id = ${w.id}
    `;
    console.log(
      "  Consent records: total=" + records[0].cnt +
      " accepted=" + records[0].accepted +
      " rejected=" + records[0].rejected +
      " partial=" + records[0].partial +
      " withdrawn=" + records[0].withdrawn,
    );
    console.log("");
  }
}

main()
  .then(async () => {
    await sql.end();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    await sql.end();
    process.exit(1);
  });
