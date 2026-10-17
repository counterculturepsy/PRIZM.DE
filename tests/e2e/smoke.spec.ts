import { expect, test } from "@playwright/test";

test("landing page is reachable and honest about the current milestone", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Find your next client");
  await expect(page.getByText(/controlled discovery, audit queues, and deterministic opportunity scoring are implemented; external providers, production audit processing, and sales automation remain disabled by default/i)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("health endpoint exposes no environment details", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBeTruthy();
  expect(await response.json()).toEqual({ status: "ok", service: "prizm-web" });
});

test("protected application redirects unauthenticated users", async ({ page }) => {
  await page.goto("/app");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: /sign in to your workspace/i })).toBeVisible();
});

test("opportunity feed remains protected", async ({ page }) => {
  await page.goto("/app/discover/opportunities");
  await expect(page).toHaveURL(/\/login$/);
});
