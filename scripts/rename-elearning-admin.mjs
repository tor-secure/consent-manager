import "dotenv/config";
import postgres from "postgres";

async function main() {
  const url = process.env.LEARNING_DATABASE_URL?.trim();
  if (!url) throw new Error("LEARNING_DATABASE_URL is required.");

  const username = "admin@consentguru.com";
  const sql = postgres(url, { max: 1, prepare: false });
  try {
    const renamed = await sql`
      UPDATE learning_admins
      SET username = ${username}, updated_at = now()
      WHERE lower(username) = 'admin'
        AND NOT EXISTS (
          SELECT 1 FROM learning_admins a2 WHERE lower(a2.username) = ${username}
        )
      RETURNING id, username
    `;

    if (renamed.length === 0) {
      const existing = await sql`
        SELECT id, username FROM learning_admins WHERE lower(username) = ${username} LIMIT 1
      `;
      if (existing.length === 0) {
        throw new Error('No admin row found to rename. Run seed-elearning-admin.mjs first.');
      }
      await sql`
        UPDATE learning_admins
        SET active = true, updated_at = now()
        WHERE id = ${existing[0].id}
      `;
    }

    await sql`
      UPDATE learning_admins
      SET active = false, updated_at = now()
      WHERE lower(username) <> ${username}
    `;

    console.log(`username=${username}`);
    console.log("Password unchanged. Sign in with the existing password, or use Forgot password.");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
