import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  addNote,
  assignBug,
  createBug,
  editBug,
  editNote,
  getBug,
  listBugs,
  transitionBug,
} from "../src/lib/bugs";
import { authorizeBug, requireMember, type Actor } from "../src/lib/policy";
import { listSchema } from "../src/lib/validation";
import { evaluate } from "../src/lib/completeness";

const tester: Actor = { id: "tester", role: "Tester" };
const otherTester: Actor = { id: "other", role: "Tester" };
const developer: Actor = { id: "developer", role: "Developer" };
const admin: Actor = { id: "admin", role: "Admin" };
const input = {
  title: "Unable to save changes",
  severity: "High" as const,
  reproducibility: "Always" as const,
  areaId: "area",
  osName: "Linux",
  steps: ["Open the page", "Press Save"],
  expectedBehaviour: "The change is saved",
  actualBehaviour: "An error is displayed",
};
let client: PrismaClient;
let directory: string;

beforeEach(async () => {
  directory = mkdtempSync(join(tmpdir(), "traceback-bugs-"));
  const path = join(directory, "test.db");
  const sqlite = new DatabaseSync(path);
  sqlite.exec("PRAGMA foreign_keys = ON");
  sqlite.exec(
    readFileSync("prisma/migrations/20261025120000_init/migration.sql", "utf8"),
  );
  sqlite.close();
  client = new PrismaClient({
    adapter: new PrismaLibSQL({ url: `file:${path}` }),
  });
  for (const actor of [tester, otherTester, developer, admin])
    await client.user.create({
      data: {
        id: actor.id,
        name: actor.id,
        email: `${actor.id}@example.test`,
        passwordHash: "fake",
      },
    });
  await client.project.create({
    data: { id: "project", name: "Demo", key: "DEM" },
  });
  await client.project.create({
    data: { id: "other-project", name: "Other", key: "OTH" },
  });
  await client.area.create({
    data: { id: "area", projectId: "project", name: "UI" },
  });
  for (const actor of [tester, otherTester, developer, admin])
    await client.projectMember.create({
      data: { projectId: "project", userId: actor.id, role: actor.role },
    });
});
afterEach(async () => {
  await client.$disconnect();
  rmSync(directory, { recursive: true, force: true });
});

