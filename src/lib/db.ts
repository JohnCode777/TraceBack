import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { databasePath } from "../../prisma/database-url";

const globalDb = globalThis as unknown as { tracebackDb?: PrismaClient };
export const db =
  globalDb.tracebackDb ??
  new PrismaClient({ adapter: new PrismaLibSQL({ url: `file:${databasePath()}` }) });
if (process.env.NODE_ENV !== "production") globalDb.tracebackDb = db;
