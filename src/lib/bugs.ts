import { Prisma, type PrismaClient } from "@prisma/client";
import type { z } from "zod";
import { db } from "./db";
import { evaluate } from "./completeness";
import { AppError } from "./errors";
import { authorizeBug, type Actor } from "./policy";
import { decideTransition, type Status } from "./state-machine";
import { evaluateReplay } from "./verification";
import {
  createBugSchema,
  editBugSchema,
  listSchema,
  noteSchema,
  transitionSchema,
} from "./validation";

type CreateInput = z.infer<typeof createBugSchema>;
type EditInput = z.infer<typeof editBugSchema>;
type TransitionInput = z.infer<typeof transitionSchema>;
type NoteInput = z.infer<typeof noteSchema>;
type Client = PrismaClient;

async function projectForWrite(client: Client, projectId: string) {
  const project = await client.project.findUnique({ where: { id: projectId } });
  if (!project) throw new AppError("Not found", 404);
  if (project.archivedAt) throw new AppError("Project is archived", 409);
  return project;
}

async function checkArea(
  client: Client,
  projectId: string,
  areaId: string | null | undefined,
) {
  if (
    areaId &&
    !(await client.area.findFirst({ where: { id: areaId, projectId } }))
  )
    throw new AppError("Area is not in this project", 400);
}

export async function createBug(
  projectId: string,
  actor: Actor,
  input: CreateInput,
  client: Client = db,
) {
  authorizeBug(actor, "create");
  await projectForWrite(client, projectId);
  await checkArea(client, projectId, input.areaId);
  // The atomic increment allocates each number under SQLite's write lock.
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      return await client.$transaction(async (tx) => {
        const project = await tx.project.update({
          where: { id: projectId },
          data: { nextBugNumber: { increment: 1 } },
          select: { nextBugNumber: true, key: true },
        });
        const { steps, ...fields } = input;
        const completeness = evaluate({ ...fields, steps });
        const bug = await tx.bug.create({
          data: {
            ...fields,
            completenessScore: completeness.score,
            completenessLevel: completeness.level,
            projectId,
            reporterId: actor.id,
            number: project.nextBugNumber - 1,
            steps: {
              create: steps.map((instruction, position) => ({
                instruction,
                position: position + 1,
              })),
            },
          },
        });
        return { ...bug, displayId: `${project.key}-${bug.number}` };
      });
    } catch (error) {
      if (attempt === 7 || !isBusy(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 10 * (attempt + 1)));
    }
  }
  throw new AppError("Could not allocate bug number", 503);
}

function isBusy(error: unknown) {
  return (
    error instanceof Error &&
    /SQLITE_BUSY|database is locked|P2034|P1008/.test(error.message)
  );
}

