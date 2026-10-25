import { describe, expect, it } from "vitest";
import {
  evaluate,
  levelForScore,
  type CompletenessInput,
} from "../src/lib/completeness";

export const good: CompletenessInput = {
  title: "Search results omit matching issue",
  severity: "High",
  areaId: "area-1",
  osName: "Windows 11",
  browserOrDevice: "Chrome",
  appVersion: "1.2.0",
  steps: ["Open the search page", "Search for a known issue"],
  expectedBehaviour: "The matching issue appears.",
  actualBehaviour: "The matching issue is absent.",
  reproducibility: "Always",
  extraContext: "Error log: https://example.test/report",
};

export const mediocre: CompletenessInput = {
  ...good,
  appVersion: null,
  extraContext: "No evidence yet",
};

export const terrible: CompletenessInput = {
  title: "bug",
  severity: null,
  areaId: null,
  osName: null,
  browserOrDevice: null,
  appVersion: null,
  steps: ["x"],
  expectedBehaviour: "It works",
  actualBehaviour: "It works",
  reproducibility: null,
  extraContext: null,
};

describe("completeness", () => {
  it("scores good, mediocre and terrible reports", () => {
    expect(evaluate(good)).toMatchObject({
      score: 100,
      level: "Strong",
      missing: [],
    });
    expect(evaluate(mediocre)).toMatchObject({
      score: 75,
      level: "Acceptable",
    });
    expect(evaluate(terrible)).toMatchObject({ score: 0, level: "Incomplete" });
  });

  const failures: [string, Partial<CompletenessInput>][] = [
    ["Descriptive title", { title: "broken" }],
    ["Severity set", { severity: null }],
    ["Area set", { areaId: null }],
    ["Environment complete", { appVersion: " " }],
    ["Reproduction steps", { steps: ["Short"] }],
    ["Expected behaviour", { expectedBehaviour: "short" }],
    ["Actual behaviour", { actualBehaviour: "short" }],
    [
      "Expected differs from actual",
      { actualBehaviour: good.expectedBehaviour },
    ],
    ["Reproducibility stated", { reproducibility: null }],
    ["Evidence for High/Critical", { extraContext: "Nothing attached" }],
  ];
  it.each(failures)("passes and fails %s", (name, override) => {
    expect(evaluate(good).missing.some((gap) => gap.rule === name)).toBe(false);
    const result = evaluate({ ...good, ...override });
    expect(
      result.missing.find((gap) => gap.rule === name)?.suggestion,
    ).toBeTruthy();
    expect(result.score).toBeLessThan(100);
  });

  it.each([
    [69, "Incomplete"],
    [70, "Acceptable"],
    [89, "Acceptable"],
    [90, "Strong"],
  ] as const)("classifies the boundary score %i as %s", (score, level) => {
    expect(levelForScore(score)).toBe(level);
  });

  it.each(["doesn't work", "etc.", "as usual", "same as before"])(
    "warns about %s without changing the score",
    (phrase) => {
      const result = evaluate({
        ...good,
        extraContext: `${good.extraContext} ${phrase}`,
      });
      expect(result.score).toBe(100);
      expect(result.warnings).toHaveLength(1);
    },
  );
});
