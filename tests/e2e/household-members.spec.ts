import { expect, test, type Page } from "@playwright/test";

import { seedCompletedOnboarding, seedFamily } from "@/tests/e2e/helpers";

test.describe.configure({ timeout: 120_000 });

async function chooseSelect(page: Page, label: string, option: string) {
  await page.getByLabel(label, { exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

async function expandFilters(page: Page) {
  if (!(await page.getByLabel("分工筛选", { exact: true }).isVisible())) {
    await page.locator("summary").filter({ hasText: /^筛选/ }).click();
  }
}

async function setupBaby(page: Page) {
  await page.goto("/baby", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "宝宝已出生，开始记录" }).click();
  await page.locator("#baby-profile-birthDate").fill("2026-08-01");
  await page.getByRole("button", { name: "保存资料" }).click();
  await expect(page.getByRole("heading", { name: "宝宝", exact: true })).toBeVisible();
}

async function openQuickAction(page: Page, name: string) {
  await page.getByRole("region", { name: "快速记录" }).getByRole("button", { name, exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("heading", { name, exact: true })).toBeVisible();
}

test("家庭设置可新增、编辑、移除成员并保留已移除历史", async ({ page }) => {
  await seedCompletedOnboarding(page);
  await page.goto("/settings/family", { waitUntil: "domcontentloaded" });

  await page.getByRole("button", { name: "添加成员" }).click();
  await page.getByLabel("成员名称").fill("王阿姨");
  await page.getByLabel("关系说明（可选）").fill("月嫂");
  await page.getByRole("button", { name: "保存成员" }).click();
  await expect(page.getByText("王阿姨", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "编辑王阿姨" }).click();
  await page.getByLabel("成员名称").fill("王姐");
  await page.getByRole("button", { name: "保存成员" }).click();
  await expect(page.getByText("王姐", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "移除王姐" }).click();
  const confirm = page.getByRole("dialog", { name: "确认移除这位家庭成员？" });
  await expect(confirm).toContainText("历史负责人和记录人仍会保留");
  await confirm.getByRole("button", { name: "移除成员" }).click();
  await expect(page.getByText("王姐（已移除）", { exact: true })).toBeVisible();
});

test("一个物品可由一个或多个自定义成员负责并持久化", async ({ page }) => {
  await seedFamily(page);
  await page.goto("/planning", { waitUntil: "domcontentloaded" });
  const editButton = page.getByRole("button", { name: /^编辑.+的分工与采购$/ }).first();
  const editLabel = await editButton.getAttribute("aria-label") ?? "";
  await editButton.click();
  await page.getByRole("checkbox", { name: /小江/ }).check();
  await page.getByRole("checkbox", { name: /奶奶/ }).check();
  await page.getByRole("button", { name: "保存", exact: true }).click();
  const editedItem = page.locator("article").filter({
    has: page.getByRole("button", { name: editLabel, exact: true }),
  });
  await expect(editedItem).toContainText("小江");
  await expect(editedItem).toContainText("奶奶");

  await page.reload({ waitUntil: "domcontentloaded" });
  await expandFilters(page);
  await chooseSelect(page, "负责人筛选", "小江");
  await expect(page.locator("article").first()).toContainText("奶奶");
});

test("新记录采用当前设备成员，计时记录人固定且成员移除后历史仍可筛选", async ({ page }) => {
  await seedFamily(page);
  await setupBaby(page);

  await openQuickAction(page, "瓶喂");
  await expect(page.getByLabel("记录人", { exact: true })).toContainText("小江");
  await page.locator("#baby-care-amount").fill("60");
  await page.getByRole("button", { name: "保存瓶喂记录" }).click();
  await expect(page.getByText("小江记录", { exact: true }).first()).toBeVisible();

  await openQuickAction(page, "亲喂");
  await page.getByRole("button", { name: "左侧开始" }).click();
  await chooseSelect(page, "这台设备是谁在使用", "奶奶 · 祖辈");
  await openQuickAction(page, "亲喂");
  await expect(page.getByLabel("记录人", { exact: true })).toBeDisabled();
  await expect(page.getByLabel("记录人", { exact: true })).toContainText("小江");
  await page.getByRole("button", { name: "结束亲喂" }).click();
  await expect(page.getByText("小江记录", { exact: true })).toHaveCount(2);

  await page.goto("/settings/family", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "移除小江" }).click();
  await page.getByRole("dialog", { name: "确认移除这位家庭成员？" }).getByRole("button", { name: "移除成员" }).click();
  await expect(page.getByText("小江（已移除）", { exact: true })).toBeVisible();

  await page.goto("/baby/timeline", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("小江记录（成员已移除）", { exact: true }).first()).toBeVisible();
  await chooseSelect(page, "记录人筛选", "小江（已移除）");
  await expect(page.locator("article")).toHaveCount(2);
  await page.getByLabel("搜索备注").fill("小江");
  await expect(page.locator("article")).toHaveCount(2);
});
