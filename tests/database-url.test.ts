import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { databasePath, databaseUrl } from "../prisma/database-url";

describe("SQLite database URL", () => {
  it("resolves relative paths against the project root", () => {
    expect(databasePath("file:./dev.db")).toBe(resolve("dev.db"));
    expect(databaseUrl("file:./dev.db")).toBe(
      `file:${resolve("dev.db").replaceAll("\\", "/")}`,
    );
  });

  it("keeps absolute paths and encodes spaces for SQLite URLs", () => {
    const path = resolve("test database.db");
    expect(databasePath(`file:${path}`)).toBe(path);
    expect(databaseUrl(`file:${path}`)).toContain("test%20database.db");
  });

  it("rejects non-file URLs and empty paths", () => {
    expect(() => databasePath("postgresql://localhost/test")).toThrow(
      "DATABASE_URL must be a SQLite file: URL",
    );
    expect(() => databasePath("file:")).toThrow(
      "DATABASE_URL must include a file path",
    );
  });
});
