import { setServers } from "node:dns";
import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

type LearningDb = ReturnType<typeof drizzle>;

let cached: LearningDb | null = null;

function connect(): LearningDb {
  if (cached) return cached;
  const url = process.env.LEARNING_DATABASE_URL?.trim();
  if (!url) {
    throw new Error("LEARNING_DATABASE_URL is required for e-learning.");
  }
  if (!isServerless && process.env.DATABASE_USE_SYSTEM_DNS !== "1" && url.includes("neon.tech")) {
    setServers(["8.8.8.8", "1.1.1.1"]);
  }
  const client = postgres(url, {
    max: isServerless ? 1 : 10,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });
  cached = drizzle(client);
  return cached;
}

export const learningDb = new Proxy({} as LearningDb, {
  get(_target, prop, receiver) {
    const db = connect();
    const value = Reflect.get(db, prop, receiver);
    return typeof value === "function" ? value.bind(db) : value;
  },
});
