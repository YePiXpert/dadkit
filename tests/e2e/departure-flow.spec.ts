import { expect, test } from "@playwright/test";
import {
  expectOnlyPrimaryNavigationItemActive,
  seedCompletedOnboarding,
} from "@/tests/e2e/helpers";

test.describe.configure({ timeout: 120_000 });
test.beforeEach(async ({ page }) => { await seedCompletedOnboarding(page); });

function remainingCount(page: import("@playwright/test").Page) {
  return page.locator("#departure-remaining-count").evaluate((element) => {
    const match = element.textContent?.match(/剩余\s+(\d+)\s+项/);
    return match ? Number(match[1]) : 0;
  });
}

test("可单项和整组确认，刷新保持同一状态", async ({
  page,
}) => {
  await page.goto("/departure", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "准备出发" })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByRole("heading", { name: "证件资料" })).toBeVisible();

  const beforeSingle = await remainingCount(page);
  const confirmOne = page.getByRole("button", { name: /标记已确认/ }).first();
  await expect(confirmOne).toBeVisible();
  await confirmOne.click();
  await expect.poll(() => remainingCount(page)).toBe(beforeSingle - 1);

  const group = page
    .locator('section[aria-labelledby^="departure-group-"]')
    .filter({ has: page.getByRole("button", { name: "本组全部确认" }) })
    .first();
  const groupLabelId = await group.getAttribute("aria-labelledby");
  const stableGroup = page.locator(
    `section[aria-labelledby="${groupLabelId}"]`,
  );
  await group.getByRole("button", { name: "本组全部确认" }).click();
  await page.getByRole("button", { name: "确认本组项目" }).click();
  await expect(
    stableGroup.getByRole("button", { name: "本组全部确认" }),
  ).toHaveCount(0);

  const remainingAfterBatch = await remainingCount(page);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect.poll(() => remainingCount(page)).toBe(remainingAfterBatch);
});

test("可以直接访问准备出发页面", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/departure", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "准备出发" })).toBeVisible({
    timeout: 60_000,
  });
  await expect(
    page.getByRole("progressbar", { name: /出发物品确认/ }),
  ).toBeVisible();
  const firstItem = page
    .locator('section[aria-labelledby^="departure-group-"] article')
    .first();
  await expect(firstItem).toBeVisible();
  const firstItemBox = await firstItem.boundingBox();
  expect(firstItemBox?.height).toBeLessThan(120);
  await expectOnlyPrimaryNavigationItemActive(page, "我的");
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
});
