import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

let activeUser: string | null = "tester";
vi.mock("../src/lib/auth", () => ({
  auth: async () => (activeUser ? { user: { id: activeUser } } : null),
}));

type Handler = (
  request: Request,
  context: {
    params: Promise<{ projectId: string; bugId: string; noteId: string }>;
  },
) => Promise<Response>;
let client: PrismaClient;
let directory: string;
let bugId: string;
let noteId: string;
let listGet: Handler,
  createPost: Handler,
  detailGet: Handler,
  detailPatch: Handler;
let assignPost: Handler,
  transitionPost: Handler,
  notePost: Handler,
  notePatch: Handler;
const body = {
  title: "The save button fails",
  steps: ["Open form", "Press save"],
  severity: "High",
};
const ctx = () => ({
  params: Promise.resolve({ projectId: "project", bugId, noteId }),
});
const request = (method: string, suffix = "", data?: unknown) =>
  new Request(`http://localhost/api/projects/project/bugs${suffix}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
  });

beforeAll(async () => {
  directory = mkdtempSync(join(tmpdir(), "traceback-routes-"));
  const path = join(directory, "test.db");
  const sqlite = new DatabaseSync(path);
  sqlite.exec("PRAGMA foreign_keys = ON");
  sqlite.exec(
    readFileSync("prisma/migrations/20261025120000_init/migration.sql", "utf8"),
  );
  sqlite.close();
  process.env.DATABASE_URL = `file:${path}`;
  client = (await import("../src/lib/db")).db;
  for (const id of ["tester", "other", "developer", "admin", "outsider"])
    await client.user.create({
      data: { id, name: id, email: `${id}@example.test`, passwordHash: "fake" },
    });
  await client.project.create({
    data: { id: "project", key: "DEM", name: "Demo", nextBugNumber: 2 },
  });
  for (const [id, role] of [
    ["tester", "Tester"],
    ["other", "Tester"],
    ["developer", "Developer"],
    ["admin", "Admin"],
  ])
    await client.projectMember.create({
      data: { projectId: "project", userId: id, role },
    });
  bugId = (
    await client.bug.create({
      data: {
        projectId: "project",
        number: 1,
        title: "Existing bug",
        reporterId: "tester",
      },
    })
  ).id;
  noteId = (
    await client.note.create({
      data: {
        bugId,
        authorId: "tester",
        type: "Observation",
        body: "Original",
      },
    })
  ).id;
  listGet = (await import("../src/app/api/projects/[projectId]/bugs/route"))
    .GET as Handler;
  createPost = (await import("../src/app/api/projects/[projectId]/bugs/route"))
    .POST as Handler;
  detailGet = (
    await import("../src/app/api/projects/[projectId]/bugs/[bugId]/route")
  ).GET as Handler;
  detailPatch = (
    await import("../src/app/api/projects/[projectId]/bugs/[bugId]/route")
  ).PATCH as Handler;
  assignPost = (
    await import(
      "../src/app/api/projects/[projectId]/bugs/[bugId]/assign/route"
    )
  ).POST as Handler;
  transitionPost = (
    await import(
      "../src/app/api/projects/[projectId]/bugs/[bugId]/transition/route"
    )
  ).POST as Handler;
  notePost = (
    await import("../src/app/api/projects/[projectId]/bugs/[bugId]/notes/route")
  ).POST as Handler;
  notePatch = (
    await import(
      "../src/app/api/projects/[projectId]/bugs/[bugId]/notes/[noteId]/route"
    )
  ).PATCH as Handler;
});
afterAll(async () => {
  await client?.$disconnect();
  if (directory) rmSync(directory, { recursive: true, force: true });
  delete process.env.DATABASE_URL;
});

describe("authenticated bug routes", () => {
  it("returns 404 for nonmembers on every endpoint", async () => {
    activeUser = "outsider";
    for (const [handler, method, suffix, data] of [
      [listGet, "GET", "", undefined],
      [createPost, "POST", "", body],
      [detailGet, "GET", `/${bugId}`, undefined],
      [detailPatch, "PATCH", `/${bugId}`, { title: "Changed" }],
      [assignPost, "POST", `/${bugId}/assign`, { assigneeId: "developer" }],
      [transitionPost, "POST", `/${bugId}/transition`, { to: "Investigating" }],
      [
        notePost,
        "POST",
        `/${bugId}/notes`,
        { type: "Observation", body: "note" },
      ],
      [
        notePatch,
        "PATCH",
        `/${bugId}/notes/${noteId}`,
        { type: "Observation", body: "edited" },
      ],
    ] as const)
      expect((await handler(request(method, suffix, data), ctx())).status).toBe(
        404,
      );
  });

  it("requires authentication for public-role actions", async () => {
    activeUser = null;
    for (const [handler, method, suffix, data] of [
      [listGet, "GET", "", undefined],
      [createPost, "POST", "", body],
      [
        notePost,
        "POST",
        `/${bugId}/notes`,
        { type: "Observation", body: "note" },
      ],
    ] as const)
      expect((await handler(request(method, suffix, data), ctx())).status).toBe(
        401,
      );
  });

  it("permits member reads and creation, with server validation", async () => {
    activeUser = "tester";
    expect((await listGet(request("GET"), ctx())).status).toBe(200);
    expect((await detailGet(request("GET", `/${bugId}`), ctx())).status).toBe(
      200,
    );
    expect(
      (await createPost(request("POST", "", { title: "", steps: [] }), ctx()))
        .status,
    ).toBe(400);
    expect((await createPost(request("POST", "", body), ctx())).status).toBe(
      201,
    );
  });

  it("enforces edit, assign, transition and note permissions at each endpoint", async () => {
    activeUser = "other";
    expect(
      (
        await detailPatch(
          request("PATCH", `/${bugId}`, { title: "Wrong author" }),
          ctx(),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await assignPost(
          request("POST", `/${bugId}/assign`, { assigneeId: "developer" }),
          ctx(),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await transitionPost(
          request("POST", `/${bugId}/transition`, { to: "Investigating" }),
          ctx(),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await notePatch(
          request("PATCH", `/${bugId}/notes/${noteId}`, {
            type: "Observation",
            body: "Wrong author",
          }),
          ctx(),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await notePost(
          request("POST", `/${bugId}/notes`, {
            type: "Observation",
            body: "Allowed",
          }),
          ctx(),
        )
      ).status,
    ).toBe(201);
    activeUser = "tester";
    expect(
      (
        await detailPatch(
          request("PATCH", `/${bugId}`, { title: "Fixed title" }),
          ctx(),
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await notePatch(
          request("PATCH", `/${bugId}/notes/${noteId}`, {
            type: "Observation",
            body: "Edited by author",
          }),
          ctx(),
        )
      ).status,
    ).toBe(200);
    activeUser = "developer";
    expect(
      (
        await assignPost(
          request("POST", `/${bugId}/assign`, { assigneeId: "developer" }),
          ctx(),
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await transitionPost(
          request("POST", `/${bugId}/transition`, { to: "Investigating" }),
          ctx(),
        )
      ).status,
    ).toBe(200);
  });
});
