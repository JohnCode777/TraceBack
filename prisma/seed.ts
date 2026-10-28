import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { hash } from "bcryptjs";
import { databaseUrl } from "./database-url";
import { buildSeedBugs, seedAreas, seedProjects, seedRoles } from "./seed-plan";
import { evaluate } from "../src/lib/completeness";

const prisma = new PrismaClient({
  adapter: new PrismaLibSql({ url: databaseUrl() }),
});

async function main() {
  const passwordHash = await hash("traceback-demo-password", 10);
  for (const role of seedRoles) {
    for (let number = 1; number <= 3; number++) {
      const id = `seed-user-${role.toLowerCase()}-${number}`;
      const email = `${role.toLowerCase()}${number}@example.test`;
      await prisma.user.upsert({
        where: { id },
        update: {},
        create: { id, name: `Demo ${role} ${number}`, email, passwordHash },
      });
    }
  }

  for (const project of seedProjects) {
    await prisma.project.upsert({
      where: { id: project.id },
      update: {},
      create: { ...project, nextBugNumber: 41 },
    });
    for (const [index, name] of seedAreas.entries()) {
      await prisma.area.upsert({
        where: { id: `seed-area-${project.key.toLowerCase()}-${index + 1}` },
        update: {},
        create: {
          id: `seed-area-${project.key.toLowerCase()}-${index + 1}`,
          projectId: project.id,
          name,
        },
      });
    }
    for (const role of seedRoles) {
      for (let number = 1; number <= 3; number++) {
        const userId = `seed-user-${role.toLowerCase()}-${number}`;
        await prisma.projectMember.upsert({
          where: { projectId_userId: { projectId: project.id, userId } },
          update: {},
          create: { projectId: project.id, userId, role },
        });
      }
    }
  }

  for (const bug of buildSeedBugs()) {
    const { steps, notes, statusChanges, ...fields } = bug;
    const completeness = evaluate({ ...fields, steps });
    const saved = await prisma.bug.upsert({
      where: {
        projectId_number: {
          projectId: fields.projectId,
          number: fields.number,
        },
      },
      update: {
        completenessScore: completeness.score,
        completenessLevel: completeness.level,
      },
      create: {
        ...fields,
        completenessScore: completeness.score,
        completenessLevel: completeness.level,
        steps: { create: steps },
        notes: { create: notes },
        statusChanges: { create: statusChanges },
      },
    });
    if ([4, 12, 15].includes(fields.number)) {
      for (const [index, change] of statusChanges.entries()) {
        if (
          change.fromStatus !== "Fixed" ||
          !["Verified", "Investigating"].includes(change.toStatus)
        )
          continue;
        const reopened = change.toStatus === "Investigating";
        const id = `${saved.id}-verification-${index}`;
        if (await prisma.verificationAttempt.findUnique({ where: { id } }))
          continue;
        await prisma.verificationAttempt.create({
          data: {
            id,
            bugId: saved.id,
            verifierId: change.actorId,
            createdAt: change.createdAt,
            outcome: reopened ? "reopened" : "verified",
            problemOccurs: reopened ? "Yes" : "No",
            finalComment: reopened
              ? "The original failure still occurs."
              : null,
            steps: {
              create: steps.map((step) => ({
                position: step.position,
                instruction: step.instruction,
                result:
                  reopened && step.position === steps[steps.length - 1].position
                    ? "Fail"
                    : "Pass",
                comment:
                  reopened && step.position === steps[steps.length - 1].position
                    ? "Observed the original failure."
                    : null,
              })),
            },
          },
        });
      }
    }
  }
  for (const project of seedProjects) {
    await prisma.project.updateMany({
      where: { id: project.id, nextBugNumber: { lt: 41 } },
      data: { nextBugNumber: 41 },
    });
  }
  console.log("Seeded 9 demo users, 2 projects, and 80 bugs.");
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
