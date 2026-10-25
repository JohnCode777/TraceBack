import { AppError } from "./errors";

export const statuses = [
  "Submitted",
  "Investigating",
  "Fixed",
  "Verified",
] as const;
export type Status = (typeof statuses)[number];
export type Role = "Tester" | "Developer" | "Admin";

export const transitions = [
  ["Submitted", "Investigating"],
  ["Investigating", "Fixed"],
  ["Fixed", "Verified"],
  ["Fixed", "Investigating"],
  ["Verified", "Investigating"],
] as const;

export type TransitionInput = {
  from: Status;
  to: Status;
  role: Role;
  actorId: string;
  fixedById?: string | null;
  reason?: string | null;
  resolutionSummary?: string | null;
  rootCauseCategory?: string | null;
  reproducedByDev?: string | null;
};

/** Pure lifecycle rule. Persistence belongs to transitionBug only. */
export function decideTransition(input: TransitionInput): { reopen: boolean } {
  const { from, to, role } = input;
  if (!transitions.some(([a, b]) => a === from && b === to))
    throw new AppError(`Cannot move a bug from ${from} to ${to}`, 400);
  const developerMove =
    (from === "Submitted" && to === "Investigating") ||
    (from === "Investigating" && to === "Fixed");
  if (role !== "Admin" && role !== (developerMove ? "Developer" : "Tester"))
    throw new AppError("Role cannot make this transition", 403);
  if (from === "Investigating" && to === "Fixed") {
    if (
      !input.resolutionSummary?.trim() ||
      !input.rootCauseCategory ||
      !input.reproducedByDev
    )
      throw new AppError(
        "Fix requires resolution, root cause and reproduced-by-developer",
        400,
      );
  }
  if (
    to === "Verified" &&
    role !== "Admin" &&
    input.fixedById === input.actorId
  )
    throw new AppError(
      "The developer who fixed this bug cannot verify it",
      403,
    );
  const reopen = to === "Investigating" && from !== "Submitted";
  if (reopen && !input.reason?.trim())
    throw new AppError("Reopen or regression requires a reason", 400);
  return { reopen };
}
