import { join } from "node:path";
import PDFDocument from "pdfkit";
import { evaluate, type CompletenessInput } from "./completeness";

export type ReportData = CompletenessInput & {
  bugId: string;
  projectName: string;
  status: string;
  envType?: string | null;
  osVersion?: string | null;
  reporterName: string;
  createdAt: Date;
  generatedAt: Date;
  generatedBy: string;
  rootCauseCategory?: string | null;
  resolutionSummary?: string | null;
  fixReference?: string | null;
  reproducedByDev?: string | null;
  fixedAt?: Date | null;
  verifiedAt?: Date | null;
  notes: { type: string; body: string; author: string; createdAt: Date }[];
  history: {
    fromStatus: string;
    toStatus: string;
    actor: string;
    comment?: string | null;
    createdAt: Date;
  }[];
};

const when = (date?: Date | null) =>
  date
    ? date.toISOString().replace("T", " ").slice(0, 16) + " UTC"
    : "Not recorded";
const value = (text?: string | null) => text?.trim() || "Not supplied";
const duration = (from: Date, to: Date) =>
  `${Math.max(0, (to.getTime() - from.getTime()) / 3_600_000).toFixed(1)} hours`;
const font = join(process.cwd(), "assets", "fonts", "DejaVuSans.ttf");
const bold = join(process.cwd(), "assets", "fonts", "DejaVuSans-Bold.ttf");

export async function generateReport(report: ReportData): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 48, right: 48, bottom: 70, left: 48 },
    bufferPages: true,
    compress: false,
    info: { Title: `${report.bugId}: ${report.title}`, Subject: report.bugId },
  });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  doc
    .registerFont("body", font)
    .registerFont("bold", bold)
    .font("body")
    .fontSize(10);
  const line = (label: string, content?: string | null, tone?: string) => {
    doc
      .font("bold")
      .text(`${label}: `, { continued: true })
      .font("body")
      .fillColor(tone ?? "#27314c")
      .text(value(content));
    doc.fillColor("#27314c");
    doc.moveDown(0.3);
  };
  const section = (heading: string) => {
    if (doc.y > 690) doc.addPage();
    doc
      .moveDown(0.8)
      .font("bold")
      .fontSize(13)
      .fillColor("#4530a0")
      .text(heading)
      .moveDown(0.4)
      .font("body")
      .fontSize(10)
      .fillColor("#27314c");
  };
  doc.rect(0, 0, 595, 35).fill("#282264");
  doc
    .font("bold")
    .fontSize(10)
    .fillColor("#ffffff")
    .text("TRACEBACK  /  INVESTIGATION REPORT", 48, 12, { lineBreak: false });
  doc
    .font("bold")
    .fontSize(18)
    .fillColor("#25215e")
    .text(`${report.bugId}: ${report.title}`)
    .fontSize(10)
    .fillColor("#27314c")
    .moveDown(0.5);
  line("Project", report.projectName);
  line(
    "Severity",
    report.severity,
    (
      {
        Critical: "#a52035",
        High: "#a34811",
        Medium: "#835700",
        Low: "#415168",
      } as Record<string, string>
    )[report.severity ?? ""],
  );
  line(
    "Status",
    report.status,
    (
      {
        Submitted: "#59677e",
        Investigating: "#245aa4",
        Fixed: "#7243a4",
        Verified: "#16734c",
      } as Record<string, string>
    )[report.status],
  );
  line("Reporter", report.reporterName);
  line("Created", when(report.createdAt));

  section("Summary and environment");
  line("Context", report.extraContext);
  line("Environment", report.envType);
  line("OS", [report.osName, report.osVersion].filter(Boolean).join(" "));
  line("Browser or device", report.browserOrDevice);
  line("App version", report.appVersion);
  line("Reproducibility", report.reproducibility);

  section("Reproduction steps");
  if (!report.steps?.length) doc.text("No steps supplied.");
  else
    report.steps.forEach((step, index) =>
      doc
        .text(
          `${index + 1}. ${typeof step === "string" ? step : step.instruction}`,
          { indent: 12 },
        )
        .moveDown(0.3),
    );

  section("Expected versus actual");
  line("Expected", report.expectedBehaviour);
  line("Actual", report.actualBehaviour);

  section("Completeness");
  const result = evaluate(report);
  line("Score", `${result.score}/100 (${result.level})`);
  if (!result.missing.length) doc.text("No outstanding gaps.");
  else
    result.missing.forEach((gap) =>
      doc.text(`${gap.rule}: ${gap.suggestion}`, { indent: 12 }).moveDown(0.2),
    );

  section("Investigation notes");
  if (!report.notes.length) doc.text("No notes.");
  const groups = Map.groupBy(report.notes, (note) => note.type);
  for (const [type, notes] of groups) {
    doc.font("bold").text(type).font("body");
    for (const note of notes)
      doc
        .text(`${note.author}, ${when(note.createdAt)}: ${note.body}`, {
          indent: 12,
        })
        .moveDown(0.4);
  }

  section("Resolution");
  line("Root cause", report.rootCauseCategory);
  line("Resolution", report.resolutionSummary);
  line("Fix reference", report.fixReference);
  line("Reproduced by developer", report.reproducedByDev);

  section("Status history");
  let enteredAt = report.createdAt;
  for (const change of report.history) {
    doc
      .text(
        `${change.fromStatus}: ${duration(enteredAt, change.createdAt)}; ${change.toStatus} by ${change.actor} at ${when(change.createdAt)}${change.comment ? ` — ${change.comment}` : ""}`,
      )
      .moveDown(0.35);
    enteredAt = change.createdAt;
  }
  doc.text(
    `${report.status}: ${duration(enteredAt, report.generatedAt)} as of generation.`,
  );

  section("Verification record");
  const verification = [...report.history]
    .reverse()
    .find((change) => change.toStatus === "Verified");
  line(
    "Verified by",
    report.status === "Verified" ? verification?.actor : null,
  );
  line(
    "Verified at",
    report.status === "Verified"
      ? when(report.verifiedAt ?? verification?.createdAt)
      : null,
  );

  const range = doc.bufferedPageRange();
  for (let page = range.start; page < range.start + range.count; page++) {
    doc.switchToPage(page);
    doc.page.margins.bottom = 0;
    doc
      .font("body")
      .fontSize(8)
      .text(
        `Generated ${when(report.generatedAt)} by ${report.generatedBy}  •  Page ${page + 1} of ${range.count}`,
        48,
        795,
        { width: 500, align: "center", lineBreak: false },
      );
  }
  doc.end();
  return done;
}
