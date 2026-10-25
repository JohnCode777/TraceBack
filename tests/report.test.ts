import { describe, expect, it } from "vitest";
import { generateReport, type ReportData } from "../src/lib/report";

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
});
