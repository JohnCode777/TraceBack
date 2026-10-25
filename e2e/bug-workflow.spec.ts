import { expect, test, type Page } from "@playwright/test";

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

test("bug goes through investigation, fix, reopen, verification and regression", async ({
  browser,
}) => {
  const testerContext = await browser.newContext();
  const developerContext = await browser.newContext();
  const tester = await testerContext.newPage();
  const developer = await developerContext.newPage();
  await login(tester, "tester1@example.test");
  await tester.goto("/projects/seed-project-traceback/bugs/new");
  const title = `Session 3 browser flow ${Date.now()}`;
  await tester.getByLabel("Title").fill(title);
  await tester.getByLabel("Step 1").fill("Open the report");
  await tester.getByRole("button", { name: "Add step" }).click();
  await tester.getByLabel("Step 2").fill("Press save");
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
  await tester.getByLabel("Comment or reason").fill("Regression after release");
  await tester.getByRole("button", { name: "Update status" }).click();
  await expect(tester.getByText("Regression after release")).toBeVisible();
  await expect(tester.getByText("Reopened 2 times")).toBeVisible();
  await testerContext.close();
  await developerContext.close();
});
