import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { backfillCompleteness } from "../scripts/backfill-completeness";

describe("Session 4 data backfill", () => {
  it("replaces stale scores on existing reports", () => {
    const database = new DatabaseSync(":memory:");
    try {
      database.exec(
        readFileSync(
          "prisma/migrations/20261025120000_init/migration.sql",
          "utf8",
        ),
      );
      database.exec(`
        INSERT INTO "User" (id, name, email, passwordHash) VALUES ('u', 'Tester', 't@example.test', 'fake');
        INSERT INTO "Project" (id, name, key) VALUES ('p', 'Project', 'DEM');
        INSERT INTO "Bug" (id, projectId, number, title, reporterId, updatedAt, completenessScore, completenessLevel)
          VALUES ('b', 'p', 1, 'bug', 'u', CURRENT_TIMESTAMP, 95, 'Strong');
        INSERT INTO "ReproStep" (id, bugId, position, instruction) VALUES ('s', 'b', 1, 'x');
      `);
      expect(backfillCompleteness(database)).toBe(1);
      const row = database
        .prepare(
          'SELECT completenessScore, completenessLevel FROM "Bug" WHERE id = ?',
        )
        .get("b") as { completenessScore: number; completenessLevel: string };
      expect(row).toEqual({
        completenessScore: 0,
        completenessLevel: "Incomplete",
      });
    } finally {
      database.close();
    }
  });
});
