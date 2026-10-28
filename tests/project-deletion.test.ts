import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

let activeUser: string | null = "admin";
vi.mock("../src/auth", () => ({
  auth: async () => (activeUser ? { user: { id: activeUser } } : null),
}));

let directory: string;
let client: PrismaClient;
let projectId: string;
let bugId: string;
let areaId: string;
let route: typeof import("../src/app/api/projects/[projectId]/route");
let archiveProject: typeof import("../src/lib/projects").archiveProject;

function request(
  confirmationKey = "DEL",
  origin: string | null = "http://localhost",
) {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (origin) headers.set("Origin", origin);
  return new Request(`http://localhost/api/projects/${projectId}`, {
    method: "DELETE",
    headers,
    body: JSON.stringify({ confirmationKey }),
  });
}
const context = () => ({ params: Promise.resolve({ projectId }) });

beforeAll(async () => {
  directory = mkdtempSync(join(tmpdir(), "traceback-project-delete-"));
  const path = join(directory, "test.db");
  const sqlite = new DatabaseSync(path);
  sqlite.exec("PRAGMA foreign_keys = ON");
  sqlite.exec(
    readFileSync("prisma/migrations/20261025120000_init/migration.sql", "utf8"),
  );
  sqlite.exec(
    readFileSync(
      "prisma/migrations/20261028100000_project_deletion/migration.sql",
      "utf8",
    ),
  );
  sqlite.close();
  process.env.DATABASE_URL = `file:${path}`;
  client = (await import("../src/lib/db")).db;
  const projects = await import("../src/lib/projects");
  archiveProject = projects.archiveProject;
  route = await import("../src/app/api/projects/[projectId]/route");
  for (const id of ["admin", "developer", "tester", "outsider"])
    await client.user.create({
      data: { id, name: id, email: `${id}@example.test`, passwordHash: "fake" },
    });
  projectId = (
    await projects.createProject("admin", {
      name: "Delete demo",
      key: "DEL",
      description: "Fake test project",
    })
  ).id;
  await client.projectMember.createMany({
    data: [
      { projectId, userId: "developer", role: "Developer" },
      { projectId, userId: "tester", role: "Tester" },
    ],
  });
  areaId = (
    await client.area.findFirstOrThrow({
      where: { projectId, name: "General" },
    })
  ).id;
  bugId = (
    await client.bug.create({
      data: {
        projectId,
        number: 1,
        title: "Fake bug",
        reporterId: "tester",
        assigneeId: "developer",
        areaId,
        status: "Investigating",
        steps: { create: [{ position: 1, instruction: "Open the fake page" }] },
        notes: {
          create: [
            { authorId: "developer", type: "Observation", body: "Fake note" },
          ],
        },
        statusChanges: {
          create: [
            {
              fromStatus: "Submitted",
              toStatus: "Investigating",
              actorId: "developer",
            },
          ],
        },
      },
    })
  ).id;
});

afterAll(async () => {
  await client?.$disconnect();
  if (directory) rmSync(directory, { recursive: true, force: true });
  delete process.env.DATABASE_URL;
});

describe("archived project deletion route", () => {
  it("rejects an Admin deleting an active project", async () => {
    activeUser = "admin";
    expect((await route.DELETE(request(), context())).status).toBe(409);
    expect(
      await client.project.findUnique({ where: { id: projectId } }),
    ).not.toBeNull();
  });

  it("rejects Developers and Testers", async () => {
    for (const userId of ["developer", "tester"]) {
      activeUser = userId;
      expect((await route.DELETE(request(), context())).status).toBe(403);
    }
  });

  it("returns 404 to non-members", async () => {
    activeUser = "outsider";
    expect((await route.DELETE(request(), context())).status).toBe(404);
  });

  it("requires an exact confirmation key after archiving", async () => {
    activeUser = "admin";
    await archiveProject("admin", projectId);
    expect((await route.DELETE(request("WRONG"), context())).status).toBe(400);
    expect((await route.DELETE(request("del"), context())).status).toBe(400);
    expect(
      (await client.project.findUniqueOrThrow({ where: { id: projectId } }))
        .nextBugNumber,
    ).toBe(1);
  });

  it("still rejects Developers, Testers and non-members after archive", async () => {
    for (const userId of ["developer", "tester"]) {
      activeUser = userId;
      expect((await route.DELETE(request(), context())).status).toBe(403);
    }
    activeUser = "outsider";
    expect((await route.DELETE(request(), context())).status).toBe(404);
  });

  it("rejects a cross-origin or unmarked mutation", async () => {
    activeUser = "admin";
    expect(
      (
        await route.DELETE(
          request("DEL", "https://attacker.example"),
          context(),
        )
      ).status,
    ).toBe(403);
    expect((await route.DELETE(request("DEL", null), context())).status).toBe(
      403,
    );
    const crossSite = request();
    crossSite.headers.set("Sec-Fetch-Site", "cross-site");
    expect((await route.DELETE(crossSite, context())).status).toBe(403);
    expect(
      await client.project.findUnique({ where: { id: projectId } }),
    ).not.toBeNull();
  });

  it("deletes an archived project and all of its child records in one transaction", async () => {
    activeUser = "admin";
    const response = await route.DELETE(request(), context());
    expect(response.status).toBe(200);
    expect(
      await client.project.findUnique({ where: { id: projectId } }),
    ).toBeNull();
    expect(await client.projectMember.count({ where: { projectId } })).toBe(0);
    expect(await client.area.count({ where: { projectId } })).toBe(0);
    expect(await client.bug.count({ where: { projectId } })).toBe(0);
    expect(await client.reproStep.count({ where: { bugId } })).toBe(0);
    expect(await client.note.count({ where: { bugId } })).toBe(0);
    expect(await client.statusChange.count({ where: { bugId } })).toBe(0);
    expect(await client.user.count()).toBe(4);
  });
});
