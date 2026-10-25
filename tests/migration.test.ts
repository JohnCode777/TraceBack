import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const migration = readFileSync(
  "prisma/migrations/20261025120000_init/migration.sql",
  "utf8",
);
let database: DatabaseSync;

beforeEach(() => {
  database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  database.exec(migration);
  database.exec(`
    INSERT INTO "User" (id, name, email, passwordHash) VALUES ('u1', 'Fake User', 'fake@example.test', 'fake-hash');
    INSERT INTO "Project" (id, name, key) VALUES ('p1', 'One', 'ONE'), ('p2', 'Two', 'TWO');
    INSERT INTO "Bug" (id, projectId, number, title, reporterId, updatedAt)
      VALUES ('b1', 'p1', 1, 'Fake report', 'u1', CURRENT_TIMESTAMP);
    INSERT INTO "StatusChange" (id, bugId, fromStatus, toStatus, actorId)
      VALUES ('s1', 'b1', 'Submitted', 'Investigating', 'u1');
  `);
});

afterEach(() => database.close());

describe("initial migration", () => {
  it("requires project keys to be two to five letters", () => {
    expect(() =>
      database.exec(
        `INSERT INTO "Project" (id, name, key) VALUES ('p3', 'Bad', 'A1')`,
      ),
    ).toThrow();
    expect(() =>
      database.exec(
        `INSERT INTO "Project" (id, name, key) VALUES ('p4', 'Bad', 'TOOLONG')`,
      ),
    ).toThrow();
  });

  it("keeps bug numbers unique within each project", () => {
    expect(() =>
      database.exec(`INSERT INTO "Bug" (id, projectId, number, title, reporterId, updatedAt)
        VALUES ('b2', 'p1', 1, 'Duplicate number', 'u1', CURRENT_TIMESTAMP)`),
    ).toThrow();
    expect(() =>
      database.exec(`INSERT INTO "Bug" (id, projectId, number, title, reporterId, updatedAt)
        VALUES ('b3', 'p2', 1, 'Same number in another project', 'u1', CURRENT_TIMESTAMP)`),
    ).not.toThrow();
  });

  it("enforces immutable status history", () => {
    expect(() =>
      database.exec(
        `UPDATE "StatusChange" SET comment = 'changed' WHERE id = 's1'`,
      ),
    ).toThrow(/StatusChange is immutable/);
    expect(() =>
      database.exec(`DELETE FROM "StatusChange" WHERE id = 's1'`),
    ).toThrow(/StatusChange is immutable/);
  });
});
