import { expect, test, type BrowserContext, type Page } from "@playwright/test";

test.describe.configure({ timeout: 120_000 });

async function waitForCachedRoute(page: Page, route: string) {
  await expect.poll(async () => page.evaluate(async (candidate) => {
    if (!("serviceWorker" in navigator)) return false;
    const registration = await navigator.serviceWorker.getRegistration();
    const cached = await caches.match(candidate, { ignoreSearch: true });
    return Boolean(registration?.active && cached?.ok);
  }, route), { timeout: 120_000 }).toBe(true);
}

test("全新安装进入引导并可跳过；已有数据不会被强制跳转", async ({ browser, page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/onboarding$/, { timeout: 60_000 });
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

test("引导可先进入导入备份、邀请加入或创建同步", async ({ page }) => {
  await page.goto("/onboarding", { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: "导入备份" }).click();
  await expect(page).toHaveURL(/\/settings\/backup$/);

  await page.goto("/onboarding", { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: "加入家庭" }).click();
  await expect(page).toHaveURL(/\/join$/);
  await expect(page.getByRole("heading", { name: "加入家庭同步" })).toBeVisible();

  await page.goto("/onboarding", { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: "创建同步" }).click();
  await expect(page).toHaveURL(/\/settings\/sync$/);
});

test("完成待产引导会保存阶段资料", async ({ page }) => {
  await page.goto("/onboarding", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "开始设置" }).click();
  await page.getByRole("button", { name: "正在准备待产" }).click();
  await page.getByRole("button", { name: "继续" }).click();

  await page.getByLabel("宝宝昵称（可选）").fill("小满");
  await page.getByLabel("预产期（可选）").fill("2026-09-01");
  await page.getByRole("button", { name: "继续" }).click();
  await page.getByRole("button", { name: "完成设置" }).click();

  await expect(page).toHaveURL(/\/$/);
  const saved = await page.evaluate(() => ({
    growth: JSON.parse(localStorage.getItem("dadkit-growth-profile-v1") ?? "null"),
    identity: JSON.parse(localStorage.getItem("dadkit:v4:device-identity") ?? "null"),
  }));
  expect(saved.growth.nickname).toBe("小满");
  expect(saved.identity.preferredEntry).toBe("checklist");
});

test("onboarding 和设置页在 360×800 无横向溢出且首次访问后可离线使用", async ({
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
  await expect(page.getByRole("heading", { name: "欢迎使用 DadKit" })).toBeVisible({ timeout: 60_000 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), { timeout: 30_000 }).toBe(true);
  await waitForCachedRoute(page, "/onboarding");

  await page.evaluate(() => {
    localStorage.setItem("dadkit:v4:device-identity", JSON.stringify({ version: 1, preferredEntry: "auto", onboardingCompletedAt: 1 }));
  });
  await page.goto("/settings", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "我的", level: 1 })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), { timeout: 30_000 }).toBe(true);
  await waitForCachedRoute(page, "/settings");

  await context.setOffline(true);
  if (browserName === "webkit") {
    expect(await page.evaluate(async () => Boolean((await caches.match("/settings", { ignoreSearch: true }))?.ok))).toBe(true);
  } else {
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "我的", level: 1 })).toBeVisible();
  }
});
