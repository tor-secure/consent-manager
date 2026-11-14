import "dotenv/config";
import { randomBytes, scryptSync } from "node:crypto";
import postgres from "postgres";

function hashAdminPassword(password) {
  const N = 16384;
  const r = 8;
  const p = 1;
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64, { N, r, p });
  return `scrypt$${N}$${r}$${p}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

function generatePassword(bytes = 12) {
  return randomBytes(bytes).toString("base64url");
}

async function main() {
  const url = process.env.LEARNING_DATABASE_URL?.trim();
  if (!url) {
    throw new Error("LEARNING_DATABASE_URL is required.");
  }

  const username = (process.env.ELEARNING_ADMIN_USERNAME?.trim() || "admin@consentguru.com").toLowerCase();
  const password = process.env.ELEARNING_ADMIN_PASSWORD?.trim() || generatePassword(12);
  const passwordHash = hashAdminPassword(password);
  const keepPassword = process.env.ELEARNING_ADMIN_KEEP_PASSWORD === "1";

  const sql = postgres(url, { max: 1, prepare: false });
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS learning_admins (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        username varchar(80) NOT NULL,
        password_hash text NOT NULL,
        active boolean DEFAULT true NOT NULL,
        created_at timestamptz DEFAULT now() NOT NULL,
        updated_at timestamptz DEFAULT now() NOT NULL
      )
    `;
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS learning_admins_username_unique
      ON learning_admins (username)
    `;

    // Rename legacy "admin" account if present.
    await sql`
      UPDATE learning_admins
      SET username = ${username}, updated_at = now()
      WHERE lower(username) = 'admin'
        AND ${username} <> 'admin'
        AND NOT EXISTS (
          SELECT 1 FROM learning_admins a2 WHERE lower(a2.username) = ${username}
        )
    `;

    if (keepPassword) {
      await sql`
        INSERT INTO learning_admins (username, password_hash, active, updated_at)
        VALUES (${username}, ${passwordHash}, true, now())
        ON CONFLICT (username) DO UPDATE SET
          active = true,
          updated_at = now()
      `;
    } else {
      await sql`
        INSERT INTO learning_admins (username, password_hash, active, updated_at)
        VALUES (${username}, ${passwordHash}, true, now())
        ON CONFLICT (username) DO UPDATE SET
          password_hash = EXCLUDED.password_hash,
          active = true,
          updated_at = now()
      `;
    }

    await sql`
      UPDATE learning_admins
      SET active = false, updated_at = now()
      WHERE lower(username) <> ${username}
    `;
  } finally {
    await sql.end({ timeout: 5 });
  }

  // Print once so the operator can sign in. Do not commit this output.
  console.log("E-learning admin seeded.");
  console.log(`username=${username}`);
  console.log(`password=${password}`);
  console.log("Store this password securely; only the hash was saved in LEARNING_DATABASE_URL.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