describe("bug workflow integration", () => {
  it("recomputes completeness on create and edit, and filters incomplete bugs", async () => {
    const sparse = { ...input, steps: ["Open page"] };
    const bug = await createBug("project", tester, sparse, client);
    const initial = evaluate(sparse);
    expect([bug.completenessScore, bug.completenessLevel]).toEqual([
      initial.score,
      initial.level,
    ]);
    expect(
      (
        await listBugs(
          "project",
          tester,
          listSchema.parse({ incomplete: "1" }),
          client,
        )
      ).total,
    ).toBe(1);
    const edited = await editBug(
      "project",
      bug.id,
      tester,
      {
        steps: input.steps,
        browserOrDevice: "Firefox",
        appVersion: "1.0",
        extraContext: "Error log attached",
      },
      client,
    );
    const updated = evaluate({
      ...input,
      browserOrDevice: "Firefox",
      appVersion: "1.0",
      extraContext: "Error log attached",
    });
    expect([edited.completenessScore, edited.completenessLevel]).toEqual([
      updated.score,
      updated.level,
    ]);
    expect(
      (
        await listBugs(
          "project",
          tester,
          listSchema.parse({ incomplete: "1" }),
          client,
        )
      ).total,
    ).toBe(0);
  });
  it("allocates unique sequential IDs under concurrent creation", async () => {
    const bugs = await Promise.all(
      Array.from({ length: 12 }, () =>
        createBug("project", tester, input, client),
      ),
    );
    expect(bugs.map((b) => b.number).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 12 }, (_, i) => i + 1),
    );
    expect(new Set(bugs.map((b) => b.displayId)).size).toBe(12);
  });

  it("scopes reads, filters and pagination to the project", async () => {
    const bug = await createBug("project", tester, input, client);
    expect((await getBug("project", bug.id, tester, client)).title).toBe(
      input.title,
    );
    await expect(
      getBug("other-project", bug.id, tester, client),
    ).rejects.toMatchObject({ status: 404 });
    const found = await listBugs(
      "project",
      tester,
      listSchema.parse({
        status: "Submitted",
        severity: "High",
        area: "area",
        reporter: tester.id,
        q: "save",
        sort: "oldest",
      }),
      client,
    );
    expect(found.total).toBe(1);
    expect(
      (
        await listBugs(
          "project",
          tester,
          listSchema.parse({ q: "missing" }),
          client,
        )
      ).total,
    ).toBe(0);
  });

  it("enforces create, view, edit, assign and note role boundaries", async () => {
    const bug = await createBug("project", tester, input, client);
    expect(requireMember("Tester", tester.id)).toEqual(tester);
    expect(() => requireMember(null, "outsider")).toThrowError(/Not found/);
    for (const action of ["view", "create", "note"] as const)
      expect(() => authorizeBug(tester, action, bug)).not.toThrow();
    expect(() => authorizeBug(tester, "assign", bug)).toThrow();
    expect(() => authorizeBug(developer, "edit", bug, ["title"])).toThrow();
    expect(() => authorizeBug(admin, "edit", bug, ["title"])).not.toThrow();
    await expect(
      editBug(
        "project",
        bug.id,
        otherTester,
        { title: "Another title" },
        client,
      ),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      editBug("project", bug.id, developer, { title: "Another title" }, client),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      editBug(
        "project",
        bug.id,
        tester,
        { resolutionSummary: "Changed resolution" },
        client,
      ),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      assignBug("project", bug.id, tester, developer.id, client),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      assignBug("project", bug.id, developer, tester.id, client),
    ).rejects.toMatchObject({ status: 400 });
    expect(
      (await assignBug("project", bug.id, developer, developer.id, client))
        .assigneeId,
    ).toBe(developer.id);
    const edited = await editBug(
      "project",
      bug.id,
      tester,
      { title: "Saving edits fails" },
      client,
    );
    expect(edited.title).toBe("Saving edits fails");
    expect(
      await client.note.count({
        where: { bugId: bug.id, body: { startsWith: "[Edit log]" } },
      }),
    ).toBe(2);
    expect(
      (
        await client.note.findFirst({
          where: { bugId: bug.id, body: { contains: "title:" } },
        })
      )?.body,
    ).toContain('"Unable to save changes" → "Saving edits fails"');
    const note = await addNote(
      "project",
      bug.id,
      otherTester,
      { type: "Observation", body: "**Still happens**" },
      client,
    );
    await expect(
      editNote(
        "project",
        bug.id,
        note.id,
        tester,
        { type: "Observation", body: "changed" },
        client,
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(
      (
        await editNote(
          "project",
          bug.id,
          note.id,
          otherTester,
          { type: "Observation", body: "updated" },
          client,
        )
      ).editedAt,
    ).not.toBeNull();
    await expect(
      editNote(
        "other-project",
        bug.id,
        note.id,
        otherTester,
        { type: "Observation", body: "updated" },
        client,
      ),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("persists the full lifecycle and rejects invalid transitions without history", async () => {
    const bug = await createBug("project", tester, input, client);
    await expect(
      transitionBug("project", bug.id, tester, { to: "Investigating" }, client),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      transitionBug("project", bug.id, developer, { to: "Verified" }, client),
    ).rejects.toMatchObject({ status: 400 });
    expect(await client.statusChange.count({ where: { bugId: bug.id } })).toBe(
      0,
    );
    await transitionBug(
      "project",
      bug.id,
      developer,
      { to: "Investigating" },
      client,
    );
    await expect(
      transitionBug("project", bug.id, developer, { to: "Fixed" }, client),
    ).rejects.toMatchObject({ status: 400 });
    await transitionBug(
      "project",
      bug.id,
      developer,
      {
        to: "Fixed",
        resolutionSummary: "Corrected state update",
        rootCauseCategory: "Logic error",
        reproducedByDev: "Yes",
      },
      client,
    );
    await expect(
      transitionBug("project", bug.id, developer, { to: "Verified" }, client),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      transitionBug("project", bug.id, tester, { to: "Investigating" }, client),
    ).rejects.toMatchObject({ status: 400 });
    await transitionBug(
      "project",
      bug.id,
      tester,
      { to: "Investigating", comment: "Still failing" },
      client,
    );
    await transitionBug(
      "project",
      bug.id,
      developer,
      {
        to: "Fixed",
        resolutionSummary: "Corrected another state update",
        rootCauseCategory: "Logic error",
        reproducedByDev: "Yes",
      },
      client,
    );
    await transitionBug("project", bug.id, tester, { to: "Verified" }, client);
    const regressed = await transitionBug(
      "project",
      bug.id,
      tester,
      { to: "Investigating", comment: "Regression on release" },
      client,
    );
    expect(regressed.reopenCount).toBe(2);
    expect(regressed.verifiedAt).toBeNull();
    const history = await client.statusChange.findMany({
      where: { bugId: bug.id },
      orderBy: { createdAt: "asc" },
    });
    expect(history).toHaveLength(6);
    expect(history.map((h) => `${h.fromStatus}:${h.toStatus}`)).toEqual([
      "Submitted:Investigating",
      "Investigating:Fixed",
      "Fixed:Investigating",
      "Investigating:Fixed",
      "Fixed:Verified",
      "Verified:Investigating",
    ]);
    await expect(
      client.statusChange.update({
        where: { id: history[0].id },
        data: { comment: "tampered" },
      }),
    ).rejects.toThrow();
    await expect(
      client.statusChange.delete({ where: { id: history[0].id } }),
    ).rejects.toThrow();
  });

  it("prevents cross-project area and assignment references", async () => {
    await expect(
      createBug("project", tester, { ...input, areaId: "missing" }, client),
    ).rejects.toMatchObject({ status: 400 });
    const bug = await createBug("project", tester, input, client);
    await expect(
      assignBug("project", bug.id, admin, "outsider", client),
    ).rejects.toMatchObject({ status: 400 });
  });
});
