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
  await developer
    .locator('select[name="assigneeId"]')
    .selectOption({ label: "Demo Developer 1" });
  await developer.getByRole("button", { name: "Assign", exact: true }).click();
  await expect(
    developer.getByText("Assigned to Demo Developer 1", { exact: true }),
  ).toBeVisible();
  await expect(developer.getByText("Edit", { exact: true })).toHaveCount(1);
  await developer.getByRole("button", { name: "Update status" }).click();
  await expect(developer.locator("main > p").first()).toContainText(
    "Investigating",
  );
  await developer.getByLabel("Resolution summary").fill("Corrected save state");
  await developer.getByRole("button", { name: "Update status" }).click();
  await expect(developer.locator("main > p").first()).toContainText("Fixed");

  await tester.goto(bugUrl);
  await tester.getByRole("button", { name: "Verify", exact: true }).click();
  await expect(tester.getByText("0 of 2 steps checked")).toBeVisible();
  await tester
    .getByRole("group", { name: "Step 1: Open the report" })
    .getByRole("radio", { name: "Pass" })
    .check();
  await tester
    .getByRole("group", { name: "Step 2: Press save" })
    .getByRole("radio", { name: "Fail" })
    .check();
  await tester
    .getByRole("group", { name: "Step 2: Press save" })
    .getByRole("textbox", { name: "Comment (optional)" })
    .fill("The error still occurs");
  await tester
    .getByRole("group", { name: "Does the original problem still occur?" })
    .getByRole("radio", { name: "Yes" })
    .check();
  await expect(tester.getByText("2 of 2 steps checked")).toBeVisible();
  await expect(tester.getByLabel("Reopen reason")).toHaveValue(
    "Step 2 failed: The error still occurs; Original problem still occurs",
  );
  await tester
    .getByLabel("Reopen reason")
    .fill("Step 2 failed: The error still occurs");
  await tester.getByRole("button", { name: "Reopen", exact: true }).click();
  await expect(
    tester.getByText("Step 2 failed: The error still occurs").first(),
  ).toBeVisible();
  await developer.reload();
  await developer
    .getByLabel("Resolution summary")
    .fill("Corrected save state again");
  await developer.getByRole("button", { name: "Update status" }).click();
  await tester.reload();
  await tester.getByRole("button", { name: "Verify", exact: true }).click();
  await tester
    .getByRole("group", { name: "Step 1: Open the report" })
    .getByRole("radio", { name: "Pass" })
    .check();
  await tester
    .getByRole("group", { name: "Step 2: Press save" })
    .getByRole("radio", { name: "Pass" })
    .check();
  await tester
    .getByRole("group", { name: "Does the original problem still occur?" })
    .getByRole("radio", { name: "No" })
    .check();
  await tester.getByRole("button", { name: "Save verification" }).click();
  await expect(tester.locator("main > p").first()).toContainText("Verified");
  await expect(
    tester.getByText("Verification passed: 2/2 steps").first(),
  ).toBeVisible();
  await expect(tester.getByText("Earlier attempts (1)")).toBeVisible();
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
