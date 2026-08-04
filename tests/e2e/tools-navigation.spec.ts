import { expect, test } from "@playwright/test";

import {
  expectOnlyPrimaryNavigationItemActive,
  expectPathname,
  openToolFromHome,
  seedCompletedOnboarding,
} from "@/tests/e2e/helpers";

const TOOL_ROUTES = [
  {
    entryName: "孕期成长记",
    heading: "宝宝成长记",
    pathname: "/growth",
  },
  {
    entryName: "准备出发",
    heading: "准备出发",
    pathname: "/departure",
  },
  {
    entryName: "医院档案",
    heading: "医院档案",
    pathname: "/hospital",
  },
  {
    entryName: "家庭分工与采购",
    heading: "家庭分工与采购",
    pathname: "/planning",
  },
] as const;

test.describe.configure({ timeout: 120_000 });
test.beforeEach(async ({ page }) => {
  await seedCompletedOnboarding(page);
});

test("首页工具入口可到达全部工具页面且只激活工具导航", async ({
  page,
}) => {
  for (const route of TOOL_ROUTES) {
    await test.step(route.entryName, async () => {
      await openToolFromHome(page, route.entryName, route.pathname);
      await expect(
        page.getByRole("heading", { name: route.heading, exact: true }),
      ).toBeVisible({ timeout: 60_000 });
      await expectOnlyPrimaryNavigationItemActive(page, "工具");
    });
  }
});

test("首页开始分工快捷入口可到达分工页面", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const planningEntry = page.getByRole("link", { name: "开始分工" });
  await expect(planningEntry).toBeVisible({ timeout: 60_000 });
  await planningEntry.click();

  await expectPathname(page, "/planning");
  await expect(
    page.getByRole("heading", { name: "家庭分工与采购", exact: true }),
  ).toBeVisible();
  await expectOnlyPrimaryNavigationItemActive(page, "工具");
});
