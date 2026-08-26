import {
  expect,
  test,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import {
  dismissBirthCelebration,
  seedCompletedOnboarding,
  waitForOfflineReady,
} from "@/tests/e2e/helpers";

test.describe.configure({ timeout: 240_000 });
test.beforeEach(async ({ page }) => { await seedCompletedOnboarding(page); });

async function setupBaby(page: Page) {
  await page.goto("/baby", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "宝宝已出生，开始记录" })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "宝宝已出生，开始记录" }).click();
  await page.locator("#baby-profile-birthDate").fill("2026-08-01");
  await page.getByRole("button", { name: "保存资料" }).click();
  await dismissBirthCelebration(page);
  await expect(page.getByRole("heading", { name: "宝宝", exact: true })).toBeVisible();
}

async function addWetDiaper(page: Page) {
  await page.getByRole("region", { name: "快速记录" }).getByRole("button", { name: "尿布", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "小便", exact: true }).click();
  await expect(page.getByText("尿布记录已保存。")).toBeVisible();
}

test("360×800、reduced-motion 和直接路由保持可用", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/baby/timeline", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "全部宝宝记录" })).toBeVisible({ timeout: 60_000 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.goto("/baby", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "宝宝记录", exact: true })).toBeVisible({ timeout: 60_000 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

async function verifyBabyOffline(
  browserName: string,
  context: BrowserContext,
  page: Page,
) {
  await setupBaby(page);
  // A second document navigation can interrupt WebKit's first service-worker
  // install. Wait for the current route to become offline-safe before leaving.
  await waitForOfflineReady(page, "/baby");
  await page.goto("/baby/timeline", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "全部宝宝记录" })).toBeVisible();
  await waitForOfflineReady(page, "/baby/timeline");
  await page.goto("/baby", { waitUntil: "domcontentloaded" });
  await waitForOfflineReady(page, "/baby");

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
}

test(
  "首次访问后可离线重开并新增宝宝记录",
  { tag: "@isolated-pwa" },
  async ({ browserName, context, page }) => {
    await verifyBabyOffline(browserName, context, page);
  },
);

test("IndexedDB v1 惰性升级到 v2 且不重写旧事件", async ({ page }) => {
  await page.goto("/privacy", { waitUntil: "domcontentloaded" });
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase("dadkit-baby");
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("dadkit-baby", 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        database.createObjectStore("meta", { keyPath: "key" });
        const events = database.createObjectStore("events", { keyPath: "id" });
        database.createObjectStore("snapshots", { keyPath: "id" });
        events.put({
          id: "legacy-v1-event",
          type: "diaper",
          note: "旧数据库事件",
          createdAt: 1,
          updatedAt: 1,
          deletedAt: null,
          occurredAt: new Date().toISOString(),
          kind: "wet",
        });
      };
      request.onsuccess = () => { request.result.close(); resolve(); };
      request.onerror = () => reject(request.error);
    });
  });

  await page.goto("/baby/timeline", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("旧数据库事件", { exact: true })).toBeVisible();
  await expect(page.getByText("未标记记录人", { exact: true })).toBeVisible();
  const databaseState = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("dadkit-baby");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = database.transaction("events", "readonly");
    const raw = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const request = transaction.objectStore("events").get("legacy-v1-event");
      request.onsuccess = () => resolve(request.result as Record<string, unknown>);
      request.onerror = () => reject(request.error);
    });
    const version = database.version;
    database.close();
    return { version, hasRecorderField: "recordedByMemberId" in raw };
  });
  expect(databaseState).toEqual({ version: 2, hasRecorderField: false });
});
