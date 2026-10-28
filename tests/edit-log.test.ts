import { describe, expect, it } from "vitest";
import { describeEditChanges, parseEditLog } from "../src/lib/edit-log";

const names = {
  users: new Map([["developer-1", "Demo Developer 1"]]),
  areas: new Map([["area-1", "Testing"]]),
};

describe("edit log presentation", () => {
  it("shows field labels and names instead of stored IDs", () => {
    const changes = parseEditLog(
      '[Edit log]\nassigneeId: null → "developer-1"\nseverity: "Medium" → "High"\nareaId: null → "area-1"',
    );
    expect(describeEditChanges(changes, names)).toEqual([
      "Assigned to Demo Developer 1",
      "Severity changed from Medium to High",
      "Area set to Testing",
    ]);
  });

  it("handles prior assignees and an arrow inside a quoted value", () => {
    const changes = parseEditLog(
      '[Edit log]\nassigneeId: "developer-1" → null\ntitle: "Open → Save" → "Save fails"',
    );
    expect(describeEditChanges(changes, names)).toEqual([
      "Unassigned from Demo Developer 1",
      "Title changed from Open → Save to Save fails",
    ]);
  });

  it("never displays raw IDs when an old name is unavailable", () => {
    expect(
      describeEditChanges(
        parseEditLog('[Edit log]\nassigneeId: "former-id" → "developer-1"'),
        names,
      ),
    ).toEqual([
      "Assignment changed from a former project member to Demo Developer 1",
    ]);
  });

  it("omits historical changes with identical values", () => {
    expect(
      parseEditLog('[Edit log]\nassigneeId: "developer-1" → "developer-1"'),
    ).toEqual([]);
  });
});
