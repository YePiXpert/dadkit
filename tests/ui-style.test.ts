import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  isPrimaryNavigationItemActive,
  PRIMARY_NAVIGATION_ITEMS,
} from "@/lib/navigation";

function readSource(...segments: string[]) {
  return readFileSync(join(process.cwd(), ...segments), "utf8");
}

const globals = readSource("app", "globals.css");
const layout = readSource("app", "layout.tsx");
const homePage = readSource("app", "page.tsx");
const settingsPage = readSource("app", "settings", "page.tsx");
const checklistSettingsPage = readSource(
  "app",
  "settings",
  "checklist",
  "page.tsx",
);
const backupSettingsPage = readSource(
  "app",
  "settings",
  "backup",
  "page.tsx",
);
const checklistWorkspace = readSource("components", "ChecklistWorkspace.tsx");
const checklistGroupTabs = readSource("components", "ChecklistGroupTabs.tsx");
const checklistItemRow = readSource("components", "ChecklistItemRow.tsx");
const checklistCategoryCard = readSource(
  "components",
  "ChecklistCategoryCard.tsx",
);
const checklistSectionWorkspace = readSource(
  "components",
  "ChecklistSectionWorkspace.tsx",
);
const mobileNav = readSource("components", "MobileNav.tsx");
const appHeader = readSource("components", "AppHeader.tsx");
const pwaRegister = readSource("components", "PwaRegister.tsx");
const button = readSource("components", "ui", "button.tsx");
const card = readSource("components", "ui", "card.tsx");
const nextConfig = readSource("next.config.ts");
const packageJson = JSON.parse(readSource("package.json")) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts: Record<string, string>;
};

