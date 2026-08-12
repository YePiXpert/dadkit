import { expect, test } from "@playwright/test";

import { seedCompletedOnboarding } from "@/tests/e2e/helpers";

test.beforeEach(async ({ page }) => {
  await seedCompletedOnboarding(page);
});

test("跟随系统时实时切换页面深浅色", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/settings", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "跟随系统", exact: true }).click();
  await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);

  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);

  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
});