export async function getBug(
  projectId: string,
  bugId: string,
  actor: Actor,
  client: Client = db,
) {
  authorizeBug(actor, "view");
  const bug = await client.bug.findFirst({
    where: { id: bugId, projectId },
    include: {
      project: true,
      area: true,
      reporter: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
      steps: { orderBy: { position: "asc" } },
      notes: {
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
      statusChanges: {
        include: { actor: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
      verificationAttempts: {
        include: {
          verifier: { select: { name: true } },
          steps: { orderBy: { position: "asc" } },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      },
    },
  });
  if (!bug) throw new AppError("Not found", 404);
  return bug;
}

export async function listBugs(
  projectId: string,
  actor: Actor,
  query: z.infer<typeof listSchema>,
  client: Client = db,
) {
  authorizeBug(actor, "view");
  const where: Prisma.BugWhereInput = {
    projectId,
    status:
      query.status ??
      (query.unresolved
        ? { in: ["Submitted", "Investigating", "Fixed"] }
        : undefined),
    severity: query.severity,
    areaId: query.area,
    reporterId: query.reporter,
    assigneeId: query.assignee,
    completenessLevel: query.incomplete ? "Incomplete" : undefined,
    createdAt: {
      gte: query.window
        ? new Date(
            Math.max(
              query.from ? new Date(`${query.from}T00:00:00Z`).getTime() : 0,
              Date.now() - Number(query.window) * 86_400_000,
            ),
          )
        : query.from
          ? new Date(`${query.from}T00:00:00Z`)
          : undefined,
      lte: query.to ? new Date(`${query.to}T23:59:59.999Z`) : undefined,
    },
    OR: query.q
      ? [
          { title: { contains: query.q } },
          { actualBehaviour: { contains: query.q } },
          { expectedBehaviour: { contains: query.q } },
        ]
      : undefined,
  };
  const orderBy: Prisma.BugOrderByWithRelationInput =
    query.sort === "oldest"
      ? { createdAt: "asc" }
      : query.sort === "severity"
        ? { severity: "asc" }
        : query.sort === "title"
          ? { title: "asc" }
          : { createdAt: "desc" };
  const [items, total] = await Promise.all([
    client.bug.findMany({
      where,
      include: {
        area: true,
        assignee: { select: { name: true } },
        steps: { orderBy: { position: "asc" } },
      },
      orderBy: [orderBy, { id: "asc" }],
      skip: (query.page - 1) * 20,
      take: 20,
    }),
    client.bug.count({ where }),
  ]);
  return {
    items,
    total,
    page: query.page,
    pages: Math.max(1, Math.ceil(total / 20)),
  };
}

export async function editBug(
  projectId: string,
  bugId: string,
  actor: Actor,
  input: EditInput,
  client: Client = db,
) {
  const original = await client.bug.findFirst({
    where: { id: bugId, projectId },
    include: { steps: { orderBy: { position: "asc" } } },
  });
  if (!original) throw new AppError("Not found", 404);
  authorizeBug(actor, "edit", original, Object.keys(input));
  await projectForWrite(client, projectId);
  await checkArea(client, projectId, input.areaId);
  if ("assigneeId" in input) throw new AppError("Use assignment action", 400);
  const { steps, ...fields } = input;
  const completeness = evaluate({
    ...original,
    ...fields,
    steps: steps ?? original.steps,
  });
  const changed = Object.entries(fields)
    .filter(
      ([key, value]) =>
        value !== undefined && value !== original[key as keyof typeof original],
    )
    .map(([key]) => key);
  if (
    steps &&
    JSON.stringify(steps) !==
      JSON.stringify(original.steps.map((step) => step.instruction))
  )
    changed.push("steps");
  if (changed.length === 0) return original;
  const audit = changed.map((key) => {
    const before =
      key === "steps"
        ? original.steps.map((step) => step.instruction)
        : original[key as keyof typeof original];
    const after = key === "steps" ? steps : fields[key as keyof typeof fields];
    return `${key}: ${JSON.stringify(before)} → ${JSON.stringify(after)}`;
  });
  return client.$transaction(async (tx) => {
    if (steps) {
      await tx.reproStep.deleteMany({ where: { bugId } });
      await tx.reproStep.createMany({
        data: steps.map((instruction, position) => ({
          bugId,
          instruction,
          position: position + 1,
        })),
      });
    }
    const bug = await tx.bug.update({
      where: { id: bugId },
      data: {
        ...fields,
        completenessScore: completeness.score,
        completenessLevel: completeness.level,
      },
    });
    await tx.note.create({
      data: {
        bugId,
        authorId: actor.id,
        type: "Observation",
        body: `[Edit log]\n${audit.join("\n")}`,
      },
    });
    return bug;
  });
}

export async function assignBug(
  projectId: string,
  bugId: string,
  actor: Actor,
  assigneeId: string | null,
  client: Client = db,
) {
  authorizeBug(actor, "assign");
  await projectForWrite(client, projectId);
  const bug = await client.bug.findFirst({ where: { id: bugId, projectId } });
  if (!bug) throw new AppError("Not found", 404);
  authorizeBug(actor, "assign", bug);
  if (assigneeId) {
    const member = await client.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: assigneeId } },
    });
    if (!member || member.role !== "Developer")
      throw new AppError("Assignee must be a project developer", 400);
  }
  if (bug.assigneeId === assigneeId) return bug;
  return client.$transaction(async (tx) => {
    const updated = await tx.bug.update({
      where: { id: bugId },
      data: { assigneeId },
    });
    await tx.note.create({
      data: {
        bugId,
        authorId: actor.id,
        type: "Observation",
        body: `[Edit log]\nassigneeId: ${JSON.stringify(bug.assigneeId)} → ${JSON.stringify(assigneeId)}`,
      },
    });
    return updated;
  });
}

