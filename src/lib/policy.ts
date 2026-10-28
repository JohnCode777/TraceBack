import { roleSchema, type Role } from "./validators";
import { AppError } from "./errors";

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
  | "deleteProject"
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
  deleteProject: ["Admin"],
  manageMembers: ["Admin"],
  viewDashboard: ["Tester", "Developer", "Admin"],
  downloadReport: ["Tester", "Developer", "Admin"],
};

export type PolicyContext = {
  isReporter?: boolean;
  status?: string;
  isNonReporterField?: boolean;
  isFixAuthor?: boolean;
  isArchived?: boolean;
};

export function can(
  role: Role,
  action: Action,
  context: PolicyContext = {},
): boolean {
  if (!permissions[action].includes(role)) return false;
  if (action === "deleteProject") return context.isArchived === true;
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

export type Actor = { id: string; role: Role };
export type BugForPolicy = { reporterId: string; status: string };
export type BugAction =
  | "view"
  | "create"
  | "edit"
  | "assign"
  | "note"
  | "transition";

export function requireMember(
  role: string | null | undefined,
  userId: string,
): Actor {
  const parsed = roleSchema.safeParse(role);
  if (!parsed.success) throw new AppError("Not found", 404);
  return { id: userId, role: parsed.data };
}

export function authorizeBug(
  actor: Actor,
  action: BugAction,
  bug?: BugForPolicy,
  fields: readonly string[] = [],
): void {
  if (action === "view" && can(actor.role, "viewProject")) return;
  if (action === "create" && can(actor.role, "createBug")) return;
  if (action === "note" && can(actor.role, "addNote")) return;
  if (action === "assign" && can(actor.role, "assignDeveloper")) return;
  if (action === "transition") return; // Pure state machine checks transition roles.
  if (action === "edit") {
    const reporterFields = [
      "title",
      "severity",
      "reproducibility",
      "areaId",
      "osName",
      "osVersion",
      "browserOrDevice",
      "appVersion",
      "envType",
      "expectedBehaviour",
      "actualBehaviour",
      "extraContext",
      "steps",
    ];
    const resolutionFields = [
      "resolutionSummary",
      "rootCauseCategory",
      "reproducedByDev",
      "fixReference",
    ];
    if (
      can(actor.role, "editOwnBug", {
        isReporter: bug?.reporterId === actor.id,
        status: bug?.status,
      }) &&
      !fields.some((field) => resolutionFields.includes(field))
    )
      return;
    if (
      can(actor.role, "editAnyBug", {
        isNonReporterField: !fields.some((field) =>
          reporterFields.includes(field),
        ),
      })
    )
      return;
  }
  throw new AppError("Forbidden", 403);
}
