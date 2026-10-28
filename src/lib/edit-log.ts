export type EditChange = { field: string; before: unknown; after: unknown };

export function isEditLog(body: string) {
  return body.startsWith("[Edit log]");
}

export function parseEditLog(body: string): EditChange[] {
  if (!isEditLog(body)) return [];
  return body
    .slice("[Edit log]".length)
    .trim()
    .split("\n")
    .flatMap((line) => {
      const separator = line.indexOf(": ");
      if (separator < 1) return [];
      const field = line.slice(0, separator);
      const values = line.slice(separator + 2);
      for (
        let arrow = values.indexOf(" → ");
        arrow !== -1;
        arrow = values.indexOf(" → ", arrow + 3)
      ) {
        try {
          const before = JSON.parse(values.slice(0, arrow)) as unknown;
          const after = JSON.parse(values.slice(arrow + 3)) as unknown;
          if (JSON.stringify(before) === JSON.stringify(after)) return [];
          return [
            {
              field,
              before,
              after,
            },
          ];
        } catch {
          // An arrow may be part of a quoted value; try the next one.
        }
      }
      return [];
    });
}

const fieldNames: Record<string, string> = {
  title: "Title",
  severity: "Severity",
  reproducibility: "Reproducibility",
  areaId: "Area",
  osName: "OS name",
  osVersion: "OS version",
  browserOrDevice: "Browser or device",
  appVersion: "App version",
  envType: "Environment type",
  expectedBehaviour: "Expected behaviour",
  actualBehaviour: "Actual behaviour",
  extraContext: "Extra context",
  steps: "Reproduction steps",
  resolutionSummary: "Resolution summary",
  rootCauseCategory: "Root cause category",
  reproducedByDev: "Reproduced by developer",
  fixReference: "Fix reference",
};

type Names = {
  users: ReadonlyMap<string, string>;
  areas: ReadonlyMap<string, string>;
};

function valueName(field: string, value: unknown, names: Names) {
  if (value === null || value === undefined || value === "") return "not set";
  if (field === "assigneeId")
    return typeof value === "string"
      ? (names.users.get(value) ?? "a former project member")
      : "a former project member";
  if (field === "areaId")
    return typeof value === "string"
      ? (names.areas.get(value) ?? "a former area")
      : "a former area";
  if (Array.isArray(value))
    return `${value.length} ${value.length === 1 ? "step" : "steps"}`;
  return String(value);
}

export function describeEditChanges(
  changes: readonly EditChange[],
  names: Names,
) {
  if (changes.length === 0) return ["Report details updated"];
  return changes.map(({ field, before, after }) => {
    const oldValue = valueName(field, before, names);
    const newValue = valueName(field, after, names);
    if (field === "assigneeId") {
      if (after === null) return `Unassigned from ${oldValue}`;
      if (before === null) return `Assigned to ${newValue}`;
      return `Assignment changed from ${oldValue} to ${newValue}`;
    }
    const label = fieldNames[field] ?? "Report detail";
    if (before === null) return `${label} set to ${newValue}`;
    if (after === null) return `${label} cleared (was ${oldValue})`;
    return `${label} changed from ${oldValue} to ${newValue}`;
  });
}