export async function transitionBug(
  projectId: string,
  bugId: string,
  actor: Actor,
  input: TransitionInput,
  client: Client = db,
) {
  authorizeBug(actor, "transition");
  await projectForWrite(client, projectId);
  return client.$transaction(async (tx) => {
    const bug = await tx.bug.findFirst({
      where: { id: bugId, projectId },
      include: { steps: { orderBy: { position: "asc" } } },
    });
    if (!bug) throw new AppError("Not found", 404);
    const lastFix = await tx.statusChange.findFirst({
      where: { bugId, toStatus: "Fixed" },
      orderBy: { createdAt: "desc" },
    });
    const { reopen } = decideTransition({
      from: bug.status as Status,
      to: input.to,
      role: actor.role,
      actorId: actor.id,
      fixedById: lastFix?.actorId,
      reason: input.comment,
      resolutionSummary: input.resolutionSummary ?? bug.resolutionSummary,
      rootCauseCategory: input.rootCauseCategory ?? bug.rootCauseCategory,
      reproducedByDev: input.reproducedByDev ?? bug.reproducedByDev,
    });
    const replay =
      bug.status === "Fixed" &&
      (input.to === "Verified" || input.to === "Investigating")
        ? evaluateReplay(
            bug.steps,
            input.verification,
            input.to === "Verified" ? "verified" : "reopened",
          )
        : null;
    const now = new Date();
    const changed = await tx.bug.updateMany({
      where: { id: bugId, projectId, status: bug.status },
      data: {
        status: input.to,
        reopenCount: reopen ? { increment: 1 } : undefined,
        fixedAt: input.to === "Fixed" ? now : undefined,
        verifiedAt: input.to === "Verified" ? now : reopen ? null : undefined,
        resolutionSummary:
          input.to === "Fixed"
            ? (input.resolutionSummary ?? bug.resolutionSummary)
            : undefined,
        rootCauseCategory:
          input.to === "Fixed"
            ? (input.rootCauseCategory ?? bug.rootCauseCategory)
            : undefined,
        reproducedByDev:
          input.to === "Fixed"
            ? (input.reproducedByDev ?? bug.reproducedByDev)
            : undefined,
        fixReference: input.to === "Fixed" ? input.fixReference : undefined,
      },
    });
    if (changed.count !== 1)
      throw new AppError("Bug changed; reload and retry", 409);
    await tx.statusChange.create({
      data: {
        bugId,
        fromStatus: bug.status,
        toStatus: input.to,
        actorId: actor.id,
        comment: input.comment,
        createdAt: now,
      },
    });
    if (replay) {
      await tx.verificationAttempt.create({
        data: {
          bugId,
          verifierId: actor.id,
          createdAt: now,
          problemOccurs: input.verification!.problemOccurs,
          finalComment: input.verification!.finalComment?.trim() || null,
          outcome: input.to === "Verified" ? "verified" : "reopened",
          steps: { create: replay.results },
        },
      });
    }
    return tx.bug.findUniqueOrThrow({ where: { id: bugId } });
  });
}

export async function addNote(
  projectId: string,
  bugId: string,
  actor: Actor,
  input: NoteInput,
  client: Client = db,
) {
  authorizeBug(actor, "note");
  await projectForWrite(client, projectId);
  if (!(await client.bug.findFirst({ where: { id: bugId, projectId } })))
    throw new AppError("Not found", 404);
  return client.note.create({ data: { bugId, authorId: actor.id, ...input } });
}

export async function editNote(
  projectId: string,
  bugId: string,
  noteId: string,
  actor: Actor,
  input: NoteInput,
  client: Client = db,
) {
  authorizeBug(actor, "note");
  await projectForWrite(client, projectId);
  const note = await client.note.findFirst({
    where: { id: noteId, bugId, bug: { projectId } },
  });
  if (!note) throw new AppError("Not found", 404);
  if (note.authorId !== actor.id || note.body.startsWith("[Edit log]"))
    throw new AppError("Forbidden", 403);
  return client.note.update({
    where: { id: noteId },
    data: { ...input, editedAt: new Date() },
  });
}
