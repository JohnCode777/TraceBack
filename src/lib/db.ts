import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { databasePath } from "../../prisma/database-url";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const adapter = new PrismaLibSQL({ url: `file:${databasePath()}` });
export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
