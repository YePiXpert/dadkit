import { expect, test, type BrowserContext, type Page } from "@playwright/test";

test.describe.configure({ timeout: 120_000 });

async function setupBaby(page: Page) {
  await page.goto("/baby", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "宝宝已出生，开始记录" })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "宝宝已出生，开始记录" }).click();
  await page.locator("#baby-profile-birthDate").fill("2026-08-01");
  await page.getByRole("button", { name: "保存资料" }).click();
  await expect(page.getByRole("heading", { name: "宝宝", exact: true })).toBeVisible();
}

async function addWetDiaper(page: Page) {
  await page.getByRole("region", { name: "快速记录" }).getByRole("button", { name: "尿布", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "小便", exact: true }).click();
  await expect(page.getByText("尿布记录已保存。")).toBeVisible();
}

async function waitForCachedRoute(page: Page, route: string) {
  await expect.poll(async () => page.evaluate(async (candidate) => {
    if (!("serviceWorker" in navigator)) return false;
    const registration = await navigator.serviceWorker.getRegistration();
    const cached = await caches.match(candidate, { ignoreSearch: true });
    return Boolean(registration?.active && cached?.ok);
  }, route), { timeout: 60_000 }).toBe(true);
}

test("360×800、reduced-motion 和直接路由保持可用", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/baby/timeline", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "全部宝宝记录" })).toBeVisible({ timeout: 60_000 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.goto("/baby", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "宝宝记录", exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("首次访问后可离线重开并新增宝宝记录", async ({
  browserName,
  context,
  page,
}: {
  browserName: string;
  context: BrowserContext;
  page: Page;
}) => {
  await setupBaby(page);
  await page.goto("/baby/timeline", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "全部宝宝记录" })).toBeVisible();
  await waitForCachedRoute(page, "/baby/timeline");
  await page.goto("/baby", { waitUntil: "domcontentloaded" });
  await waitForCachedRoute(page, "/baby");

  await context.setOffline(true);
  if (browserName === "webkit") {
    expect(await page.evaluate(async () => Boolean((await caches.match("/baby", { ignoreSearch: true }))?.ok))).toBe(true);
  } else {
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "宝宝", exact: true })).toBeVisible();
  }
  await addWetDiaper(page);

  await context.setOffline(false);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByText("尿布·小便", { exact: true }).first()).toBeVisible();
});
