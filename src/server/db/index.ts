import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getServerEnv } from "@/config/env";
import * as schema from "./schema";

const globalDatabase = globalThis as unknown as { prizmPool?: Pool };

export function getDatabase() {
  const env = getServerEnv();
  const pool = globalDatabase.prizmPool ?? new Pool({ connectionString: env.DATABASE_URL, max: 10 });
  if (env.NODE_ENV !== "production") globalDatabase.prizmPool = pool;
  return drizzle(pool, { schema });
}

export type Database = ReturnType<typeof getDatabase>;
