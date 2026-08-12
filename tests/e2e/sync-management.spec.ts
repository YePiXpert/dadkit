import { expect, test, type Page } from "@playwright/test";

import { seedCompletedOnboarding } from "./helpers";

test.beforeEach(async ({ page }) => {
  await seedCompletedOnboarding(page);
});
test.describe.configure({ timeout: 120_000 });

async function waitForCachedRoute(page: Page, route: string) {
  await expect.poll(async () => page.evaluate(async (candidate) => {
    if (!("serviceWorker" in navigator)) return false;
    const registration = await navigator.serviceWorker.getRegistration();
    const cached = await caches.match(candidate, { ignoreSearch: true });
    return Boolean(registration?.active && cached?.ok);
  }, route), { timeout: 60_000 }).toBe(true);
}

test("随机空间、邀请、设备角色和永久删除完成闭环", async ({ browser, page }) => {
  const displayName = `同名家庭-${Date.now()}`;
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/settings/sync");
  const displayNameInput = page.getByLabel("家庭显示名称");
  await displayNameInput.click();
  await displayNameInput.pressSequentially(displayName);
  await expect(displayNameInput).toHaveValue(displayName);
  const deviceNameInput = page.getByLabel("设备名称");
  await deviceNameInput.fill("主设备");
  await expect(deviceNameInput).toHaveValue("主设备");
  await page.getByRole("button", { name: "创建家庭同步" }).click();
  await expect(page.getByText("家庭同步空间已创建。")).toBeVisible();
  await expect(page.getByText(displayName, { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  const storedSession = await page.evaluate(() => localStorage.getItem("dadkit:v3:sync-session"));
  expect(storedSession).not.toContain("token");

  await page.getByRole("button", { name: "生成邀请" }).click();
  const inviteText = page.getByText(/\/join#invite=DK2\./);
  await expect(inviteText).toBeVisible();
  const inviteLink = (await inviteText.textContent())!;
  expect(inviteLink).toContain("#invite=");
  expect(inviteLink).not.toContain("?invite=");

  const memberContext = await browser.newContext({ viewport: { width: 360, height: 800 } });
  const memberPage = await memberContext.newPage();
  await seedCompletedOnboarding(memberPage);
  await memberPage.goto(inviteLink);
  await expect(memberPage).toHaveURL(/\/join$/);
  await memberPage.getByLabel("设备名称").fill("副设备");
  await memberPage.getByRole("button", { name: "加入家庭同步" }).click();
  await expect(memberPage).toHaveURL(/\/$/);
  await memberPage.goto("/settings/sync");
  await expect(memberPage.getByText("成员", { exact: true }).first()).toBeVisible();
  await expect(memberPage.getByRole("button", { name: "生成邀请" })).toHaveCount(0);

  await page.reload();
  const memberRow = page.locator("div.rounded-xl").filter({ hasText: "副设备" }).first();
  await expect(memberRow).toBeVisible();
  await memberRow.getByLabel("设备角色").selectOption("owner");
  await expect(page.getByText("设备角色已更新。")).toBeVisible();

  await memberContext.close();
  await page.getByLabel("输入家庭显示名称或“永久删除”").fill(displayName);
  await page.getByRole("button", { name: "永久删除服务器空间" }).click();
  await expect(page.getByText("服务器同步空间已永久删除，本机数据保持不变。")).toBeVisible();
});

test("加入页和同步管理页可离线重开", async ({ browserName, context, page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/join");
  await expect(page.getByRole("heading", { name: "加入家庭同步" })).toBeVisible();
  await waitForCachedRoute(page, "/join");
  await page.goto("/settings/sync");
  await expect(page.getByRole("heading", { name: "家庭同步" })).toBeVisible();
  await waitForCachedRoute(page, "/settings/sync");
  await context.setOffline(true);
  if (browserName === "webkit") {
    expect(await page.evaluate(async () => Boolean((await caches.match("/settings/sync", { ignoreSearch: true }))?.ok))).toBe(true);
  } else {
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "家庭同步" })).toBeVisible();
    if (await page.evaluate(() => navigator.onLine)) {
      await expect(page.getByRole("button", { name: "重新检查同步服务" })).toBeVisible();
    } else {
      await expect(page.getByText("当前离线：可查看本机已知状态，管理操作需要联网。")).toBeVisible();
    }
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("同步服务临时失败后可在不刷新页面的情况下重试", async ({ page }) => {
  let attempts = 0;
  await page.route("**/api/sync/service-info", async (route) => {
    attempts += 1;
    if (attempts === 1) {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "同步服务暂时不可用。" }),
      });
      return;
    }
    await route.continue();
  });

  await page.goto("/settings/sync", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("同步服务暂时不可用。")).toBeVisible();
  expect(await page.evaluate(() => navigator.onLine)).toBe(true);
  await page.getByRole("button", { name: "重新检查同步服务" }).click();
  await expect(page.getByText("同步服务暂时不可用。")).toHaveCount(0);
  expect(attempts).toBeGreaterThanOrEqual(2);
});

test("已有同步会话时加入按钮等待检查并要求替换确认", async ({ page }) => {
  const invite = `DK2.${"a".repeat(64)}.${"A".repeat(20)}`;
  await page.addInitScript(() => {
    localStorage.setItem(
      "dadkit:v3:sync-session",
      JSON.stringify({
        version: 2,
        protocolVersion: 2,
        spaceId: "b".repeat(64),
        displayName: "现有家庭",
        sessionId: "c".repeat(64),
        deviceName: "当前设备",
        role: "member",
        joinedAt: "2026-08-01T00:00:00.000Z",
      }),
    );
  });

  await page.goto(`/join#invite=${invite}`, { waitUntil: "domcontentloaded" });
  const joinButton = page.getByRole("button", { name: "加入家庭同步" });
  await expect(page.getByText(/当前连接“现有家庭”/)).toBeVisible({ timeout: 30_000 });
  await expect(joinButton).toBeDisabled();
  await page.getByRole("checkbox").check();
  await expect(joinButton).toBeEnabled();
});
