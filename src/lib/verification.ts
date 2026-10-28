import { AppError } from "./errors";

export type Replay = {
  steps: { stepId: string; result: "Pass" | "Fail"; comment?: string }[];
  problemOccurs?: "Yes" | "No";
  finalComment?: string;
};

export function suggestReopenReason(
  steps: readonly { id: string; position: number }[],
  replay: {
    steps: readonly {
      stepId: string;
      result: "Pass" | "Fail" | "";
      comment?: string;
    }[];
    problemOccurs?: "Yes" | "No" | "";
    finalComment?: string;
  },
) {
  const submitted = new Map(replay.steps.map((step) => [step.stepId, step]));
  return [
    ...steps
      .filter((step) => submitted.get(step.id)?.result === "Fail")
      .map((step) => {
        const comment = submitted.get(step.id)?.comment?.trim();
        return `Step ${step.position} failed${comment ? `: ${comment}` : ""}`;
      }),
    ...(replay.problemOccurs === "Yes"
      ? [
          `Original problem still occurs${replay.finalComment?.trim() ? `: ${replay.finalComment.trim()}` : ""}`,
        ]
      : []),
  ].join("; ");
}

export function summarizeAttempt(attempt: {
  outcome: string;
  steps: readonly { position: number; result: string }[];
  problemOccurs: string;
}) {
  const failed = attempt.steps.find((step) => step.result === "Fail");
  return attempt.outcome === "verified"
    ? `Verification passed: ${attempt.steps.length}/${attempt.steps.length} steps`
    : failed
      ? `Verification failed: step ${failed.position}`
      : "Verification failed: original problem still occurs";
}

export function evaluateReplay(
  steps: readonly { id: string; position: number; instruction: string }[],
  replay: Replay | undefined,
  outcome: "verified" | "reopened",
) {
  if (!replay) throw new AppError("Complete the verification checklist", 400);
  if (!replay.problemOccurs)
    throw new AppError("Answer whether the original problem still occurs", 400);
  const ordered = [...steps].sort((a, b) => a.position - b.position);
  const submitted = new Map(replay.steps.map((step) => [step.stepId, step]));
  if (
    replay.steps.length !== ordered.length ||
    submitted.size !== ordered.length ||
    ordered.some((step) => !submitted.has(step.id))
  )
    throw new AppError("Mark every reproduction step Pass or Fail", 400);
  const failed = ordered.filter(
    (step) => submitted.get(step.id)?.result === "Fail",
  );
  const passed = failed.length === 0 && replay.problemOccurs === "No";
  if (outcome === "verified" && !passed)
    throw new AppError(
      failed.length
        ? `Cannot verify: step ${failed[0].position} failed`
        : "Cannot verify: the original problem still occurs",
      400,
    );
  if (outcome === "reopened" && passed)
    throw new AppError(
      "Reopen requires a failed step or the original problem still occurring",
      400,
    );
  const reason = suggestReopenReason(ordered, replay);
  return {
    problemOccurs: replay.problemOccurs,
    reason,
    summary: summarizeAttempt({
      outcome,
      steps: ordered.map((step) => ({
        position: step.position,
        result: submitted.get(step.id)!.result,
      })),
      problemOccurs: replay.problemOccurs,
    }),
    results: ordered.map((step) => ({
      position: step.position,
      instruction: step.instruction,
      result: submitted.get(step.id)!.result,
      comment: submitted.get(step.id)!.comment?.trim() || null,
    })),
  };
}
