import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  // During code generation/compilation, DATABASE_URL might be empty, so avoid throwing here.
  console.warn("DATABASE_URL is not set in environment variables");
}

export default defineConfig({
  out: "./src/db/migrations",
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
});
