import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { db } from "../src/lib/db";
import { authenticateCredentials, registerUser } from "../src/lib/users";
import {
  addProjectMember,
  archiveProject,
  createProject,
  editProject,
  getProject,
  listProjects,
} from "../src/lib/projects";

let adminId: string;
let outsiderId: string;
let testerId: string;
let developerId: string;
let projectId: string;
let otherProjectId: string;

beforeAll(async () => {
  await db.projectMember.deleteMany();
  await db.project.deleteMany();
  await db.user.deleteMany();
  await db.loginThrottle.deleteMany();
  const admin = await registerUser({
    name: "Admin",
    email: "admin@example.test",
    password: "sample-password-123",
  });
  const outsider = await registerUser({
    name: "Outsider",
    email: "outsider@example.test",
    password: "sample-password-123",
  });
  const tester = await registerUser({
    name: "Tester",
    email: "tester@example.test",
    password: "sample-password-123",
  });
  const developer = await registerUser({
    name: "Developer",
    email: "developer@example.test",
    password: "sample-password-123",
  });
  adminId = admin.id;
  outsiderId = outsider.id;
  testerId = tester.id;
  developerId = developer.id;
  projectId = (
    await createProject(adminId, {
      name: "First",
      key: "ONE",
      description: "First project",
    })
  ).id;
  otherProjectId = (
    await createProject(outsiderId, {
      name: "Second",
      key: "TWO",
      description: "",
    })
  ).id;
  await addProjectMember(adminId, projectId, {
    email: tester.email,
    role: "Tester",
  });
  await addProjectMember(adminId, projectId, {
    email: developer.email,
    role: "Developer",
  });
});
afterAll(async () => {
  await db.$disconnect();
});

describe("registration, credentials, and login throttle", () => {
  it("creates unique users and validates passwords", async () => {
    await expect(
      registerUser({
        name: "Again",
        email: "ADMIN@example.test",
        password: "sample-password-123",
      }),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      registerUser({
        name: "Short",
        email: "short@example.test",
        password: "short",
      }),
    ).rejects.toThrow();
    expect(
      await authenticateCredentials({
        email: "ADMIN@example.test",
        password: "sample-password-123",
      }),
    ).toMatchObject({ id: adminId });
  });
  it("blocks credentials after five failed attempts in a 15 minute window", async () => {
    for (let index = 0; index < 5; index++)
      expect(
        await authenticateCredentials({
          email: "outsider@example.test",
          password: "wrong",
        }),
      ).toBeNull();
    expect(
      await authenticateCredentials({
        email: "outsider@example.test",
        password: "sample-password-123",
      }),
    ).toBeNull();
    await db.loginThrottle.update({
      where: { email: "outsider@example.test" },
      data: { windowStartedAt: new Date(Date.now() - 16 * 60 * 1000) },
    });
    expect(
      await authenticateCredentials({
        email: "outsider@example.test",
        password: "sample-password-123",
      }),
    ).toMatchObject({ id: outsiderId });
  });
});

describe("project isolation and role enforcement", () => {
  it("lists only the user’s projects", async () => {
    expect((await listProjects(adminId)).map((p) => p.id)).toEqual([projectId]);
    expect((await listProjects(outsiderId)).map((p) => p.id)).toEqual([
      otherProjectId,
    ]);
    expect((await listProjects(testerId)).map((p) => p.id)).toEqual([
      projectId,
    ]);
  });
  it("returns 404 to a non-member for viewing or every project mutation", async () => {
    await expect(getProject(outsiderId, projectId)).rejects.toMatchObject({
      status: 404,
    });
    await expect(
      editProject(outsiderId, projectId, { name: "Hack", description: "" }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(archiveProject(outsiderId, projectId)).rejects.toMatchObject({
      status: 404,
    });
    await expect(
      addProjectMember(outsiderId, projectId, {
        email: "outsider@example.test",
        role: "Admin",
      }),
    ).rejects.toMatchObject({ status: 404 });
  });
  it("allows members to view but forbids tester and developer settings changes", async () => {
    expect((await getProject(testerId, projectId)).id).toBe(projectId);
    for (const userId of [testerId, developerId]) {
      await expect(
        editProject(userId, projectId, { name: "No", description: "" }),
      ).rejects.toMatchObject({ status: 403 });
      await expect(archiveProject(userId, projectId)).rejects.toMatchObject({
        status: 403,
      });
      await expect(
        addProjectMember(userId, projectId, {
          email: "outsider@example.test",
          role: "Tester",
        }),
      ).rejects.toMatchObject({ status: 403 });
    }
  });
  it("lets an admin edit and add only registered users", async () => {
    await expect(
      addProjectMember(adminId, projectId, {
        email: "missing@example.test",
        role: "Tester",
      }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      addProjectMember(adminId, projectId, {
        email: "tester@example.test",
        role: "Tester",
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(
      (
        await editProject(adminId, projectId, {
          name: "Updated",
          description: "New description",
        })
      ).name,
    ).toBe("Updated");
    expect(
      (
        await addProjectMember(adminId, projectId, {
          email: "outsider@example.test",
          role: "Tester",
        })
      ).role,
    ).toBe("Tester");
    expect((await listProjects(outsiderId)).map((p) => p.id).sort()).toEqual(
      [projectId, otherProjectId].sort(),
    );
    expect((await listProjects(adminId)).map((p) => p.id)).toEqual([projectId]);
  });
  it("archives a project and rejects later changes", async () => {
    expect(
      (await archiveProject(adminId, projectId)).archivedAt,
    ).not.toBeNull();
    expect((await getProject(testerId, projectId)).archivedAt).not.toBeNull();
    await expect(
      editProject(adminId, projectId, { name: "Again", description: "" }),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      addProjectMember(adminId, projectId, {
        email: "admin@example.test",
        role: "Admin",
      }),
    ).rejects.toMatchObject({ status: 409 });
  });
  it("rejects invalid project keys and duplicate keys", async () => {
    await expect(
      createProject(adminId, { name: "Invalid", key: "A1", description: "" }),
    ).rejects.toThrow();
    await expect(
      createProject(adminId, {
        name: "Duplicate",
        key: "TWO",
        description: "",
      }),
    ).rejects.toMatchObject({ status: 409 });
  });
});
