import path from "node:path";

import { expect, test } from "@playwright/test";

import { seedFamily } from "@/tests/e2e/helpers";

const SAMPLE_IMAGE_PATH = path.join(process.cwd(), "public", "icon-192.png");

test.describe.configure({ timeout: 180_000 });
test.beforeEach(async ({ page }) => {
  await seedFamily(page);
});

test("双标签实时同步清单、宝宝记录和物品照片", async ({
  context,
  page,
}) => {
  const otherPage = await context.newPage();
  const itemName = `双标签物品-${test.info().project.name}`;

  try {
    await page.goto("/checklist/mom", { waitUntil: "domcontentloaded" });
    await otherPage.goto("/checklist/mom", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: "新增物品" })).toBeVisible({
      timeout: 60_000,
    });
    await expect(
      otherPage.getByRole("button", { name: "新增物品" }),
    ).toBeVisible({ timeout: 60_000 });
    await page.waitForTimeout(1_500);

    await page.getByRole("button", { name: "新增物品" }).click();
    await page.locator("#add-item-name").fill(itemName);
    await page.getByRole("button", { name: "加入清单" }).click();

    const itemCard = page.locator("article").filter({ hasText: itemName });
    const otherItemCard = otherPage
      .locator("article")
      .filter({ hasText: itemName });
    // WebKit heavily throttles background tabs on shared CI runners. Bring the
    // receiver forward before checking the retained cross-tab signal.
    await otherPage.bringToFront();
    await expect(otherItemCard).toHaveCount(1, { timeout: 60_000 });
    // Cards use content-visibility:auto. A synchronized custom item can be at
    // the end of the long list and is intentionally not painted until scrolled
    // near the viewport, so assert DOM arrival before checking visibility.
    await otherItemCard.scrollIntoViewIfNeeded();
    await expect(
      otherItemCard.getByRole("heading", { name: itemName, exact: true }),
    ).toBeVisible();
    await page.bringToFront();
    await itemCard.getByRole("button", { name: "详情" }).click();
    await otherPage.bringToFront();
    await otherItemCard.getByRole("button", { name: "详情" }).click();
    await page.bringToFront();
    await page
      .locator('input[aria-label="从相册选择物品照片"]')
      .setInputFiles(SAMPLE_IMAGE_PATH);
    await otherPage.bringToFront();
    await expect(
      otherPage.getByRole("img", { name: `${itemName}的物品照片` }),
    ).toBeVisible({ timeout: 60_000 });
    await page.keyboard.press("Escape");
    await otherPage.keyboard.press("Escape");

    await page.goto("/baby", { waitUntil: "domcontentloaded" });
    await otherPage.goto("/baby", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("button", { name: "宝宝已出生，开始记录" }),
    ).toBeVisible();
    await expect(
      otherPage.getByRole("button", { name: "宝宝已出生，开始记录" }),
    ).toBeVisible();
    await page.bringToFront();
    await page.getByRole("button", { name: "宝宝已出生，开始记录" }).click();
    await page.locator("#baby-profile-nickname").fill("双标签宝宝");
    await page.locator("#baby-profile-birthDate").fill("2026-08-01");
    await page.getByRole("button", { name: "保存资料" }).click();
    await otherPage.bringToFront();
    await expect(
      otherPage.getByRole("heading", { name: "双标签宝宝", exact: true }),
    ).toBeVisible({ timeout: 60_000 });

    await page.bringToFront();
    await page
      .getByRole("region", { name: "快速记录" })
      .getByRole("button", { name: "瓶喂", exact: true })
      .click();
    await page.locator("#baby-care-amount").fill("66");
    await page.getByRole("button", { name: "保存瓶喂记录" }).click();
    await otherPage.bringToFront();
    await expect(
      otherPage.getByText("66 ml", { exact: false }).first(),
    ).toBeVisible({ timeout: 60_000 });
  } finally {
    await otherPage.close();
  }
});
