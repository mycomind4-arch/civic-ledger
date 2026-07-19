import { Pool } from "pg";

export type DatabasePool = Pool;

export function createDatabasePool(
  connectionString = process.env.DATABASE_URL
): DatabasePool {
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  return new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000
  });
}
