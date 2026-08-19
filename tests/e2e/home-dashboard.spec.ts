import { expect, test, type Page } from "@playwright/test";

import {
  expectPathname,
  seedCompletedOnboarding,
} from "@/tests/e2e/helpers";

test.describe.configure({ timeout: 120_000 });
test.beforeEach(async ({ page }) => {
  await seedCompletedOnboarding(page);
});

function seedDueDate(daysUntilDue: number) {
  const due = new Date(Date.now() + daysUntilDue * 86_400_000);
  const dueDate = [
    due.getFullYear(),
    String(due.getMonth() + 1).padStart(2, "0"),
    String(due.getDate()).padStart(2, "0"),
  ].join("-");

  return async (page: Page) => {
    await page.addInitScript((value) => {
      window.localStorage.setItem(
        "dadkit-growth-profile-v1",
        JSON.stringify({ nickname: "", dueDate: value }),
      );
    }, dueDate);
  };
}

test("未设置预产期时首页显示引导态并可跳转成长记", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const entry = page.getByRole("link", { name: /宝宝现在多大了？/ });
  await expect(entry).toBeVisible({ timeout: 60_000 });
  await expect(entry).toContainText("设置预产期");

  await entry.click();
  await expectPathname(page, "/growth");
});

test("孕期中首页显示孕周状态头、宫格入口和进度卡", async ({ page }) => {
  await seedDueDate(84)(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page.getByText("孕 28 周", { exact: true })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByText("距预产期约 84 天")).toBeVisible();

  for (const name of [
    "待产包清单",
    "孕期成长记",
    "宝宝记录",
    "准备出发",
    "医院档案",
    "家庭分工",
  ]) {
    await expect(
      page.getByRole("link", { name: new RegExp(`^${name}(?:\\s|$)`) }),
    ).toBeVisible();
  }

  const progress = page.getByRole("link", { name: /准备进度/ });
  await expect(progress).toBeVisible();
  await expect(progress.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "0",
  );

  await page
    .getByRole("link", { name: /^待产包清单(?:\s|$)/ })
    .click();
  await expectPathname(page, "/checklist");
});

test("宝宝出生后首页切换为宝宝状态头", async ({ page }) => {
  await page.goto("/baby", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "宝宝记录", exact: true }),
  ).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "宝宝已出生，开始记录" }).click();
  await page.locator("#baby-profile-nickname").fill("E2E首页宝宝");
  await page.locator("#baby-profile-birthDate").fill("2026-08-01");
  await page.locator("#baby-profile-birthTime").fill("08:30");
  await page.getByRole("button", { name: "保存资料" }).click();
  await expect(
    page.getByRole("heading", { name: "E2E首页宝宝", exact: true }),
  ).toBeVisible();

  await page.goto("/", { waitUntil: "domcontentloaded" });
  const stageEntry = page.getByRole("link", { name: /出生第 \d+ 天/ });
  await expect(stageEntry).toBeVisible({ timeout: 60_000 });
  await expect(stageEntry).toContainText("E2E首页宝宝");

  await stageEntry.click();
  await expectPathname(page, "/baby");
});

test("清单页紧凑进度条、吸附筛选和物品状态流转", async ({ page }) => {
  const itemName = `E2E 状态流转 ${test.info().project.name}`;

  await page.goto("/checklist", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("progressbar", { name: /清单完成/ }),
  ).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/已装包 0 项/)).toBeVisible();

  await page.getByRole("button", { name: "新增物品" }).click();
  await page.locator("#add-item-name").fill(itemName);
  await page.getByRole("button", { name: "加入清单" }).click();

  const tabs = page.getByRole("group", { name: "清单视图" });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(tabs).toBeVisible();
  await expect(tabs).toBeInViewport();

  await page.goto("/checklist/mom", { waitUntil: "domcontentloaded" });
  const action = page.getByRole("button", {
    name: new RegExp(`标记已(备好|装包)：${itemName}`),
  });
  await expect(action).toBeVisible();
  const beforeLabel = await action.getAttribute("aria-label");
  await action.click();
  await expect(action).not.toHaveAttribute("aria-label", beforeLabel ?? "");

  await page.goto("/checklist?view=packing", { waitUntil: "domcontentloaded" });
  await page.getByRole("searchbox", { name: "搜索清单" }).fill(itemName);
  await page
    .getByRole("button", { name: "本页全部标记装包" })
    .click();
  await page
    .getByRole("button", { name: "全部标记装包", exact: true })
    .click();
  await expect(page.getByText(/已将 1 件物品标记为已装包/)).toBeVisible();
  await expect(page.getByText(/已装包 1 项/)).toBeVisible();
});

test("清单分区可切换紧凑列表并在刷新后保持偏好", async ({ page }) => {
  await page.goto("/checklist/documents", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "证件包", exact: true }),
  ).toBeVisible({ timeout: 60_000 });

  const items = page.locator("article");
  await expect(items.first()).toBeVisible();
  const itemCount = await items.count();

  await page.getByRole("button", { name: "切换为紧凑列表" }).click();
  await expect(
    page.getByRole("button", { name: "切换为卡片视图" }),
  ).toBeVisible();
  await expect(items).toHaveCount(itemCount);

  const compactBox = await items.first().boundingBox();
  expect(compactBox?.height).toBeLessThan(120);
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.localStorage.getItem("dadkit:ui:checklist:view-mode"),
      ),
    )
    .toBe("list");

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("button", { name: "切换为卡片视图" }),
  ).toBeVisible({ timeout: 60_000 });
});
