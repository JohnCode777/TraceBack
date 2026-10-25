import { describe, expect, it } from "vitest";
import { buildSeedBugs, seedProjects } from "../prisma/seed-plan";

describe("demo seed plan", () => {
  const bugs = buildSeedBugs(new Date("2026-10-25T12:00:00Z"));

  it("creates 25 sequential bugs per project with all four statuses", () => {
    expect(bugs).toHaveLength(50);
    for (const project of seedProjects) {
      const projectBugs = bugs.filter((bug) => bug.projectId === project.id);
      expect(projectBugs.map((bug) => bug.number)).toEqual(
        Array.from({ length: 25 }, (_, index) => index + 1),
      );
      expect(new Set(projectBugs.map((bug) => bug.status))).toEqual(
        new Set(["Submitted", "Investigating", "Fixed", "Verified"]),
      );
    }
  });

  it("keeps history sequential and includes reopen and regression examples", () => {
    expect(bugs.some((bug) => bug.reopenCount === 2)).toBe(true);
    expect(bugs.some((bug) => bug.reopenCount === 1)).toBe(true);
    for (const bug of bugs) {
      let status = "Submitted";
      for (const change of bug.statusChanges) {
        expect(change.fromStatus).toBe(status);
        expect(change.createdAt.getTime()).toBeGreaterThan(
          bug.createdAt.getTime(),
        );
        status = change.toStatus;
      }
      expect(status).toBe(bug.status);
      expect(bug.steps.map((step) => step.position)).toEqual(
        Array.from({ length: bug.steps.length }, (_, index) => index + 1),
      );
      expect(bug.fixedAt !== null).toBe(
        ["Fixed", "Verified"].includes(bug.status),
      );
      expect(bug.verifiedAt !== null).toBe(bug.status === "Verified");
    }
  });

  it("includes incomplete reports with specific missing details", () => {
    expect(
      bugs.some((bug) => bug.appVersion === null && bug.steps.length === 1),
    ).toBe(true);
    expect(bugs.some((bug) => bug.areaId === null)).toBe(true);
    expect(bugs.some((bug) => bug.severity === null)).toBe(true);
  });
});
