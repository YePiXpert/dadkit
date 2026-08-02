import {
  expect,
  test,
  type BrowserContext,
  type Locator,
  type Page,
} from "@playwright/test";
import { seedCompletedOnboarding } from "@/tests/e2e/helpers";

test.describe.configure({ timeout: 120_000 });
test.beforeEach(async ({ page }) => { await seedCompletedOnboarding(page); });

async function stubClipboard(page: Page) {
  await page.addInitScript(() => {
    const state = window as typeof window & { __dadkitCopiedAddress?: string };

    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          state.__dadkitCopiedAddress = value;
        },
      },
    });
  });
}

async function fillHospital(page: Page) {
  await page.locator("#hospital-hospitalName").fill("市妇幼保健院");
  await page.locator("#hospital-campusName").fill("滨江院区");
  await page.locator("#hospital-maternityPhone").fill("+86 (010) 1234-5678");
  await page.locator("#hospital-emergencyPhone").fill("120");
  await page.locator("#hospital-address").fill("健康路 1 号");
  await page.locator("#hospital-laborEntranceNote").fill("夜间从东门进入");
  await page.locator("#hospital-parkingNote").fill("地下二层 B 区");
}

async function dismissTransientUi(page: Page) {
  const closeToast = page.getByRole("button", { name: "关闭提示" });

  if ((await closeToast.count()) > 0 && (await closeToast.isVisible())) {
    await closeToast.click();
  }

  const deferUpdate = page.getByRole("button", { name: "稍后", exact: true });

  if ((await deferUpdate.count()) > 0 && (await deferUpdate.isVisible())) {
    await deferUpdate.click();
    return;
  }

  const refresh = page.getByRole("button", { name: "刷新", exact: true });

  if ((await refresh.count()) > 0 && (await refresh.isVisible())) {
    await refresh.click();
    await page.waitForTimeout(1_000);
    await page.waitForLoadState("domcontentloaded");
  }
}

async function clickCentered(locator: Locator) {
  await locator.evaluate((element) =>
    element.scrollIntoView({ block: "center", inline: "nearest" }),
  );
  await locator.click();
}

test("从准备出发进入，保存后刷新并显示摘要、复制和拨号操作", async ({
  page,
}) => {
  await stubClipboard(page);
  await page.goto("/departure", { waitUntil: "domcontentloaded" });
  const entry = page.getByRole("link", { name: "填写医院档案" });
  await expect(entry).toBeVisible({ timeout: 60_000 });
  await entry.click();

  await expect(page).toHaveURL(/\/hospital\?from=departure$/);
  await expect(
    page.getByRole("heading", { name: "医院档案", exact: true }),
  ).toBeVisible();
  await page.waitForTimeout(1_000);
  await dismissTransientUi(page);
  await page.getByRole("button", { name: "填写医院档案" }).click();
  await fillHospital(page);
  await dismissTransientUi(page);
  await clickCentered(page.getByRole("button", { name: "保存档案" }));

  await expect(page.getByText("医院档案已保存。")).toBeVisible();
  await dismissTransientUi(page);
  await expect(page.getByRole("heading", { name: "市妇幼保健院" })).toBeVisible();
  await expect(page.getByText("健康路 1 号", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "拨打产科或住院电话" }),
  ).toHaveAttribute("href", "tel:+8601012345678");
  await expect(page.getByRole("link", { name: "拨打急诊电话" })).toHaveAttribute(
    "href",
    "tel:120",
  );

  await page.getByRole("button", { name: "复制医院地址" }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { __dadkitCopiedAddress?: string })
            .__dadkitCopiedAddress,
      ),
    )
    .toBe("健康路 1 号");

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "市妇幼保健院" })).toBeVisible();
  await page.getByRole("link", { name: "返回准备出发" }).click();
  await expect(page.getByText("市妇幼保健院 · 滨江院区")).toBeVisible();
  await expect(page.getByText("出发提示：夜间从东门进入")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "拨打产科或住院电话" }),
  ).toHaveAttribute("href", "tel:+8601012345678");
});

test("从首页快捷入口进入，取消不保存且清空需要二次确认", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: /医院档案/ }).click();
  await expect(page).toHaveURL(/\/hospital$/);
  await page.waitForTimeout(1_000);
  await dismissTransientUi(page);

  await page.getByRole("button", { name: "填写医院档案" }).click();
  await page.locator("#hospital-hospitalName").fill("中心医院");
  await page.locator("#hospital-address").fill("原地址");
  await dismissTransientUi(page);
  await clickCentered(page.getByRole("button", { name: "保存档案" }));
  await dismissTransientUi(page);

  await page.getByRole("button", { name: "编辑档案" }).click();
  await page.locator("#hospital-address").fill("不应保存的草稿地址");
  await clickCentered(page.getByRole("button", { name: "取消" }));
  await expect(page.getByText("原地址", { exact: true })).toBeVisible();
  await expect(page.getByText("不应保存的草稿地址")).toHaveCount(0);

  await page.getByRole("button", { name: "清空档案" }).click();
  const dialog = page.getByRole("dialog", { name: "确认清空医院档案？" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "取消" }).click();
  await expect(page.getByRole("heading", { name: "中心医院" })).toBeVisible();

  await page.getByRole("button", { name: "清空档案" }).click();
  await page
    .getByRole("dialog", { name: "确认清空医院档案？" })
    .getByRole("button", { name: "清空医院档案" })
    .click();
  await expect(page.getByText("还没有填写医院档案")).toBeVisible();
  await expect(page.getByText("医院档案已清空。")).toBeVisible();
});

test("直接访问 360×800 页面无横向溢出且只有我的导航激活", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/hospital", { waitUntil: "domcontentloaded" });

  await expect(
    page.getByRole("heading", { name: "医院档案", exact: true }),
  ).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("link", { name: "我的", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(
    page.getByRole("link", { name: "清单", exact: true }),
  ).not.toHaveAttribute("aria-current", "page");
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
});

test("首次访问后可离线重开并保留医院档案", async ({
  browserName,
  context,
  page,
}: {
  browserName: string;
  context: BrowserContext;
  page: Page;
}) => {
  await page.goto("/hospital", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "填写医院档案" })).toBeVisible({
    timeout: 60_000,
  });
  await page.getByRole("button", { name: "填写医院档案" }).click();
  await page.locator("#hospital-hospitalName").fill("离线医院");
  await page.locator("#hospital-address").fill("离线地址 9 号");
  await page.getByRole("button", { name: "保存档案" }).click();

  await expect
    .poll(() =>
      page.evaluate(async () => {
        if (!("serviceWorker" in navigator)) return false;
        const registration = await navigator.serviceWorker.getRegistration();
        const cached = await caches.match("/hospital", { ignoreSearch: true });
        return Boolean(registration?.active && cached?.ok);
      }),
      { timeout: 60_000 },
    )
    .toBe(true);

  await context.setOffline(true);

  if (browserName === "webkit") {
    const cachedHospitalPage = await page.evaluate(async () => {
      const cached = await caches.match("/hospital", { ignoreSearch: true });
      return Boolean(cached?.ok && (await cached.text()).includes("<html"));
    });
    expect(cachedHospitalPage).toBe(true);
    await page.getByRole("button", { name: "编辑档案" }).click();
    await expect(page.locator("#hospital-hospitalName")).toHaveValue("离线医院");
    return;
  }

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "离线医院" })).toBeVisible();
  await expect(page.getByText("离线地址 9 号", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "编辑档案" }).click();
  await expect(page.locator("#hospital-hospitalName")).toHaveValue("离线医院");
});
