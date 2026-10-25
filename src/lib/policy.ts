import { AppError } from "./errors";
import type { Role } from "./state-machine";

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
  if (!role || !["Tester", "Developer", "Admin"].includes(role))
    throw new AppError("Not found", 404);
  return { id: userId, role: role as Role };
}

export function authorizeBug(
  actor: Actor,
  action: BugAction,
  bug?: BugForPolicy,
  fields: readonly string[] = [],
): void {
  if (action === "view" || action === "create" || action === "note") return;
  if (action === "assign") {
    if (actor.role === "Tester") throw new AppError("Forbidden", 403);
    return;
  }
  if (action === "transition") return; // state machine checks transition roles
  if (actor.role === "Admin") return;
  if (actor.role === "Tester") {
    if (
      bug?.reporterId !== actor.id ||
      ["Fixed", "Verified"].includes(bug.status)
    )
      throw new AppError("Forbidden", 403);
    if (
      fields.some((field) =>
        [
          "resolutionSummary",
          "rootCauseCategory",
          "reproducedByDev",
          "fixReference",
        ].includes(field),
      )
    )
      throw new AppError("Testers cannot edit resolution fields", 403);
    return;
  }
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
  if (fields.some((field) => reporterFields.includes(field)))
    throw new AppError("Developers cannot edit reporter fields", 403);
}
