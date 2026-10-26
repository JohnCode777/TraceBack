import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("traceback-demo-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(
    page.getByRole("heading", { name: "Your projects" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      `Demo ${email.startsWith("tester") ? "Tester" : "Developer"} 1`,
    ),
  ).toBeVisible();
}

test("tester files, developer fixes, tester verifies and downloads a report", async ({
  browser,
}) => {
  const testerContext = await browser.newContext();
  const developerContext = await browser.newContext();
  const tester = await testerContext.newPage();
  const developer = await developerContext.newPage();
  tester.on("dialog", (dialog) => dialog.accept());
  developer.on("dialog", (dialog) => dialog.accept());
  await login(tester, "tester1@example.test");
  const formResponse = await tester.goto(
    "/projects/seed-project-traceback/bugs/new",
  );
  expect(formResponse?.headers()["x-content-type-options"]).toBe("nosniff");
  expect(formResponse?.headers()["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  await tester
    .getByRole("link", { name: "Tips for a good bug report" })
    .click();
  await expect(
    tester.getByRole("heading", { name: "How to write a good bug report" }),
  ).toBeVisible();
  await tester.goBack();
  const title = `Session 3 browser flow ${Date.now()}`;
  await tester.getByLabel("Title").fill(title);
  await tester
    .getByRole("textbox", { name: "Step 1", exact: true })
    .fill("Open the report");
  await tester.getByRole("button", { name: "Add step" }).click();
  await tester
    .getByRole("textbox", { name: "Step 2", exact: true })
    .fill("Press save");
  await tester.getByLabel("Expected behaviour").fill("The report is saved");
  await tester.getByLabel("Actual behaviour").fill("An error is shown");
  await tester.getByRole("button", { name: "Create bug" }).click();
  await expect(
    tester.getByRole("heading", { name: new RegExp(title) }),
  ).toBeVisible();
  const bugUrl = tester.url();

  await login(developer, "developer1@example.test");
  await developer.goto(bugUrl);
  await developer.getByRole("button", { name: "Update status" }).click();
  await expect(developer.locator("main > p").first()).toContainText(
    "Investigating",
  );
  await developer.getByLabel("Resolution summary").fill("Corrected save state");
  await developer.getByRole("button", { name: "Update status" }).click();
  await expect(developer.locator("main > p").first()).toContainText("Fixed");

  await tester.goto(bugUrl);
  await tester.getByLabel("Move to").selectOption("Investigating");
  await tester.getByLabel("Comment or reason").fill("The error still occurs");
  await tester.getByRole("button", { name: "Update status" }).click();
  await expect(tester.getByText("The error still occurs")).toBeVisible();
  await developer.reload();
  await developer
    .getByLabel("Resolution summary")
    .fill("Corrected save state again");
  await developer.getByRole("button", { name: "Update status" }).click();
  await tester.reload();
  await tester.getByRole("button", { name: "Update status" }).click();
  await expect(tester.locator("main > p").first()).toContainText("Verified");
  const downloadReady = tester.waitForEvent("download");
  await tester.getByRole("link", { name: "Download PDF report" }).click();
  const download = await downloadReady;
  expect(download.suggestedFilename()).toMatch(/^TB-\d+\.pdf$/);
  const pdf = await readFile(await download.path());
  expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  expect(pdf.length).toBeGreaterThan(5_000);
  await tester.getByLabel("Comment or reason").fill("Regression after release");
  await tester.getByRole("button", { name: "Update status" }).click();
  await expect(tester.getByText("Regression after release")).toBeVisible();
  await expect(tester.getByText("Reopened 2 times")).toBeVisible();
  await testerContext.close();
  await developerContext.close();
});
