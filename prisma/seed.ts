import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { hash } from "bcryptjs";
import { databasePath } from "./database-url";
import { buildSeedBugs, seedAreas, seedProjects, seedRoles } from "./seed-plan";

const prisma = new PrismaClient({
  adapter: new PrismaLibSQL({ url: `file:${databasePath()}` }),
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
      create: { ...project, nextBugNumber: 26 },
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
    await prisma.bug.upsert({
      where: {
        projectId_number: {
          projectId: fields.projectId,
          number: fields.number,
        },
      },
      update: {},
      create: {
        ...fields,
        steps: { create: steps },
        notes: { create: notes },
        statusChanges: { create: statusChanges },
      },
    });
  }
  for (const project of seedProjects) {
    await prisma.project.updateMany({
      where: { id: project.id, nextBugNumber: { lt: 26 } },
      data: { nextBugNumber: 26 },
    });
  }
  console.log("Seeded 9 demo users, 2 projects, and 50 bugs.");
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
