import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { databaseUrl } from "../../prisma/database-url";

const globalDb = globalThis as unknown as { tracebackDb?: PrismaClient };
export const db =
  globalDb.tracebackDb ??
  new PrismaClient({ adapter: new PrismaLibSql({ url: databaseUrl() }) });
if (process.env.NODE_ENV !== "production") globalDb.tracebackDb = db;
