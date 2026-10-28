import { describe, expect, it } from "vitest";
import {
  generateReport,
  investigationNotes,
  verificationReportLines,
  type ReportData,
} from "../src/lib/report";

export const report: ReportData = {
  bugId: "TB-142",
  projectName: "TraceBack Demo",
  title: "Search fails for café and naïve queries",
  severity: "High",
  status: "Verified",
  areaId: "a1",
  osName: "macOS",
  osVersion: "14",
  browserOrDevice: "Safari",
  appVersion: "1.0",
  envType: "Staging",
  reproducibility: "Always",
  steps: ["Open the search screen", "Search for café", "Read the result list"],
  expectedBehaviour: "The matching item is shown.",
  actualBehaviour: "The matching item is missing.",
  extraContext: `Error log: https://example.test/bug\n${"Long context with non-ASCII café naïve. ".repeat(500)}`,
  reporterName: "Test Reporter",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  generatedAt: new Date("2026-01-04T00:00:00Z"),
  generatedBy: "Test Admin",
  rootCauseCategory: "Logic error",
  resolutionSummary: "Fixed Unicode matching.",
  fixReference: "PR-123",
  reproducedByDev: "Yes",
  fixedAt: new Date("2026-01-02T00:00:00Z"),
  verifiedAt: new Date("2026-01-03T00:00:00Z"),
  notes: [
    {
      type: "Observation",
      body: "Café query fails. ".repeat(100),
      author: "Developer",
      createdAt: new Date("2026-01-01T02:00:00Z"),
    },
  ],
  history: [
    {
      fromStatus: "Submitted",
      toStatus: "Investigating",
      actor: "Developer",
      createdAt: new Date("2026-01-01T01:00:00Z"),
    },
    {
      fromStatus: "Investigating",
      toStatus: "Fixed",
      actor: "Developer",
      createdAt: new Date("2026-01-02T00:00:00Z"),
    },
    {
      fromStatus: "Fixed",
      toStatus: "Verified",
      actor: "Tester",
      createdAt: new Date("2026-01-03T00:00:00Z"),
    },
  ],
};

describe("PDF generation", () => {
  it("creates a multi-page PDF with a valid header and bug ID", async () => {
    const pdf = await generateReport(report);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(5_000);
    expect(pdf.includes(Buffer.from("TB-142"))).toBe(true);
    expect(
      (pdf.toString("latin1").match(/\/Type \/Page\b/g) ?? []).length,
    ).toBeGreaterThan(1);
  });
  it("keeps a short report on one page", async () => {
    const pdf = await generateReport({
      ...report,
      extraContext: "Error log: café",
      notes: [],
      history: [],
      status: "Submitted",
    });
    expect(
      (pdf.toString("latin1").match(/\/Type \/Page\b/g) ?? []).length,
    ).toBe(1);
  });
  it("keeps edit logs out of Investigation notes", () => {
    const edit = {
      type: "Observation",
      body: '[Edit log]\nassigneeId: null → "seed-user-developer-1"',
      author: "Developer",
      createdAt: new Date("2026-01-01T03:00:00Z"),
    };
    const groups = investigationNotes([...report.notes, edit]);
    expect(groups.get("Observation")).toEqual(report.notes);
    expect(investigationNotes([edit]).size).toBe(0);
  });
  it("embeds verification labels without optional fi ligatures", async () => {
    const pdf = await generateReport({
      ...report,
      extraContext: "Extra context fixture",
      notes: [],
    });
    expect(pdf.toString("latin1")).not.toContain("<0066 0069>");
  });
  it("includes every checklist attempt and a legacy fallback in the PDF section", async () => {
    const attempts: NonNullable<ReportData["verificationAttempts"]> = [
      {
        verifierName: "Test Reporter",
        createdAt: new Date("2026-01-03T00:00:00Z"),
        outcome: "verified",
        problemOccurs: "No",
        finalComment: "Gone",
        steps: [
          {
            position: 1,
            instruction: "Open search",
            result: "Pass",
            comment: "Loaded",
          },
        ],
      },
      {
        verifierName: "Test Reporter",
        createdAt: new Date("2026-01-02T00:00:00Z"),
        outcome: "reopened",
        problemOccurs: "Yes",
        finalComment: "Still missing",
        steps: [
          {
            position: 1,
            instruction: "Open search",
            result: "Fail",
            comment: "Missing",
          },
        ],
      },
    ];
    expect(verificationReportLines(attempts)).toEqual(
      expect.arrayContaining([
        "Verification passed: 1/1 steps",
        "Verification failed: step 1",
        "Verifier: Test Reporter",
        "Time: 2026-01-03 00:00 UTC",
        "Step 1: Open search — Pass; Loaded",
        "Step 1: Open search — Fail; Missing",
        "Does the original problem still occur? No — Gone",
        "Does the original problem still occur? Yes — Still missing",
      ]),
    );
    expect(verificationReportLines([])).toEqual(["No checklist recorded"]);
    for (const verificationAttempts of [attempts, []]) {
      const pdf = await generateReport({
        ...report,
        extraContext: "Short context",
        notes: [],
        verificationAttempts,
      });
      expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
      expect(pdf.length).toBeGreaterThan(5_000);
    }
  });
});
