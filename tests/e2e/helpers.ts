import { expect, type Page } from "@playwright/test";
import type { PrimaryNavigationItem } from "@/lib/navigation";

export type PrimaryNavigationLabel = PrimaryNavigationItem["label"];

export async function expectOnlyPrimaryNavigationItemActive(
  page: Page,
  label: PrimaryNavigationLabel,
) {
  const navigation = page.getByRole("navigation", { name: "主导航" });

  await expect(navigation).toBeVisible();
  await expect(navigation.locator('[aria-current="page"]')).toHaveCount(1);
  await expect(
    navigation.getByRole("link", { name: label, exact: true }),
  ).toHaveAttribute("aria-current", "page");
}

export async function openToolFromHome(
  page: Page,
  toolName: string,
  pathname: string,
) {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const toolsEntry = page.getByRole("link", {
    name: /^全部工具(?:\s|$)/,
  });
  await expect(toolsEntry).toBeVisible({ timeout: 60_000 });
  await toolsEntry.click();
  await expectPathname(page, "/tools");

  const toolEntry = page.getByRole("link", {
    name: new RegExp(`^${escapeRegExp(toolName)}(?:\\s|$)`),
  });
  await expect(toolEntry).toBeVisible();
  await toolEntry.click();
  await expectPathname(page, pathname);
}

export async function expectPathname(page: Page, pathname: string) {
  await expect.poll(() => new URL(page.url()).pathname).toBe(pathname);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function seedCompletedOnboarding(page: Page) {
  await page.addInitScript(() => {
    if (!window.localStorage.getItem("dadkit:v4:device-identity")) {
      window.localStorage.setItem("dadkit:v4:device-identity", JSON.stringify({
        version: 1,
        currentMemberId: null,
        preferredEntry: "auto",
        onboardingCompletedAt: 1,
      }));
    }
  });
}

export async function seedFamily(page: Page) {
  await page.addInitScript(() => {
    const members = {
      "member-jiang": {
        id: "member-jiang",
        createdAt: 1,
        displayName: { value: "小江", updatedAt: 1 },
        relationshipLabel: { value: "家长", updatedAt: 1 },
        deleted: { value: false, updatedAt: 1 },
      },
      "member-nai": {
        id: "member-nai",
        createdAt: 2,
        displayName: { value: "奶奶", updatedAt: 2 },
        relationshipLabel: { value: "祖辈", updatedAt: 2 },
        deleted: { value: false, updatedAt: 2 },
      },
    };
    if (!window.localStorage.getItem("dadkit:v4:household")) {
      window.localStorage.setItem("dadkit:v4:household", JSON.stringify({
        version: 1,
        clearedAt: 0,
        householdName: { value: "小满之家", updatedAt: 1 },
        members,
      }));
    }
    if (!window.localStorage.getItem("dadkit:v4:device-identity")) {
      window.localStorage.setItem("dadkit:v4:device-identity", JSON.stringify({
        version: 1,
        currentMemberId: "member-jiang",
        preferredEntry: "auto",
        onboardingCompletedAt: 1,
      }));
    }
  });
}
