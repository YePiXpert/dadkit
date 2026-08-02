import { expect, test, type BrowserContext, type Page } from "@playwright/test";

test.describe.configure({ timeout: 120_000 });

async function chooseSelect(page: Page, label: string, option: string) {
  await page.getByLabel(label, { exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

async function waitForCachedRoute(page: Page, route: string) {
  await expect.poll(async () => page.evaluate(async (candidate) => {
    if (!("serviceWorker" in navigator)) return false;
    const registration = await navigator.serviceWorker.getRegistration();
    const cached = await caches.match(candidate, { ignoreSearch: true });
    return Boolean(registration?.active && cached?.ok);
  }, route), { timeout: 60_000 }).toBe(true);
}

test("全新安装进入引导并可跳过；已有数据不会被强制跳转", async ({ browser, page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.getByRole("heading", { name: "欢迎使用 DadKit" })).toBeVisible();
  await page.getByRole("button", { name: "暂时跳过" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("dadkit:v4:device-identity") ?? "null")?.onboardingCompletedAt)).not.toBeNull();

  const existingContext = await browser.newContext();
  const existingPage = await existingContext.newPage();
  await existingPage.addInitScript(() => {
    localStorage.setItem("dadkit:v3:checklist", JSON.stringify([{ status: "packed" }]));
  });
  await existingPage.goto("/settings", { waitUntil: "domcontentloaded" });
  await expect(existingPage).toHaveURL(/\/settings$/);
  await expect(existingPage.getByRole("heading", { name: "我的" })).toBeVisible();
  await existingContext.close();
});

test("引导可先进入导入备份或加入家庭", async ({ page }) => {
  await page.goto("/onboarding", { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: "导入备份" }).click();
  await expect(page).toHaveURL(/\/settings\/backup$/);

  await page.goto("/onboarding", { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: "加入家庭" }).click();
  await expect(page).toHaveURL(/\/settings\/backup#family-sync$/);
  await expect(page.getByText("家庭同步", { exact: true }).first()).toBeVisible();
});

test("完成待产引导会协调保存自定义成员和当前设备使用者", async ({ page }) => {
  await page.goto("/onboarding", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "开始设置" }).click();
  await page.getByRole("button", { name: "正在准备待产" }).click();
  await page.getByRole("button", { name: "继续" }).click();

  await page.getByLabel("家庭显示名称（可选）").fill("蒲公英之家");
  await page.getByLabel("成员名称").fill("王阿姨");
  await page.getByLabel("关系说明（可选）").fill("月嫂");
  await page.getByRole("button", { name: "添加到草稿" }).click();
  await page.getByRole("button", { name: "继续" }).click();

  await page.getByLabel("宝宝昵称（可选）").fill("小满");
  await page.getByLabel("预产期（可选）").fill("2026-09-01");
  await page.getByRole("button", { name: "继续" }).click();
  await chooseSelect(page, "这台设备是谁在使用", "王阿姨");
  await page.getByRole("button", { name: "继续" }).click();
  await page.getByRole("button", { name: "完成设置" }).click();

  await expect(page).toHaveURL(/\/$/);
  const saved = await page.evaluate(() => ({
    household: JSON.parse(localStorage.getItem("dadkit:v4:household") ?? "null"),
    identity: JSON.parse(localStorage.getItem("dadkit:v4:device-identity") ?? "null"),
  }));
  expect(saved.household.householdName.value).toBe("蒲公英之家");
  const member = Object.values(saved.household.members as Record<string, { displayName: { value: string } }>).find((candidate) => candidate.displayName.value === "王阿姨");
  expect(member).toBeDefined();
  expect(saved.identity.currentMemberId).not.toBeNull();
  expect(saved.identity.preferredEntry).toBe("checklist");
});

test("onboarding 和家庭设置在 360×800 无横向溢出且已预缓存离线页面", async ({
  browserName,
  context,
  page,
}: {
  browserName: string;
  context: BrowserContext;
  page: Page;
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/onboarding", { waitUntil: "domcontentloaded" });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await waitForCachedRoute(page, "/onboarding");
  await waitForCachedRoute(page, "/settings/family");

  await page.evaluate(() => {
    localStorage.setItem("dadkit:v4:device-identity", JSON.stringify({ version: 1, currentMemberId: null, preferredEntry: "auto", onboardingCompletedAt: 1 }));
  });
  await page.goto("/settings/family", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "家庭成员", level: 1 })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await context.setOffline(true);
  if (browserName === "webkit") {
    expect(await page.evaluate(async () => Boolean((await caches.match("/settings/family", { ignoreSearch: true }))?.ok))).toBe(true);
  } else {
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "家庭成员", level: 1 })).toBeVisible();
  }
});
