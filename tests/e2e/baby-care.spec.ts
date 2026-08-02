import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ timeout: 120_000 });

async function setupBaby(page: Page, nickname = "满满") {
  await page.goto("/baby", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "宝宝记录", exact: true })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "宝宝已出生，开始记录" }).click();
  await page.locator("#baby-profile-nickname").fill(nickname);
  await page.locator("#baby-profile-birthDate").fill("2026-08-01");
  await page.locator("#baby-profile-birthTime").fill("08:30");
  await page.getByRole("button", { name: "保存资料" }).click();
  await expect(page.getByRole("heading", { name: nickname, exact: true })).toBeVisible();
}

async function openQuickAction(page: Page, name: string) {
  await page.getByRole("region", { name: "快速记录" }).getByRole("button", { name, exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("heading", { name, exact: true })).toBeVisible();
}

async function chooseSelect(page: Page, label: string, option: string) {
  await page.getByLabel(label, { exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

test("宝宝资料、三栏导航和计时在刷新后可恢复", async ({ page }) => {
  await setupBaby(page, "E2E宝宝");
  await expect(page.getByRole("link", { name: "清单", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "宝宝", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: "我的", exact: true })).toBeVisible();

  await openQuickAction(page, "亲喂");
  await page.getByRole("button", { name: "左侧开始" }).click();
  await expect(page.getByText("已开始左侧亲喂。")).toBeVisible();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "E2E宝宝", exact: true })).toBeVisible();
  await openQuickAction(page, "亲喂");
  await expect(page.getByText("当前左侧", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "切换右侧" }).click();
  await expect(page.getByText("当前右侧", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "结束亲喂" }).click();
  await expect(page.getByText("亲喂记录已保存。")).toBeVisible();

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "E2E宝宝", exact: true })).toBeVisible();
  await expect(page.getByText("亲喂", { exact: true }).first()).toBeVisible();
});

test("可记录五类照护事件，并从时间线编辑和二次确认删除", async ({ page }) => {
  await setupBaby(page);

  await openQuickAction(page, "瓶喂");
  await page.locator("#baby-care-amount").fill("60");
  await page.getByRole("button", { name: "保存瓶喂记录" }).click();
  await openQuickAction(page, "瓶喂");
  await chooseSelect(page, "奶类", "配方奶");
  await page.locator("#baby-care-amount").fill("90");
  await page.getByRole("button", { name: "保存瓶喂记录" }).click();

  await openQuickAction(page, "吸奶");
  await page.getByRole("button", { name: "双侧", exact: true }).click();
  await openQuickAction(page, "吸奶");
  await page.locator("#baby-care-amount").fill("45");
  await page.getByRole("button", { name: "结束吸奶" }).click();

  await openQuickAction(page, "尿布");
  await page.getByRole("button", { name: "小便", exact: true }).click();
  await openQuickAction(page, "尿布");
  await page.getByRole("button", { name: "都有", exact: true }).click();

  await openQuickAction(page, "睡眠");
  await page.getByRole("button", { name: "开始睡眠" }).click();
  await openQuickAction(page, "睡眠");
  await page.getByRole("button", { name: "结束睡眠" }).click();

  await expect(page.getByRole("heading", { name: "今日汇总" })).toBeVisible();
  await expect(page.getByText("60 ml", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("90 ml", { exact: false }).first()).toBeVisible();
  await page.getByRole("link", { name: "查看全部记录" }).click();
  await expect(page).toHaveURL(/\/baby\/timeline$/);
  await expect(page.getByRole("heading", { name: "全部宝宝记录" })).toBeVisible();

  await page.getByRole("button", { name: "编辑记录" }).first().click();
  const note = `时间线编辑-${test.info().project.name}`;
  await page.locator("#edit-care-note").fill(note);
  await page.getByRole("button", { name: "保存修改" }).click();
  await expect(page.getByText(note, { exact: true })).toBeVisible();

  const row = page.locator("article").filter({ hasText: note });
  await row.getByRole("button", { name: "删除记录" }).click();
  const confirmation = page.getByRole("dialog", { name: "确认删除这条记录？" });
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole("button", { name: "取消" }).click();
  await expect(page.getByText(note, { exact: true })).toBeVisible();
  await row.getByRole("button", { name: "删除记录" }).click();
  await page.getByRole("dialog", { name: "确认删除这条记录？" }).getByRole("button", { name: "删除记录" }).click();
  await expect(page.getByText(note, { exact: true })).toHaveCount(0);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByText(note, { exact: true })).toHaveCount(0);

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: /满满.*今日/ })).toBeVisible();
});
