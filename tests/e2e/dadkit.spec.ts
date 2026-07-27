import path from "node:path";

import { expect, test } from "@playwright/test";

const SAMPLE_IMAGE_PATH = path.join(process.cwd(), "public", "icon-192.png");

test("清单和成长记在移动端完成 hydrate 并持久化", async ({ page }) => {
  const itemName = `E2E 自定义物品 ${test.info().project.name}`;
  const nickname = `E2E-${test.info().project.name.slice(0, 8)}`;

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("progressbar")).toBeVisible();

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

test("照片会进入加密迁移包并可原子导入", async ({ page }) => {
  test.setTimeout(90_000);

  await page.goto("/checklist/documents", { waitUntil: "domcontentloaded" });
  await expect(page.locator("article button[title]").first()).toBeVisible();

  await page.getByRole("button", { name: "详情" }).first().click();
  const photoInput = page.locator(
    'input[aria-label="从相册选择物品照片"]',
  );
  await expect(photoInput).toBeAttached();
  await photoInput.setInputFiles(SAMPLE_IMAGE_PATH);
  await expect(page.locator('img[src^="blob:"]').last()).toBeVisible();
  await page.keyboard.press("Escape");

  await page.goto("/settings/backup", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "打开迁移工具" }).click();
  await expect(page.locator("#transfer-password")).toBeVisible();
  await page.locator("#transfer-password").fill("migration-e2e-password-2026");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出加密迁移包" }).click();
  const download = await downloadPromise;
  const archivePath = await download.path();

  if (!archivePath) {
    throw new Error("迁移包下载路径不可用。");
  }

  await page.locator('input[type="file"]').setInputFiles(archivePath);
  await page.getByRole("button", { name: "导入并替换本机数据" }).click();
  await expect(page.getByText(/已恢复 1 张照片/)).toBeVisible();
});

test("家庭同步可加入并手动完成一次同步", async ({ page }) => {
  const project = test.info().project.name.startsWith("chromium") ? "c" : "w";
  const suffix = `${project}${String(Date.now()).slice(-8)}`;

  await page.goto("/settings/backup", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#sync-name")).toBeVisible();
  await page.locator("#sync-name").fill(`E2E ${suffix}`);
  await page.locator("#sync-code").fill(`e2e-${suffix}`);
  await page.getByRole("button", { name: "开始使用同步" }).click();
  await expect(page.getByText("已加入家庭同步")).toBeVisible();

  await page.getByRole("button", { name: "立即同步" }).click();
  await expect(page.getByText("同步完成")).toBeVisible();
});

test("Service Worker 缓存支持离线重开首页", async ({
  browserName,
  context,
  page,
}) => {
  test.setTimeout(100_000);

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("progressbar")).toBeVisible();
  const serviceWorkerState = await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return false;

    const deadline = Date.now() + 60_000;
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
      const cached = await caches.match("/", { ignoreSearch: true });
      return Boolean(cached?.ok && (await cached.text()).includes("<html"));
    });
    expect(hasCachedShell).toBe(true);
    return;
  }

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("progressbar")).toBeVisible();
});

test("Chromium 移动端在 4x CPU 下保持交互与视觉稳定性", async ({
  browserName,
  page,
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
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("progressbar")).toBeVisible();
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

  const medianLcp = lcpSamples.sort((left, right) => left - right)[1];
  expect(medianLcp).toBeLessThanOrEqual(2_500);

  await page.goto("/checklist/documents", { waitUntil: "domcontentloaded" });
  const action = page.locator("article button[title]").first();
  await expect(action).toBeVisible();

  const interactionSamples = await action.evaluate(async (button) => {
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
  const p95 = interactionSamples.sort((left, right) => left - right)[
    Math.ceil(interactionSamples.length * 0.95) - 1
  ];
  expect(p95).toBeLessThanOrEqual(200);

  await session.detach();
});
