import type { Page } from "@playwright/test";

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
