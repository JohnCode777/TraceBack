import { describe, expect, it } from "vitest";
import { evaluateReplay, suggestReopenReason } from "../src/lib/verification";

const steps = [
  { id: "one", position: 1, instruction: "Open form" },
  { id: "two", position: 2, instruction: "Press save" },
];
const pass = {
  steps: [
    { stepId: "one", result: "Pass" as const },
    { stepId: "two", result: "Pass" as const },
  ],
  problemOccurs: "No" as const,
};

describe("verification replay rules", () => {
  it("verifies only a complete passing replay when the problem is gone", () => {
    expect(evaluateReplay(steps, pass, "verified").summary).toBe(
      "Verification passed: 2/2 steps",
    );
  });
  it("rejects missing, duplicate, and failed step results", () => {
    expect(() => evaluateReplay(steps, undefined, "verified")).toThrow(
      /Complete/,
    );
    expect(() =>
      evaluateReplay(steps, { steps: pass.steps }, "verified"),
    ).toThrow(/Answer whether/);
    expect(() =>
      evaluateReplay(
        steps,
        { ...pass, steps: pass.steps.slice(0, 1) },
        "verified",
      ),
    ).toThrow(/every reproduction step/);
    expect(() =>
      evaluateReplay(
        steps,
        { ...pass, steps: [pass.steps[0], pass.steps[0]] },
        "verified",
      ),
    ).toThrow(/every reproduction step/);
    expect(() =>
      evaluateReplay(
        steps,
        {
          ...pass,
          steps: [
            { ...pass.steps[0], result: "Fail", comment: "Error shown" },
            pass.steps[1],
          ],
        },
        "verified",
      ),
    ).toThrow(/step 1 failed/);
  });
  it("rejects Yes and provides an editable reopen reason from failures", () => {
    expect(() =>
      evaluateReplay(steps, { ...pass, problemOccurs: "Yes" }, "verified"),
    ).toThrow(/still occurs/);
    const replay = {
      steps: [
        pass.steps[0],
        { ...pass.steps[1], result: "Fail" as const, comment: "Error shown" },
      ],
      problemOccurs: "Yes" as const,
      finalComment: "Still broken",
    };
    expect(suggestReopenReason(steps, replay)).toBe(
      "Step 2 failed: Error shown; Original problem still occurs: Still broken",
    );
    expect(evaluateReplay(steps, replay, "reopened").reason).toBe(
      suggestReopenReason(steps, replay),
    );
    expect(() => evaluateReplay(steps, pass, "reopened")).toThrow(
      /requires a failed step/,
    );
  });
});
