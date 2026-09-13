import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

const client = postgres(process.env.DATABASE_URL!, {
  max: isServerless ? 1 : 10,
  idle_timeout: 20,
  connect_timeout: 10,
  // Transaction-mode poolers (Neon/Supabase on Vercel) reject prepared statements.
  prepare: false,
});

export const db = drizzle(client);