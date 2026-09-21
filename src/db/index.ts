import { setServers } from "node:dns";
import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

// Some ISP resolvers (including Jio) fail Neon hostnames with ENOTFOUND.
// Public DNS still resolves them. Skip this on Vercel and when opted out.
if (
  !isServerless &&
  process.env.DATABASE_USE_SYSTEM_DNS !== "1" &&
  process.env.DATABASE_URL?.includes("neon.tech")
) {
  setServers(["8.8.8.8", "1.1.1.1"]);
}

const client = postgres(process.env.DATABASE_URL!, {
  max: isServerless ? 1 : 10,
  idle_timeout: 20,
  connect_timeout: 10,
  // Transaction-mode poolers (Neon/Supabase on Vercel) reject prepared statements.
  prepare: false,
});

export const db = drizzle(client);
