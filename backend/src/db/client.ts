import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const dbUrl = process.env.DATABASE_URL || "";
const isValid = dbUrl.startsWith("postgres") && !dbUrl.includes("[neon-host]") && !dbUrl.includes("[user]");

const sql = neon(isValid ? dbUrl : "postgresql://placeholder:placeholder@localhost/placeholder");
export const db = drizzle({ client: sql, schema });
