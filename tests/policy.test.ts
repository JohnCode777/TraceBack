import { describe, expect, it } from "vitest";
import { can, type Action } from "../src/lib/policy";
import type { Role } from "../src/lib/validators";

const rows: [Action, Role[]][] = [
  ["viewProject", ["Tester", "Developer", "Admin"]],
  ["createBug", ["Tester", "Developer", "Admin"]],
  ["editOwnBug", ["Tester", "Admin"]],
  ["editAnyBug", ["Developer", "Admin"]],
  ["assignDeveloper", ["Developer", "Admin"]],
  ["addNote", ["Tester", "Developer", "Admin"]],
  ["investigate", ["Developer", "Admin"]],
  ["fix", ["Developer", "Admin"]],
  ["verify", ["Tester", "Admin"]],
  ["reopen", ["Tester", "Admin"]],
  ["regression", ["Tester", "Admin"]],
  ["manageProject", ["Admin"]],
  ["deleteProject", ["Admin"]],
  ["manageMembers", ["Admin"]],
  ["viewDashboard", ["Tester", "Developer", "Admin"]],
  ["downloadReport", ["Tester", "Developer", "Admin"]],
];

describe("Section 5.1 role matrix", () => {
  it.each(rows)(
    "%s has the specified allowed and forbidden roles",
    (action, allowed) => {
      for (const role of ["Tester", "Developer", "Admin"] as Role[]) {
        const context = {
          isReporter: true,
          status: "Submitted",
          isNonReporterField: true,
          isArchived: true,
        };
        expect(can(role, action, context)).toBe(allowed.includes(role));
      }
    },
  );
  it("limits tester edits to their own unfixed bugs", () => {
    expect(
      can("Tester", "editOwnBug", { isReporter: false, status: "Submitted" }),
    ).toBe(false);
    expect(
      can("Tester", "editOwnBug", { isReporter: true, status: "Fixed" }),
    ).toBe(false);
    expect(
      can("Tester", "editOwnBug", { isReporter: true, status: "Verified" }),
    ).toBe(false);
  });
  it("requires an archived project for deletion", () => {
    expect(can("Admin", "deleteProject", { isArchived: false })).toBe(false);
    expect(can("Admin", "deleteProject", { isArchived: true })).toBe(true);
  });
  it("limits developer edits to non-reporter fields", () => {
    expect(can("Developer", "editAnyBug", { isNonReporterField: false })).toBe(
      false,
    );
  });
  it("prevents a non-admin fix author from verifying", () => {
    expect(can("Tester", "verify", { isFixAuthor: true })).toBe(false);
    expect(can("Admin", "verify", { isFixAuthor: true })).toBe(true);
  });
});
