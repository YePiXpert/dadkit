import path from "node:path";

import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { seedCompletedOnboarding } from "@/tests/e2e/helpers";

const SAMPLE_IMAGE_PATH = path.join(process.cwd(), "public", "icon-192.png");

test.beforeEach(async ({ page }) => { await seedCompletedOnboarding(page); });

async function signalPwaInstallAvailability(page: Page) {
  await expect
    .poll(async () => {
      await page.evaluate(() => {
        const event = new Event("beforeinstallprompt");
        Object.assign(event, {
          prompt: async () => undefined,
          userChoice: Promise.resolve({ outcome: "dismissed" as const }),
        });
        window.dispatchEvent(event);
      });

      return page.getByRole("button", { name: /安装到桌面/ }).count();
    })
    .toBe(1);
}

test.describe.configure({ timeout: 120_000 });

test("移动端输入保持 16px，安装入口仅在可用时显示", async ({ page }: { page: Page }) => {
  await page.goto("/checklist", { waitUntil: "domcontentloaded" });

  const search = page.locator("#checklist-search");
  await expect(search).toBeVisible();
  await expect
    .poll(() => search.evaluate((element: HTMLElement) => getComputedStyle(element).fontSize))
    .toBe("16px");

  await page.goto("/settings", { waitUntil: "domcontentloaded" });
  const installEntry = page.getByRole("button", { name: /安装到桌面/ });
  await expect(installEntry).toHaveCount(0);
  await signalPwaInstallAvailability(page);
  await expect(installEntry).toBeVisible();

  await page.addInitScript(() => {
    const nativeMatchMedia = window.matchMedia.bind(window);

    window.matchMedia = ((query: string) => {
      const result = nativeMatchMedia(query);

      if (query !== "(display-mode: standalone)") {
        return result;
      }

      return new Proxy(result, {
        get(target, property) {
          if (property === "matches") {
            return true;
          }

          const value = Reflect.get(target, property, target);
          return typeof value === "function" ? value.bind(target) : value;
        },
      });
    }) as typeof window.matchMedia;
  });

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(installEntry).toHaveCount(0);
});

test("Android 设置页显示当前版本并允许手动检查更新", async ({ page }: { page: Page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window.navigator, "userAgent", {
      configurable: true,
      value: `${window.navigator.userAgent} DadKitAndroid/21`,
    });
    window.localStorage.setItem("dadkit:android-version-code", "19");
    window.localStorage.setItem(
      "dadkit:android-version-checked-at",
      String(Date.now()),
    );
  });

  let checks = 0;
  await page.route("**/api/app-version", async (route) => {
    checks += 1;
    await route.fulfill({
      contentType: "application/json",
      json: {
        versionCode: 22,
        versionName: "3.4.9",
        notes: "下一版本测试更新。",
        sha256: "a".repeat(64),
        url: "/api/app-version/apk?versionCode=22",
      },
      status: 200,
    });
  });

  await page.goto("/settings", { waitUntil: "domcontentloaded" });
  const aboutEntry = page.getByRole("link", { name: /关于 DadKit/ });
  await expect(aboutEntry).toHaveAttribute("href", "/settings/about");
  await aboutEntry.click();
  await expect(page).toHaveURL(/\/settings\/about$/);

  await expect(
    page.getByRole("heading", { level: 1, name: "关于 DadKit" }),
  ).toBeVisible();
  await expect(page.getByText("3.4.8 (21)")).toBeVisible();
  const checkButton = page.getByRole("button", { name: "检查更新" });
  await expect(checkButton).toBeVisible();
  await checkButton.click();

  await expect(page.getByText("发现新版本 3.4.9")).toBeVisible();
  await expect(page.getByRole("link", { name: "下载更新" })).toHaveAttribute(
    "href",
    "/api/app-version/apk?versionCode=22",
  );
  expect(checks).toBe(1);
});

test("清单和成长记在移动端完成 hydrate 并持久化", async ({ page }: { page: Page }) => {
  // Playwright WebKit on Windows can defer the first hydrated interaction
  // while its process warms up. This is a functional workflow, not a
  // performance assertion (the Chromium test below owns that budget).
  test.setTimeout(120_000);

  const itemName = `E2E 自定义物品 ${test.info().project.name}`;
  const nickname = `E2E-${test.info().project.name.slice(0, 8)}`;

  await page.goto("/checklist", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "新增物品" })).toBeVisible({
    timeout: 60_000,
  });

  await page.getByRole("button", { name: "新增物品" }).click();
  await page.locator("#add-item-name").fill(itemName);
  await page.getByRole("button", { name: "加入清单" }).click();
  await page.goto("/checklist/mom", { waitUntil: "domcontentloaded" });
  await expect(page.getByText(itemName)).toBeVisible();

  await page.goto("/growth", { waitUntil: "domcontentloaded" });
  await page.locator("details").first().locator("summary").click();
  await expect(page.locator("#growth-nickname")).toBeVisible();
  await page.locator("#growth-nickname").fill(nickname);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("#growth-nickname")).toHaveValue(nickname);
});

