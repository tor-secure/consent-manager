import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/learning/schema.ts",
  out: "./drizzle/learning",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.LEARNING_DATABASE_URL!,
  },
});
