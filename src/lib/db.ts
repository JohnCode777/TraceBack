import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { databasePath } from "../../prisma/database-url";

const globalDb = globalThis as unknown as { tracebackDb?: PrismaClient };
// A build does not need a database connection; use the documented local path
// when no runtime environment has been configured yet.
const path = process.env.DATABASE_URL || existsSync(".env")
  ? databasePath()
  : resolve(process.cwd(), "prisma", "dev.db");
export const db =
  globalDb.tracebackDb ??
  new PrismaClient({ adapter: new PrismaLibSQL({ url: `file:${path}` }) });
if (process.env.NODE_ENV !== "production") globalDb.tracebackDb = db;
