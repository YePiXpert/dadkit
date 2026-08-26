import { expect, type Page } from "@playwright/test";
import type { PrimaryNavigationItem } from "@/lib/navigation";

export type PrimaryNavigationLabel = PrimaryNavigationItem["label"];

export async function dismissBirthCelebration(
  page: Page,
  babyName?: string,
) {
  const name = babyName?.trim();
  const dialog = page.getByRole("dialog", {
    name: name ? `${name}出生了！` : "宝宝出生了！",
  });

  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "知道了" }).click();
  await expect(dialog).toBeHidden();
}

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

  const toolEntry = page.getByRole("link", {
    name: new RegExp(`^${escapeRegExp(toolName)}(?:\\s|$)`),
  });
  await expect(toolEntry).toBeVisible({ timeout: 60_000 });
  await toolEntry.click();
  await expectPathname(page, pathname);
}

export async function expectPathname(page: Page, pathname: string) {
  await expect.poll(() => new URL(page.url()).pathname).toBe(pathname);
}

export async function waitForOfflineReady(page: Page, route: string) {
  await expect
    .poll(
      () =>
        page.evaluate(async (candidate) => {
          if (!("serviceWorker" in navigator)) {
            return {
              registered: false,
              active: false,
              installing: null,
              waiting: null,
              routeCached: false,
              readyMarker: false,
              missingAssets: ["service-worker-unavailable"],
            };
          }
          const registration = await navigator.serviceWorker.getRegistration();
          const routeResponse = await caches.match(candidate, {
            ignoreSearch: true,
          });
          const assetUrls = performance
            .getEntriesByType("resource")
            .map((entry) => new URL(entry.name, window.location.href))
            .filter(
              (url) =>
                url.origin === window.location.origin &&
                url.pathname.startsWith("/_next/static/"),
            );
          const assetResponses = await Promise.all(
            assetUrls.map((url) => caches.match(url.href)),
          );

          return {
            registered: Boolean(registration),
            active: Boolean(registration?.active),
            installing: registration?.installing?.state ?? null,
            waiting: registration?.waiting?.state ?? null,
            routeCached: Boolean(routeResponse?.ok),
            readyMarker:
              document.documentElement.dataset.dadkitOfflineReady === "true",
            missingAssets: assetUrls
              .filter((_, index) => !assetResponses[index]?.ok)
              .map((url) => url.pathname),
          };
        }, route),
      { timeout: 120_000 },
    )
    .toMatchObject({
      registered: true,
      active: true,
      routeCached: true,
      readyMarker: true,
      missingAssets: [],
    });
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
