import { Prisma } from "@prisma/client";
import { db } from "./db";
import { can, type Action } from "./policy";
import {
  addMemberSchema,
  createProjectSchema,
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
) {
  const member = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    include: { project: true },
  });
  if (!member) throw new ProjectError("Project not found.", 404);
  const role = roleSchema.parse(member.role);
  if (!can(role, action))
    throw new ProjectError("You do not have permission to do this.", 403);
  if (member.project.archivedAt)
    throw new ProjectError("Archived projects are read-only.", 409);
  return member.project;
}

export async function createProject(userId: string, input: unknown) {
  const data = createProjectSchema.parse(input);
  try {
    return await db.project.create({
      data: { ...data, members: { create: { userId, role: "Admin" } } },
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
