import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { seedFamily } from "@/tests/e2e/helpers";

test.describe.configure({ timeout: 60_000 });
test.beforeEach(async ({ page }) => { await seedFamily(page); });

async function chooseSelect(page: Page, label: string, option: string) {
  await page.getByLabel(label, { exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

async function expandFilters(page: Page) {
  if (!(await page.getByLabel("分工筛选", { exact: true }).isVisible())) {
    await page.locator("summary").filter({ hasText: /^筛选/ }).click();
  }
}

async function openFirstPlanningItem(page: Page) {
  const button = page.getByRole("button", { name: /^编辑.+的分工与采购$/ }).first();
  const name = (await button.getAttribute("aria-label"))
    ?.replace(/^编辑/, "")
    .replace(/的分工与采购$/, "");
  await button.click();
  return name ?? "";
}

test("从首页进入并保存、取消和清空单项信息", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: "开始分工" }).click();
  await expect(page).toHaveURL(/\/planning$/);
  await expect(page.getByRole("link", { name: "工具", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );

  const itemName = await openFirstPlanningItem(page);
  await page.getByRole("checkbox", { name: /小江/ }).check();
  await page.getByLabel("完成期限").fill("2026-08-05");
  await page.getByLabel("该项预计总价").fill("129.90");
  await page.getByLabel("该项实际总价").fill("118");
  await page.getByLabel("购买渠道").fill("京东 自营");
  await page.getByLabel("存放位置").fill("妈妈包");
  await page.getByRole("button", { name: "保存", exact: true }).click();

  await expect(page.getByText("分工与采购信息已保存。")).toBeVisible();
  await expect(page.getByText("小江", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/预计 ¥129\.90/).first()).toBeVisible();
  await expect(page.getByText(/实际 ¥118\.00/).first()).toBeVisible();

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByText("京东 自营", { exact: false }).first()).toBeVisible();
  await openFirstPlanningItem(page);
  await page.getByLabel("存放位置").fill("不应保存的位置");
  await page.getByRole("button", { name: "返回物品详情" }).click();
  await openFirstPlanningItem(page);
  await expect(page.getByLabel("存放位置")).toHaveValue("妈妈包");

  await page.getByRole("button", { name: "清空该项分工与采购信息" }).click();
  const confirm = page.getByRole("dialog", { name: "确认清空这项分工与采购信息？" });
  await expect(confirm).toBeVisible();
  await confirm.getByRole("button", { name: "取消" }).click();
  await expect(page.getByLabel("存放位置")).toHaveValue("妈妈包");
  await page.getByRole("button", { name: "清空该项分工与采购信息" }).click();
  await page
    .getByRole("dialog", { name: "确认清空这项分工与采购信息？" })
    .getByRole("button", { name: "清空该项信息" })
    .click();
  await expect(page.getByText("这项分工与采购信息已清空。")).toBeVisible();
  await expect(page.getByText(itemName, { exact: true }).first()).toBeVisible();
});

test("物品详情入口和批量负责人、期限设置及清空可持久化", async ({ page }) => {
  await page.goto("/checklist/documents", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "详情" }).first().click();
  await expect(page.getByText("分工与采购", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "编辑", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: /小江/ })).toBeVisible();
  await page.getByRole("button", { name: "返回物品详情" }).click();
  await page.keyboard.press("Escape");

  await page.goto("/planning", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "选择当前结果" }).click();
  await page.getByRole("button", { name: "批量设置" }).click();
  await chooseSelect(page, "负责人处理方式", "设置值");
  await page.getByRole("checkbox", { name: /奶奶/ }).check();
  await chooseSelect(page, "完成期限处理方式", "设置值");
  await page.getByLabel("批量完成期限").fill("2026-08-08");
  await page.getByRole("button", { name: "保存批量设置" }).click();
  await expect(page.getByText(/已更新 \d+ 项分工与采购信息/)).toBeVisible();

  await expandFilters(page);
  await chooseSelect(page, "分工筛选", "未来 7 天");
  await expect(page.locator("article").first()).toContainText("2026-08-08");
  await chooseSelect(page, "负责人筛选", "奶奶");
  await expect(page.locator("article").first()).toContainText("奶奶");

  await page.getByRole("button", { name: "批量设置" }).click();
  await chooseSelect(page, "完成期限处理方式", "清空");
  await page.getByRole("button", { name: "保存批量设置" }).click();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expandFilters(page);
  await chooseSelect(page, "负责人筛选", "奶奶");
  await expect(page.locator("article").first()).toContainText("奶奶");
  await expect(page.getByText("2026-08-08", { exact: true })).toHaveCount(0);
});

test("360×800 无横向溢出，首次打开后可离线查看和修改", async ({
  browserName,
  context,
  page,
}: {
  browserName: string;
  context: BrowserContext;
  page: Page;
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/planning", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "家庭分工与采购", exact: true })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);

  await openFirstPlanningItem(page);
  await page.getByRole("checkbox", { name: /小江/ }).check();
  await page.getByRole("checkbox", { name: /奶奶/ }).check();
  await page.getByRole("button", { name: "保存", exact: true }).click();

  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          if (!("serviceWorker" in navigator)) return false;
          const registration = await navigator.serviceWorker.getRegistration();
          const cached = await caches.match("/planning", { ignoreSearch: true });
          return Boolean(registration?.active && cached?.ok);
        }),
      { timeout: 60_000 },
    )
    .toBe(true);

  await context.setOffline(true);
  if (browserName === "webkit") {
    await expect(page.getByText(/小江、奶奶|奶奶、小江/).first()).toBeVisible();
    await openFirstPlanningItem(page);
    await page.getByLabel("购买渠道").fill("离线门店");
    await page.getByRole("button", { name: "保存", exact: true }).click();
    return;
  }

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByText(/小江、奶奶|奶奶、小江/).first()).toBeVisible();
  await openFirstPlanningItem(page);
  await page.getByLabel("购买渠道").fill("离线门店");
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page.getByText("离线门店", { exact: false }).first()).toBeVisible();
});