test("照片保存在当前浏览器且备份页不再提供设备迁移", async ({ page }: { page: Page }) => {
  test.setTimeout(150_000);

  await page.goto("/checklist/documents", { waitUntil: "domcontentloaded" });
  const firstDetailsButton = page.getByRole("button", { name: "详情" }).first();
  await expect(firstDetailsButton).toBeVisible({ timeout: 60_000 });
  await firstDetailsButton.click();
  const photoInput = page.locator(
    'input[aria-label="从相册选择物品照片"]',
  );
  await expect(photoInput).toBeAttached();
  await photoInput.setInputFiles(SAMPLE_IMAGE_PATH);
  await expect(page.locator('img[src^="blob:"]').last()).toBeVisible();
  await page.keyboard.press("Escape");

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "详情" }).first().click();
  await expect(page.locator('img[src^="blob:"]').last()).toBeVisible();
  await page.keyboard.press("Escape");

  await page.goto("/settings/backup", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("加密设备迁移")).toHaveCount(0);
});

test("家庭同步摘要提供新入口和旧同步码兼容入口", async ({ page }: { page: Page }) => {
  await page.goto("/settings/backup", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: "创建同步空间" })).toHaveAttribute("href", "/settings/sync");
  await expect(page.getByRole("link", { name: "通过邀请加入" })).toHaveAttribute("href", "/join");
  await page.getByText("使用旧同步码", { exact: true }).click();
  await expect(page.locator("#legacy-sync-name")).toBeVisible();
  await expect(page.locator("#legacy-sync-code")).toBeVisible();
});

test("Service Worker 缓存支持离线重开清单页", async ({
  browserName,
  context,
  page,
}: {
  browserName: string;
  context: BrowserContext;
  page: Page;
}) => {
  test.setTimeout(240_000);

  await page.goto("/checklist", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "新增物品" })).toBeVisible({
    timeout: 60_000,
  });
  const serviceWorkerState = await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return false;

    const deadline = Date.now() + 120_000;
    let registration: ServiceWorkerRegistration | undefined;

    while (Date.now() < deadline) {
      registration = await navigator.serviceWorker.getRegistration();
      if (registration?.active) {
        return { active: true };
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return {
      active: false,
      installing: registration?.installing?.state,
      waiting: registration?.waiting?.state,
    };
  });
  expect(serviceWorkerState).toEqual({ active: true });

  await context.setOffline(true);

  if (browserName === "webkit") {
    // Playwright WebKit may throw an internal error for a true offline reload.
    // Inspecting the completed navigation cache still validates the offline app
    // shell that Safari will use without depending on that runner limitation.
    const hasCachedShell = await page.evaluate(async () => {
      const cached = await caches.match("/checklist", { ignoreSearch: true });
      return Boolean(cached?.ok && (await cached.text()).includes("<html"));
    });
    expect(hasCachedShell).toBe(true);
    return;
  }

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("progressbar", { name: /清单完成/ }),
  ).toBeVisible();
});

test("Chromium 移动端在 4x CPU 下保持交互与视觉稳定性", async ({
  browserName,
  page,
}: {
  browserName: string;
  page: Page;
}) => {
  test.skip(browserName !== "chromium", "CPU 和 Core Web Vitals 门禁使用 CDP。");

  await page.addInitScript(() => {
    const metrics = { cls: 0, lcp: 0 };

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as PerformanceEntry[]) {
        metrics.lcp = Math.max(metrics.lcp, entry.startTime);
      }
    }).observe({ buffered: true, type: "largest-contentful-paint" });

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as PerformanceEntry[]) {
        const layoutShift = entry as PerformanceEntry & {
          hadRecentInput?: boolean;
          value?: number;
        };
        if (!layoutShift.hadRecentInput) {
          metrics.cls += layoutShift.value ?? 0;
        }
      }
    }).observe({ buffered: true, type: "layout-shift" });

    (window as typeof window & { __dadkitMetrics?: typeof metrics }).__dadkitMetrics = metrics;
  });

  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await session.send("Network.emulateNetworkConditions", {
    connectionType: "cellular4g",
    downloadThroughput: (4 * 1024 * 1024) / 8,
    latency: 150,
    offline: false,
    uploadThroughput: (750 * 1024) / 8,
  });

  const lcpSamples: number[] = [];

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.goto("/checklist", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("progressbar", { name: /清单完成/ }),
    ).toBeVisible();
    await page.waitForTimeout(700);
    const metrics = await page.evaluate(
      () =>
        (window as typeof window & {
          __dadkitMetrics?: { cls: number; lcp: number };
        }).__dadkitMetrics,
    );
    expect(metrics).toBeDefined();
    expect(metrics?.lcp).toBeGreaterThan(0);
    expect(metrics?.cls).toBeLessThanOrEqual(0.1);
    lcpSamples.push(metrics?.lcp ?? Number.POSITIVE_INFINITY);
  }

  const medianLcp = lcpSamples.sort((left: number, right: number) => left - right)[1];
  expect(medianLcp).toBeLessThanOrEqual(2_500);

  await page.goto("/checklist/documents", { waitUntil: "domcontentloaded" });
  const action = page.locator("article button[title]").first();
  await expect(action).toBeVisible();

  const interactionSamples = await action.evaluate(async (button: HTMLElement) => {
    const nextFrame = () =>
      new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const samples: number[] = [];

    for (let index = 0; index < 20; index += 1) {
      const previousTitle = button.getAttribute("title");
      const startedAt = performance.now();
      (button as HTMLButtonElement).click();

      for (let frame = 0; frame < 12; frame += 1) {
        await nextFrame();
        if (button.getAttribute("title") !== previousTitle) break;
      }

      samples.push(performance.now() - startedAt);
    }

    return samples;
  });
  const p95 = interactionSamples.sort((left: number, right: number) => left - right)[
    Math.ceil(interactionSamples.length * 0.95) - 1
  ];
  expect(p95).toBeLessThanOrEqual(200);

  await session.detach();
});