describe("V2 PWA visual and navigation contract", () => {
  it("keeps the warm, compact mobile design tokens", () => {
    expect(globals).toContain("--background: 40 43% 97%");
    expect(globals).toContain("--foreground: 28 16% 14%");
    expect(globals).toContain("--primary: 6 43% 51%");
    expect(globals).toContain("--secondary: 11 71% 93%");
    expect(globals).toContain("--muted: 35 38% 92%");
    expect(globals).toContain("--border: 36 32% 86%");
    expect(globals).toContain("--radius: 1.75rem");
    expect(globals).toContain("max-width: min(100%, 430px)");
    expect(globals).toContain("@media (min-width: 360px)");
    expect(globals).toContain("grid-template-columns: repeat(2, minmax(0, 1fr))");
    expect(globals).toContain("overflow-x: hidden");
    expect(globals).toContain("touch-action: pan-x pan-y");
    expect(layout).toContain(
      '{ media: "(prefers-color-scheme: light)", color: "#FBF8F2" }',
    );
    expect(layout).toContain(
      '{ media: "(prefers-color-scheme: dark)", color: "#1A1714" }',
    );
    expect(layout).toContain(
      '{ url: "/maskable-icon-512.png", sizes: "512x512", type: "image/png" }',
    );
    expect(layout).toContain('viewportFit: "cover"');
  });

  it("ships a dark palette and keeps colors on design tokens", () => {
    expect(globals).toContain(".dark {");
    expect(globals).toContain("--hero-from:");
    expect(globals).toContain("--warning:");
    expect(layout).toContain("suppressHydrationWarning");
    expect(layout).toContain("themeInitScript");

    for (const source of [
      settingsPage,
      checklistSettingsPage,
      backupSettingsPage,
      checklistWorkspace,
      checklistSectionWorkspace,
    ]) {
      expect(source).not.toContain("#eadfce");
      expect(source).not.toContain("#fbe3de");
      expect(source).not.toContain("amber-");
      expect(source).not.toContain("bg-white");
    }
  });

  it("ships as a standalone web PWA without a native build surface", () => {
    const dependencyNames = Object.keys({
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    });

    expect(dependencyNames.some((name) => name.startsWith("@capacitor/"))).toBe(
      false,
    );
    expect(Object.keys(packageJson.scripts).some((name) => name.startsWith("mobile:"))).toBe(
      false,
    );
    expect(nextConfig).toContain('output: "standalone"');
    expect(nextConfig).not.toContain("DADKIT_CAPACITOR_EXPORT");
    expect(pwaRegister).not.toContain("gesturestart");
    expect(pwaRegister).not.toContain("preventDoubleTapZoom");
  });

  it("uses one checklist-and-mine navigation model on mobile and desktop", () => {
    expect(
      PRIMARY_NAVIGATION_ITEMS.map(({ href, id, label }) => ({ href, id, label })),
    ).toEqual([
      { href: "/", id: "checklist", label: "清单" },
      { href: "/settings", id: "mine", label: "我的" },
    ]);

    const checklistNav = PRIMARY_NAVIGATION_ITEMS[0];
    const mineNav = PRIMARY_NAVIGATION_ITEMS[1];

    expect(isPrimaryNavigationItemActive("/", checklistNav)).toBe(true);
    expect(isPrimaryNavigationItemActive("/settings", checklistNav)).toBe(false);
    expect(isPrimaryNavigationItemActive("/settings", mineNav)).toBe(true);
    expect(isPrimaryNavigationItemActive("/settings/backup", mineNav)).toBe(true);
    expect(isPrimaryNavigationItemActive("/growth", mineNav)).toBe(true);
    expect(isPrimaryNavigationItemActive("/privacy", mineNav)).toBe(true);
    expect(isPrimaryNavigationItemActive("/support", mineNav)).toBe(true);
    expect(isPrimaryNavigationItemActive("/timeline/today", mineNav)).toBe(false);
    expect(isPrimaryNavigationItemActive("/", mineNav)).toBe(false);

    for (const source of [mobileNav, appHeader]) {
      expect(source).toContain("PRIMARY_NAVIGATION_ITEMS.map");
      expect(source).toContain('aria-label="主导航"');
      expect(source).toContain('aria-current={active ? "page" : undefined}');
    }

    expect(mobileNav).toContain("grid grid-cols-2");
    expect(mobileNav).toContain("env(safe-area-inset-bottom)");
  });

  it("renders the four-view checklist workspace at the root URL", () => {
    expect(homePage).toContain("<ChecklistWorkspace />");
    expect(checklistWorkspace).toContain("<ChecklistGroupTabs");
    expect(checklistWorkspace).toContain("deriveChecklistView");
    expect(checklistWorkspace).toContain("visibleItems");
    expect(checklistWorkspace).not.toMatch(/if\s*\(\s*!profile\s*\)/);
    expect(checklistGroupTabs).toContain("grid grid-cols-4");
    expect(checklistGroupTabs).toContain('aria-label="清单视图"');
    expect(checklistGroupTabs).not.toContain("overflow-x-auto");
  });

  it("keeps checklist controls touch-friendly and narrow-screen text readable", () => {
    expect(checklistGroupTabs).toContain("min-h-14");
    expect(checklistItemRow).toContain("size-11");
    expect(checklistItemRow).toContain("break-words text-sm font-semibold leading-5");
    expect(checklistCategoryCard).toContain("break-words text-sm font-semibold leading-5");
    expect(checklistCategoryCard).toContain("href={href}");
    expect(checklistSectionWorkspace).toContain('className="item-card-grid"');
    expect(globals).toContain("@media (min-width: 360px)");
    expect(globals).toContain("grid-template-columns: repeat(2, minmax(0, 1fr))");
    expect(checklistItemRow).toContain("ChecklistItemIllustration");
    expect(button).toContain("rounded-full");
    expect(card).toContain("rounded-[1.75rem]");
    expect(card).toContain("border border-border");
    expect(card).toContain("bg-card");
  });

  it("keeps update notices clear of the fixed add-item control", () => {
    expect(globals).toContain(
      "bottom: calc(10.75rem + env(safe-area-inset-bottom));",
    );
    expect(globals).toContain(
      "bottom: calc(6.5rem + env(safe-area-inset-bottom));",
    );
    expect(pwaRegister).toContain("safe-bottom-toast");
    expect(checklistWorkspace).toContain("safe-bottom-fab");
  });

  it("keeps 我的 as a simple entry surface with subordinate settings pages", () => {
    expect(settingsPage).toContain("我的");
    expect(settingsPage).toContain('href: "/growth"');
    expect(settingsPage).toContain('href: "/settings/checklist"');
    expect(settingsPage).toContain('href: "/settings/backup"');
    expect(checklistSettingsPage).toContain("显示物品说明");
    expect(backupSettingsPage).toContain("本机恢复点");
    expect(backupSettingsPage).toContain("WebDAV 备份");
    expect(backupSettingsPage).toContain("清空并重新开始");
    expect(backupSettingsPage).not.toContain("复制 JSON");
    expect(settingsPage).not.toContain("添加可选资料");
    expect(settingsPage).not.toContain("常用工具");

    for (const route of [
      "/setup",
      "/hospital",
      "/timeline",
      "/contractions",
      "/go",
      "/birth-plan",
      "/postpartum",
      "/share",
    ]) {
      expect(settingsPage).not.toContain(`href="${route}"`);
    }
  });

  it("does not reintroduce illustration-driven or dashboard styling", () => {
    for (const source of [
      homePage,
      checklistWorkspace,
      checklistGroupTabs,
      checklistItemRow,
      checklistCategoryCard,
      settingsPage,
    ]) {
      expect(source).not.toContain("CuteIllustration");
      expect(source).not.toContain("illustrationVariant");
      expect(source).not.toContain("/illustrations/");
      expect(source).not.toContain("buildPreparationSummary");
    }
  });
});
