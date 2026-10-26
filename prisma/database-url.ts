import { existsSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

const projectRoot = process.cwd();

function configuredUrl(): string {
  const envFile = resolve(projectRoot, ".env");
  if (!process.env.DATABASE_URL && existsSync(envFile))
    process.loadEnvFile(envFile);
  return process.env.DATABASE_URL ?? "file:./dev.db";
}

export function databasePath(url = configuredUrl()): string {
  if (!url.startsWith("file:"))
    throw new Error("DATABASE_URL must be a SQLite file: URL");
  const path = url.slice(5);
  if (!path) throw new Error("DATABASE_URL must include a file path");
  return isAbsolute(path) ? path : resolve(projectRoot, path);
}

export function databaseUrl(url = configuredUrl()): string {
  const path = databasePath(url).replaceAll("\\", "/");
  return `file:${path
    .split("/")
    .map((part) => (/^[A-Za-z]:$/.test(part) ? part : encodeURIComponent(part)))
    .join("/")}`;
}
