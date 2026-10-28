import { Prisma } from "@prisma/client";
import { db } from "./db";
import { can, type Action } from "./policy";
import {
  addMemberSchema,
  areaIdSchema,
  createAreaSchema,
  createProjectSchema,
  deleteProjectSchema,
  editProjectSchema,
  roleSchema,
} from "./validators";

export class ProjectError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export const defaultAreaNames = [
  "General",
  "Setup",
  "Authentication",
  "Testing",
] as const;

export async function listProjects(userId: string) {
  return db.project.findMany({
    where: { members: { some: { userId } } },
    orderBy: { name: "asc" },
    include: { members: { where: { userId }, select: { role: true } } },
  });
}

export async function getProject(userId: string, projectId: string) {
  const project = await db.project.findFirst({
    where: { id: projectId, members: { some: { userId } } },
    include: {
      members: {
        orderBy: { user: { name: "asc" } },
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });
  if (!project) throw new ProjectError("Project not found.", 404);
  return project;
}

export async function requireProjectAction(
  userId: string,
  projectId: string,
  action: Action,
  options: {
    client?: Pick<Prisma.TransactionClient, "projectMember">;
    allowArchived?: boolean;
  } = {},
) {
  const member = await (options.client ?? db).projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    include: { project: true },
  });
  if (!member) throw new ProjectError("Project not found.", 404);
  const role = roleSchema.parse(member.role);
  const isArchived = member.project.archivedAt !== null;
  if (!can(role, action, { isArchived })) {
    if (action === "deleteProject" && can(role, action, { isArchived: true }))
      throw new ProjectError("Archive the project before deleting it.", 409);
    throw new ProjectError("You do not have permission to do this.", 403);
  }
  if (member.project.archivedAt && !options.allowArchived)
    throw new ProjectError("Archived projects are read-only.", 409);
  return member.project;
}

export async function deleteProject(
  userId: string,
  projectId: string,
  input: unknown,
) {
  const { confirmationKey } = deleteProjectSchema.parse(input);
  return db.$transaction(async (tx) => {
    const project = await requireProjectAction(
      userId,
      projectId,
      "deleteProject",
      { client: tx, allowArchived: true },
    );
    if (confirmationKey !== project.key)
      throw new ProjectError("Project key does not match.", 400);

    // The trigger permits history removal only during this archived-project
    // transaction. A rollback restores both the marker and every child row.
    await tx.project.update({
      where: { id: projectId },
      data: { nextBugNumber: 0 },
    });
    const bugIds = (
      await tx.bug.findMany({
        where: { projectId },
        select: { id: true },
      })
    ).map((bug) => bug.id);
    if (
      await tx.verificationAttempt.count({ where: { bugId: { in: bugIds } } })
    )
      throw new ProjectError(
        "Project has immutable verification records and cannot be deleted.",
        409,
      );
    await tx.statusChange.deleteMany({ where: { bugId: { in: bugIds } } });
    await tx.note.deleteMany({ where: { bugId: { in: bugIds } } });
    await tx.reproStep.deleteMany({ where: { bugId: { in: bugIds } } });
    await tx.bug.deleteMany({ where: { projectId } });
    await tx.area.deleteMany({ where: { projectId } });
    await tx.projectMember.deleteMany({ where: { projectId } });
    await tx.project.delete({ where: { id: projectId } });
    return { id: projectId };
  });
}

export async function createProject(userId: string, input: unknown) {
  const data = createProjectSchema.parse(input);
  try {
    return await db.project.create({
      data: {
        ...data,
        members: { create: { userId, role: "Admin" } },
        areas: { create: defaultAreaNames.map((name) => ({ name })) },
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      throw new ProjectError("Project key is already in use.", 409);
    throw error;
  }
}

export async function addProjectArea(
  userId: string,
  projectId: string,
  input: unknown,
) {
  const { name } = createAreaSchema.parse(input);
  await requireProjectAction(userId, projectId, "manageProject");
  try {
    return await db.area.create({ data: { projectId, name } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      throw new ProjectError("Area already exists in this project.", 409);
    throw error;
  }
}

export async function removeProjectArea(
  userId: string,
  projectId: string,
  areaId: unknown,
) {
  const validAreaId = areaIdSchema.parse(areaId);
  await requireProjectAction(userId, projectId, "manageProject");
  const area = await db.area.findFirst({
    where: { id: validAreaId, projectId },
  });
  if (!area) throw new ProjectError("Area not found.", 404);
  if (await db.bug.count({ where: { projectId, areaId: validAreaId } }))
    throw new ProjectError("Area is used by bugs and cannot be removed.", 409);
  try {
    return await db.area.delete({ where: { id: area.id } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    )
      throw new ProjectError(
        "Area is used by bugs and cannot be removed.",
        409,
      );
    throw error;
  }
}

export async function editProject(
  userId: string,
  projectId: string,
  input: unknown,
) {
  const data = editProjectSchema.parse(input);
  await requireProjectAction(userId, projectId, "manageProject");
  return db.project.update({ where: { id: projectId }, data });
}

export async function archiveProject(userId: string, projectId: string) {
  await requireProjectAction(userId, projectId, "manageProject");
  return db.project.update({
    where: { id: projectId },
    data: { archivedAt: new Date() },
  });
}

export async function addProjectMember(
  userId: string,
  projectId: string,
  input: unknown,
) {
  const data = addMemberSchema.parse(input);
  await requireProjectAction(userId, projectId, "manageMembers");
  const user = await db.user.findUnique({ where: { email: data.email } });
  if (!user) throw new ProjectError("No registered user has that email.", 404);
  try {
    return await db.projectMember.create({
      data: { projectId, userId: user.id, role: data.role },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      throw new ProjectError("User is already a project member.", 409);
    throw error;
  }
}
