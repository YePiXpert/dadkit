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
] as const;

test.describe.configure({ timeout: 120_000 });
test.beforeEach(async ({ page }) => {
  await seedCompletedOnboarding(page);
});

test("首页宫格入口可到达各工具页面且只激活工具导航", async ({
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

test("家庭分工入口已下线且旧链接回到工具页", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("家庭分工", { exact: false })).toHaveCount(0);

  await page.goto("/planning", { waitUntil: "domcontentloaded" });
  await expectPathname(page, "/tools");
  await expect(page.getByRole("heading", { name: "工具", exact: true })).toBeVisible();
  await expectOnlyPrimaryNavigationItemActive(page, "工具");
});

test("成长时间表默认聚焦当前阶段并可展开全部孕周", async ({ page }) => {
  await page.goto("/growth", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "宝宝成长记", exact: true }),
  ).toBeVisible({ timeout: 60_000 });

  const timeline = page.locator(
    'section[aria-labelledby="growth-timeline-title"]',
  );
  await expect(timeline.getByRole("heading", { level: 3 })).toHaveCount(1);

  await timeline.getByRole("button", { name: "展开全部 33 周" }).click();
  await expect(timeline.getByRole("heading", { level: 3 })).toHaveCount(3);

  await timeline.getByRole("button", { name: "收起时间表" }).click();
  await expect(timeline.getByRole("heading", { level: 3 })).toHaveCount(1);
});

test("工具页展示管理与支持入口", async ({ page }) => {
  await page.goto("/tools", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "管理与支持", exact: true }),
  ).toBeVisible({ timeout: 60_000 });

  for (const name of ["家庭成员", "备份与恢复", "家庭同步", "帮助与反馈"]) {
    await expect(
      page.getByRole("link", { name: new RegExp(`^${name}(?:\\s|$)`) }),
    ).toBeVisible();
  }
});
