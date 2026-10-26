import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { listBugs } from "../src/lib/bugs";
import { calculateStats } from "../src/lib/stats";
import { listSchema } from "../src/lib/validation";

// A disposable, repeatable load check. It never touches the developer's DB.
const directory = mkdtempSync(join(tmpdir(), "traceback-perf-"));
const path = join(directory, "perf.db");
const count = 1_200;
let queryCount = 0;
const client = new PrismaClient({
  adapter: new PrismaLibSql({ url: `file:${path}` }),
  log: [{ emit: "event", level: "query" }],
});
client.$on("query", () => queryCount++);
const actor = { id: "perf-user", role: "Tester" as const };
const elapsed = async <T>(work: () => Promise<T>) => {
  const start = process.hrtime.bigint();
  const queriesBefore = queryCount;
  const value = await work();
  return {
    value,
    ms: Number(process.hrtime.bigint() - start) / 1e6,
    queries: queryCount - queriesBefore,
  };
};
const median = (values: number[]) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

async function main() {
  const migrated = spawnSync(
    process.execPath,
    ["--import", "tsx", "scripts/migrate.ts"],
    {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: `file:${path}` },
      encoding: "utf8",
    },
  );
  if (migrated.status !== 0)
    throw new Error(`Migration failed: ${migrated.stderr || migrated.stdout}`);
  await client.user.create({
    data: {
      id: actor.id,
      name: "Synthetic Tester",
      email: "perf@example.test",
      passwordHash: "synthetic-no-login",
    },
  });
  await client.project.create({
    data: {
      id: "perf-project",
      key: "PERF",
      name: "Synthetic load",
      nextBugNumber: count + 1,
      members: { create: { userId: actor.id, role: actor.role } },
      areas: { create: { id: "perf-area", name: "Interface" } },
    },
  });
  const now = Date.now();
  for (let start = 1; start <= count; start += 100) {
    await client.bug.createMany({
      data: Array.from({ length: Math.min(100, count - start + 1) }, (_, i) => {
        const number = start + i;
        const createdAt = new Date(now - number * 3_600_000);
        const status = ["Submitted", "Investigating", "Fixed", "Verified"][
          number % 4
        ];
        return {
          id: `perf-bug-${number}`,
          projectId: "perf-project",
          number,
          title: `Synthetic report number ${number}`,
          reporterId: actor.id,
          areaId: "perf-area",
          status,
          severity: ["Critical", "High", "Medium", "Low"][number % 4],
          createdAt,
          fixedAt:
            status === "Fixed" || status === "Verified"
              ? new Date(createdAt.getTime() + 3_600_000)
              : null,
          verifiedAt:
            status === "Verified"
              ? new Date(createdAt.getTime() + 7_200_000)
              : null,
        };
      }),
    });
  }
  await client.reproStep.createMany({
    data: Array.from({ length: count }, (_, i) => ({
      bugId: `perf-bug-${i + 1}`,
      position: 1,
      instruction: "Open the synthetic report",
    })),
  });
  const listTimes: number[] = [];
  const deepPageTimes: number[] = [];
  const statsTimes: number[] = [];
  const listQueries: number[] = [];
  const statsQueries: number[] = [];
  for (let i = 0; i < 5; i++) {
    const first = await elapsed(() =>
      listBugs("perf-project", actor, listSchema.parse({}), client),
    );
    if (first.value.total !== count || first.value.items.length !== 20)
      throw new Error("First list page returned incorrect pagination");
    listTimes.push(first.ms);
    listQueries.push(first.queries);
    const deep = await elapsed(() =>
      listBugs("perf-project", actor, listSchema.parse({ page: 50 }), client),
    );
    if (deep.value.total !== count || deep.value.items.length !== 20)
      throw new Error("Deep list page returned incorrect pagination");
    deepPageTimes.push(deep.ms);
    listQueries.push(deep.queries);
    const dashboard = await elapsed(async () => {
      const rows = await client.bug.findMany({
        where: { projectId: "perf-project" },
        select: {
          id: true,
          projectId: true,
          status: true,
          severity: true,
          areaId: true,
          area: { select: { name: true } },
          reopenCount: true,
          createdAt: true,
          fixedAt: true,
          verifiedAt: true,
        },
      });
      return calculateStats(
        rows.map((row) => ({
          ...row,
          areaName: row.area?.name ?? null,
        })),
      );
    });
    if (
      dashboard.value.total !== count ||
      dashboard.value.byStatus.reduce((sum, row) => sum + row.count, 0) !==
        count
    )
      throw new Error("Dashboard counts do not match seeded rows");
    statsTimes.push(dashboard.ms);
    statsQueries.push(dashboard.queries);
  }
  if (
    !queryCount ||
    Math.max(...listQueries) > 7 ||
    Math.max(...statsQueries) > 5
  )
    throw new Error(
      `Unexpected query counts: list ${listQueries}, stats ${statsQueries}`,
    );
  const sqlite = new DatabaseSync(path);
  const plan = sqlite
    .prepare(
      "EXPLAIN QUERY PLAN SELECT id FROM Bug WHERE projectId = ? ORDER BY createdAt DESC LIMIT 20 OFFSET 980",
    )
    .all("perf-project") as { detail: string }[];
  sqlite.close();
  console.log(
    JSON.stringify(
      {
        bugs: count,
        listFirstPageMedianMs: median(listTimes),
        listPage50MedianMs: median(deepPageTimes),
        statsMedianMs: median(statsTimes),
        listQueries,
        statsQueries,
        listPlan: plan.map((row) => row.detail),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.$disconnect();
    rmSync(directory, { recursive: true, force: true });
  });
