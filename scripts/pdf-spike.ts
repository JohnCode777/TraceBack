import { createWriteStream } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import PDFDocument from "pdfkit";

const outputPath = process.argv[2] ?? join(tmpdir(), "traceback-spike.pdf");
const document = new PDFDocument({ size: "A4", margin: 50 });
const output = createWriteStream(outputPath);

document.pipe(output);
document
  .fontSize(20)
  .text("TB-142: Search results omit matching project issues");
document.moveDown().fontSize(11).text("Project: TraceBack Demo");
document.text("Severity: High | Status: Investigating");
document.moveDown().text("Steps to reproduce:");
document.text("1. Open the issue search screen.");
document.text("2. Enter a title known to exist in the project.");
document
  .moveDown()
  .text("Expected: The matching issue appears in the results.");
document.text("Actual: The result list is empty.");
document.end();

output.on("finish", () => console.log(`PDF spike written to ${outputPath}`));
output.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});
