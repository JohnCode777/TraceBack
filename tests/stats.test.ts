import { describe, expect, it } from "vitest";
import { buildSeedBugs, seedAreas, seedProjects } from "../prisma/seed-plan";
import { calculateStats } from "../src/lib/stats";

const now = new Date("2026-10-25T12:00:00Z");
const seeded = buildSeedBugs(now).map((bug) => ({
  ...bug,
  areaName: bug.areaId ? seedAreas[(bug.number - 1) % seedAreas.length] : null,
}));
const filtered = seeded.filter(
  (bug) =>
    bug.projectId === seedProjects[0].id &&
    bug.createdAt >= new Date(now.getTime() - 90 * 86_400_000),
);
const stats = calculateStats(seeded, {
  projectId: seedProjects[0].id,
  from: new Date(now.getTime() - 90 * 86_400_000),
  now,
});

describe("dashboard statistics against raw seeded bugs", () => {
  it("counts unresolved severity and status directly", () => {
    expect(stats.total).toBe(filtered.length);
    for (const row of stats.unresolvedBySeverity) {
      expect(row.count).toBe(
        filtered.filter(
          (bug) => bug.severity === row.severity && bug.status !== "Verified",
        ).length,
      );
    }
    for (const row of stats.byStatus) {
      expect(row.count).toBe(
        filtered.filter((bug) => bug.status === row.status).length,
      );
    }
    expect(stats.byStatus.reduce((sum, row) => sum + row.count, 0)).toBe(
      filtered.length,
    );
  });

  it("counts 30 and 90 day areas and applies the recurring rule", () => {
    for (const area of stats.topAreas) {
      const rows = filtered.filter((bug) => bug.areaId === area.areaId);
      expect(area.count30).toBe(
        rows.filter(
          (bug) => bug.createdAt >= new Date(now.getTime() - 30 * 86_400_000),
        ).length,
      );
      expect(area.count90).toBe(rows.length);
      expect(area.recurring).toBe(
        area.count30 >= 3 || rows.some((bug) => bug.reopenCount >= 2),
      );
    }
  });

  it("computes average time to fix and verify from raw timestamps", () => {
    const fixed = filtered.filter((bug) => bug.fixedAt);
    const verified = filtered.filter((bug) => bug.fixedAt && bug.verifiedAt);
    expect(stats.timeToFix.count).toBe(fixed.length);
    expect(stats.timeToVerify.count).toBe(verified.length);
    expect(stats.timeToFix.averageHours).toBeCloseTo(
      fixed.reduce(
        (sum, bug) => sum + (bug.fixedAt!.getTime() - bug.createdAt.getTime()),
        0,
      ) /
        fixed.length /
        3_600_000,
    );
    expect(stats.timeToVerify.averageHours).toBeCloseTo(
      verified.reduce(
        (sum, bug) =>
          sum + (bug.verifiedAt!.getTime() - bug.fixedAt!.getTime()),
        0,
      ) /
        verified.length /
        3_600_000,
    );
  });
});
