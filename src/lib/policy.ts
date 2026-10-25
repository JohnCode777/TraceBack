import type { Role } from "./validators";

export type Action =
  | "viewProject"
  | "createBug"
  | "editOwnBug"
  | "editAnyBug"
  | "assignDeveloper"
  | "addNote"
  | "investigate"
  | "fix"
  | "verify"
  | "reopen"
  | "regression"
  | "manageProject"
  | "manageMembers"
  | "viewDashboard"
  | "downloadReport";

const permissions: Record<Action, readonly Role[]> = {
  viewProject: ["Tester", "Developer", "Admin"],
  createBug: ["Tester", "Developer", "Admin"],
  editOwnBug: ["Tester", "Admin"],
  editAnyBug: ["Developer", "Admin"],
  assignDeveloper: ["Developer", "Admin"],
  addNote: ["Tester", "Developer", "Admin"],
  investigate: ["Developer", "Admin"],
  fix: ["Developer", "Admin"],
  verify: ["Tester", "Admin"],
  reopen: ["Tester", "Admin"],
  regression: ["Tester", "Admin"],
  manageProject: ["Admin"],
  manageMembers: ["Admin"],
  viewDashboard: ["Tester", "Developer", "Admin"],
  downloadReport: ["Tester", "Developer", "Admin"],
};

export type PolicyContext = {
  isReporter?: boolean;
  status?: string;
  isNonReporterField?: boolean;
  isFixAuthor?: boolean;
};

export function can(
  role: Role,
  action: Action,
  context: PolicyContext = {},
): boolean {
  if (!permissions[action].includes(role)) return false;
  if (action === "editOwnBug" && role === "Tester")
    return (
      context.isReporter === true &&
      (context.status === "Submitted" || context.status === "Investigating")
    );
  if (action === "editAnyBug" && role === "Developer")
    return context.isNonReporterField === true;
  if (action === "verify" && role !== "Admin" && context.isFixAuthor)
    return false;
  return true;
}
