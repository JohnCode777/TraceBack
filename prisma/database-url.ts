import { existsSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

export function databasePath(): string {
  if (!process.env.DATABASE_URL && existsSync(".env"))
    process.loadEnvFile(".env");
  const url = process.env.DATABASE_URL;
  if (!url?.startsWith("file:"))
    throw new Error("DATABASE_URL must be a SQLite file: URL");
  const path = url.slice(5);
  if (!path) throw new Error("DATABASE_URL must include a file path");
  return isAbsolute(path) ? path : resolve(process.cwd(), "prisma", path);
}
