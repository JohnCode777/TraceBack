export type CompletenessInput = {
  title?: string | null;
  severity?: string | null;
  areaId?: string | null;
  osName?: string | null;
  browserOrDevice?: string | null;
  appVersion?: string | null;
  steps?: readonly ({ instruction: string } | string)[] | null;
  expectedBehaviour?: string | null;
  actualBehaviour?: string | null;
  reproducibility?: string | null;
  extraContext?: string | null;
};

export type CompletenessLevel = "Incomplete" | "Acceptable" | "Strong";
export type CompletenessGap = { rule: string; suggestion: string };

export function levelForScore(score: number): CompletenessLevel {
  if (score < 70) return "Incomplete";
  if (score < 90) return "Acceptable";
  return "Strong";
}

const filled = (value?: string | null) => Boolean(value?.trim());
const genericTitles = new Set(["bug", "not working", "broken"]);
const vaguePattern =
  /\bdoesn['’]t work\b|\betc\.|\bas usual\b|\bsame as before\b/i;
const evidencePattern =
  /(?:https?:\/\/\S+|\b(?:error|exception|stack trace|log(?:s)?|traceback)\b)/i;

export function evaluate(bug: CompletenessInput): {
  score: number;
  level: CompletenessLevel;
  missing: CompletenessGap[];
  warnings: string[];
} {
  let score = 0;
  const missing: CompletenessGap[] = [];
  const rule = (
    name: string,
    points: number,
    passes: boolean,
    suggestion: string,
  ) => {
    if (passes) score += points;
    else missing.push({ rule: name, suggestion });
  };
  const title = bug.title?.trim() ?? "";
  const expected = bug.expectedBehaviour?.trim() ?? "";
  const actual = bug.actualBehaviour?.trim() ?? "";
  rule(
    "Descriptive title",
    10,
    title.length >= 10 && !genericTitles.has(title.toLowerCase()),
    "Use a specific title of at least 10 characters.",
  );
  rule("Severity set", 5, filled(bug.severity), "Choose a severity.");
  rule("Area set", 5, filled(bug.areaId), "Choose an area.");
  rule(
    "Environment complete",
    20,
    filled(bug.osName) && filled(bug.browserOrDevice) && filled(bug.appVersion),
    "Add OS, browser or device, and app version.",
  );
  rule(
    "Reproduction steps",
    25,
    (bug.steps?.length ?? 0) >= 2 &&
      Boolean(
        bug.steps?.every(
          (step) =>
            (typeof step === "string" ? step : step.instruction).trim()
              .length >= 5,
        ),
      ),
    "Add at least two steps, each at least five characters.",
  );
  rule(
    "Expected behaviour",
    10,
    expected.length >= 15,
    "Describe the expected behaviour in at least 15 characters.",
  );
  rule(
    "Actual behaviour",
    10,
    actual.length >= 15,
    "Describe the actual behaviour in at least 15 characters.",
  );
  rule(
    "Expected differs from actual",
    5,
    Boolean(
      expected && actual && expected.toLowerCase() !== actual.toLowerCase(),
    ),
    "Explain how the actual result differs from the expected result.",
  );
  rule(
    "Reproducibility stated",
    5,
    filled(bug.reproducibility),
    "Choose how often the bug occurs.",
  );
  rule(
    "Evidence for High/Critical",
    5,
    ["Medium", "Low"].includes(bug.severity ?? "") ||
      (filled(bug.severity) && evidencePattern.test(bug.extraContext ?? "")),
    "Add a link, error text, or logs for a High or Critical bug.",
  );
  const warnings = [title, expected, actual, bug.extraContext ?? ""]
    .filter((value) => vaguePattern.test(value))
    .map(() => "Replace vague phrases with specific actions and results.");
  return {
    score,
    level: levelForScore(score),
    missing,
    warnings: [...new Set(warnings)],
  };
}
