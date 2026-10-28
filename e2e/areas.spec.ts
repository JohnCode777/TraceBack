import { randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";

test("admin creates a project with usable areas and manages an unused area", async ({
  page,
}) => {
  const key = `A${[...randomBytes(4)].map((byte) => String.fromCharCode(65 + (byte % 26))).join("")}`;
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin1@example.test");
  await page.getByLabel("Password").fill("traceback-demo-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("link", { name: "Create project" }).click();
  await page.getByLabel("Name").fill(`Area demo ${key}`);
  await page.getByLabel("Key (2–5 letters)").fill(key);
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(
    page.getByRole("heading", { name: `Area demo ${key}` }),
  ).toBeVisible();
  const projectId = new URL(page.url()).pathname.split("/").at(-1);
  expect(projectId).toBeTruthy();

  await page.getByRole("link", { name: "Project settings" }).click();
  await expect(page.getByRole("heading", { name: "Areas" })).toBeVisible();
  for (const name of ["General", "Setup", "Authentication", "Testing"])
    await expect(page.getByText(name, { exact: true })).toBeVisible();
  await page.getByLabel("Area name").fill("Documentation");
  await page.getByRole("button", { name: "Add area" }).click();
  await expect(page.getByText("Documentation", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Remove Documentation" }).click();
  await expect(page.getByText("Documentation", { exact: true })).toHaveCount(0);

  await page.goto(`/projects/${projectId}/bugs/new`);
  for (const name of ["General", "Setup", "Authentication", "Testing"])
    await expect(
      page.getByLabel("Area").getByRole("option", { name }),
    ).toHaveCount(1);
  await page.getByLabel("Title").fill("Fake setup flow shows an error");
  await page.getByLabel("Area").selectOption({ label: "General" });
  await page
    .getByRole("textbox", { name: "Step 1", exact: true })
    .fill("Open setup");
  await page.getByRole("button", { name: "Add step" }).click();
  await page
    .getByRole("textbox", { name: "Step 2", exact: true })
    .fill("Run demo action");
  await page
    .getByLabel("Expected behaviour")
    .fill("The fake setup action succeeds");
  await page
    .getByLabel("Actual behaviour")
    .fill("The fake setup action shows an error");
  await page.getByRole("button", { name: "Create bug" }).click();
  await expect(
    page.getByRole("heading", { name: /Fake setup flow/ }),
  ).toBeVisible();
  await page.goto(`/dashboard?project=${projectId}`);
  await expect(
    page.getByRole("heading", { name: "Top problem areas" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "90 days: 1" })).toBeVisible();
});
