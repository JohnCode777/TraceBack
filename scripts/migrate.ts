import { createHash, randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { databasePath } from "../prisma/database-url";

const database = new DatabaseSync(databasePath());
database.exec("PRAGMA foreign_keys = ON");
database.exec(`CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "checksum" TEXT NOT NULL,
  "finished_at" DATETIME,
  "migration_name" TEXT NOT NULL,
  "logs" TEXT,
  "rolled_back_at" DATETIME,
  "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "applied_steps_count" INTEGER NOT NULL DEFAULT 0
)`);

try {
  const root = join(process.cwd(), "prisma", "migrations");
  for (const name of readdirSync(root).sort()) {
    if (name === "migration_lock.toml") continue;
    const sql = readFileSync(join(root, name, "migration.sql"), "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");
    const existing = database
      .prepare(
        'SELECT checksum FROM "_prisma_migrations" WHERE migration_name = ? AND finished_at IS NOT NULL',
      )
      .get(name) as { checksum: string } | undefined;
    if (existing) {
      if (existing.checksum !== checksum)
        throw new Error(`Applied migration ${name} has changed`);
      continue;
    }
    database.exec("BEGIN IMMEDIATE");
    try {
      database.exec(sql);
      database
        .prepare(
          'INSERT INTO "_prisma_migrations" (id, checksum, migration_name, finished_at, applied_steps_count) VALUES (?, ?, ?, CURRENT_TIMESTAMP, 1)',
        )
        .run(randomUUID(), checksum, name);
      database.exec("COMMIT");
      console.log(`Applied ${name}`);
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  }
} finally {
  database.close();
}
