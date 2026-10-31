/**
 * One-shot: after switching Clerk Development → Production, remount the
 * local organization that still holds websites onto the new production
 * Clerk organization id.
 *
 * Usage:
 *   npx tsx scripts/remap-clerk-org-after-production.ts --email=you@example.com
 *   npx tsx scripts/remap-clerk-org-after-production.ts --email=you@example.com --apply
 *
 * Without --apply it only prints what it would do.
 */
import "dotenv/config";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(connectionString, { max: 1 });

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  if (hit) return hit.slice(prefix.length);
  const idx = process.argv.indexOf(`--${name}`);
  if (idx >= 0) return process.argv[idx + 1];
  return undefined;
}

async function main() {
  const email = arg("email")?.trim().toLowerCase();
  const apply = process.argv.includes("--apply");
  if (!email) {
    console.error("Pass --email=you@example.com");
    process.exit(1);
  }

  const [user] = await sql`
    select id, email, clerk_user_id, name
    from users
    where lower(email) = ${email}
    limit 1
  `;
  if (!user) {
    console.error("No local user for", email);
    process.exit(1);
  }

  console.log("User:", user.id, user.email, "clerk:", user.clerk_user_id);

  const orgs = await sql`
    select
      o.id,
      o.name,
      o.slug,
      o.clerk_organization_id,
      o.created_at,
      m.status as membership_status,
      (
        select count(*)::int from websites w
        where w.organization_id = o.id and w.deleted_at is null
      ) as website_count
    from memberships m
    join organizations o on o.id = m.organization_id
    where m.user_id = ${user.id}
    order by website_count desc, o.created_at desc
  `;

  if (orgs.length === 0) {
    console.error("User has no organization memberships.");
    process.exit(1);
  }

  console.log("\nOrganizations:");
  for (const o of orgs) {
    console.log(
      `  ${o.id}  websites=${o.website_count}  clerk=${o.clerk_organization_id}  name=${o.name}`,
    );
  }

  const withSites = orgs.find((o) => Number(o.website_count) > 0);
  const emptyShell = orgs.find((o) => Number(o.website_count) === 0);
  const forcedClerkOrgId = arg("clerk-org-id")?.trim();

  if (!withSites) {
    console.error("\nNo organization with websites found for this user. Nothing to remount.");
    process.exit(1);
  }

  const productionClerkOrgId =
    forcedClerkOrgId ||
    emptyShell?.clerk_organization_id ||
    null;

  if (!productionClerkOrgId) {
    console.log(
      "\nFound org with websites, but no empty production shell org and no --clerk-org-id.",
    );
    console.log("Current clerk id on data org:", withSites.clerk_organization_id);
    console.log(
      "Pass your Production Clerk organization id:\n  --clerk-org-id=org_xxxxx --apply",
    );
    process.exit(1);
  }

  if (withSites.clerk_organization_id === productionClerkOrgId) {
    console.log("\nAlready linked to", productionClerkOrgId);
    process.exit(0);
  }

  console.log("\nPlan:");
  if (emptyShell && emptyShell.id !== withSites.id) {
    console.log(`  1) Vacate empty org ${emptyShell.id} clerk id → retired-${emptyShell.id}`);
  }
  console.log(
    `  2) Point org ${withSites.id} (websites=${withSites.website_count}) at production clerk id ${productionClerkOrgId}`,
  );

  if (!apply) {
    console.log("\nDry run only. Re-run with --apply to execute.");
    process.exit(0);
  }

  await sql.begin(async (tx) => {
    if (emptyShell && emptyShell.id !== withSites.id) {
      await tx`
        update organizations
        set clerk_organization_id = ${`retired-${emptyShell.id}`},
            updated_at = now()
        where id = ${emptyShell.id}
      `;
    }
    await tx`
      update organizations
      set clerk_organization_id = ${productionClerkOrgId},
          updated_at = now()
      where id = ${withSites.id}
    `;
  });

  console.log("\nDone. Sign out, sign back in, and open /dashboard.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await sql.end({ timeout: 5 });
  });
