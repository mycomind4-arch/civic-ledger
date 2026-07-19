import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import type { Pool } from "pg";
import { createDatabasePool } from "./pool.js";

export type MigrationDirection = "up" | "down";

const VERSION = "001_initial";

function migrationUrl(direction: MigrationDirection): URL {
  const filename = direction === "up" ? "001_initial.sql" : "001_initial.down.sql";
  return new URL(`../../../infra/migrations/${filename}`, import.meta.url);
}

export async function migrate(
  direction: MigrationDirection,
  suppliedPool?: Pool
): Promise<void> {
  const pool = suppliedPool ?? createDatabasePool();
  const ownsPool = suppliedPool === undefined;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(`
      CREATE TABLE IF NOT EXISTS civic_ledger_schema_migrations (
        version text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const applied = await client.query<{ version: string }>(
      "SELECT version FROM civic_ledger_schema_migrations WHERE version = $1",
      [VERSION]
    );

    if (direction === "up" && applied.rowCount === 0) {
      await client.query(await readFile(migrationUrl("up"), "utf8"));
      await client.query(
        "INSERT INTO civic_ledger_schema_migrations(version) VALUES ($1)",
        [VERSION]
      );
    }

    if (direction === "down" && applied.rowCount === 1) {
      await client.query(await readFile(migrationUrl("down"), "utf8"));
      await client.query(
        "DELETE FROM civic_ledger_schema_migrations WHERE version = $1",
        [VERSION]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    if (ownsPool) {
      await pool.end();
    }
  }
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(entry).href) {
  const direction = process.argv[2];
  if (direction !== "up" && direction !== "down") {
    throw new Error("Migration direction must be up or down");
  }

  await migrate(direction);
}
