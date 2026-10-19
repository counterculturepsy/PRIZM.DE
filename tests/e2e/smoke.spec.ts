import { expect, test } from "@playwright/test";

test("landing page is reachable and honest about the current milestone", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Find your next client");
  await expect(page.getByText(/campaign preparation, unsubscribe suppression, and a fail-closed delivery control plane are implemented; live providers and outbound automation remain disabled/i)).toBeVisible();
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

test("CRM routes remain protected", async ({ page }) => {
  await page.goto("/app/crm/pipeline");
  await expect(page).toHaveURL(/\/login$/);
});

test("AI draft and policy routes remain protected", async ({ page }) => {
  for (const route of ["/app/ai/strategy", "/app/ai/outreach", "/app/settings/ai"]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login$/);
  }
});

test("proposal routes remain protected", async ({ page }) => {
  await page.goto("/app/proposals");
  await expect(page).toHaveURL(/\/login$/);
});

test("campaign preparation routes remain protected", async ({ page }) => {
  for (const path of ["/app/campaigns", "/app/campaigns/templates", "/app/campaigns/sequences", "/app/campaigns/00000000-0000-4000-8000-000000000001"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
  }
});

test("unsubscribe confirmation and result screens are public and non-sensitive", async ({ page }) => {
  const token = `00000000-0000-4000-8000-000000000001.${"a".repeat(43)}`;
  await page.goto(`/unsubscribe/${token}`);
  await expect(page.getByRole("heading", { name: "Stop campaign email" })).toBeVisible();
  await expect(page.getByText(/does not expose your address/i)).toBeVisible();
  await page.goto("/unsubscribe/complete");
  await expect(page.getByRole("heading", { name: "Unsubscribed" })).toBeVisible();
});
