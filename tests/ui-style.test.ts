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
const checklistWorkspace = readSource("components", "ChecklistWorkspace.tsx");
const checklistGroupTabs = readSource("components", "ChecklistGroupTabs.tsx");
const checklistItemRow = readSource("components", "ChecklistItemRow.tsx");
const checklistCategoryCard = readSource(
  "components",
  "ChecklistCategoryCard.tsx",
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
    expect(globals).toContain("--background: 36 55% 96%");
    expect(globals).toContain("--foreground: 345 15% 20%");
    expect(globals).toContain("--primary: 348 72% 48%");
    expect(globals).toContain("--secondary: 350 70% 96%");
    expect(globals).toContain("--muted: 36 32% 93%");
    expect(globals).toContain("--border: 33 30% 89%");
    expect(globals).toContain("--radius: 1rem");
    expect(globals).toContain("max-w-[390px]");
    expect(globals).toContain("max-width: min(100%, 390px)");
    expect(globals).toContain("overflow-x: hidden");
    expect(globals).toContain("touch-action: pan-x pan-y");
    expect(layout).toContain('themeColor: "#D32246"');
    expect(layout).toContain(
      '{ url: "/maskable-icon-512.png", sizes: "512x512", type: "image/png" }',
    );
    expect(layout).toContain('viewportFit: "cover"');
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

  it("uses one two-item navigation model on mobile and desktop", () => {
    expect(
      PRIMARY_NAVIGATION_ITEMS.map(({ href, id, label }) => ({ href, id, label })),
    ).toEqual([
      { href: "/", id: "checklist", label: "清单" },
      { href: "/settings", id: "me", label: "我的" },
    ]);

    const checklistNav = PRIMARY_NAVIGATION_ITEMS[0];
    const myNav = PRIMARY_NAVIGATION_ITEMS[1];

    expect(isPrimaryNavigationItemActive("/", checklistNav)).toBe(true);
    expect(isPrimaryNavigationItemActive("/settings", checklistNav)).toBe(false);
    expect(isPrimaryNavigationItemActive("/settings", myNav)).toBe(true);
    expect(isPrimaryNavigationItemActive("/timeline/today", myNav)).toBe(true);
    expect(isPrimaryNavigationItemActive("/", myNav)).toBe(false);

    for (const source of [mobileNav, appHeader]) {
      expect(source).toContain("PRIMARY_NAVIGATION_ITEMS.map");
      expect(source).toContain('aria-label="主导航"');
      expect(source).toContain('aria-current={active ? "page" : undefined}');
    }

    expect(mobileNav).toContain("grid grid-cols-2");
    expect(mobileNav).toContain("env(safe-area-inset-bottom)");
  });

  it("renders the three-view checklist workspace at the root URL", () => {
    expect(homePage).toContain("<ChecklistWorkspace />");
    expect(checklistWorkspace).toContain("<ChecklistGroupTabs");
    expect(checklistWorkspace).toContain("getChecklistViewCounts");
    expect(checklistWorkspace).toContain("getChecklistViewItems");
    expect(checklistWorkspace).not.toMatch(/if\s*\(\s*!profile\s*\)/);
    expect(checklistGroupTabs).toContain("grid grid-cols-3");
    expect(checklistGroupTabs).toContain('aria-label="清单视图"');
    expect(checklistGroupTabs).not.toContain("overflow-x-auto");
  });

  it("keeps checklist controls touch-friendly and narrow-screen text readable", () => {
    expect(checklistGroupTabs).toContain("min-h-14");
    expect(checklistItemRow).toContain("size-10");
    expect(checklistItemRow).toContain("break-words text-sm font-semibold leading-5");
    expect(checklistCategoryCard).toContain("break-words text-sm font-semibold leading-5");
    expect(checklistCategoryCard).toContain("aria-expanded={open}");
    expect(button).toContain("rounded-lg");
    expect(card).toContain("rounded-xl");
    expect(card).toContain("border-border");
    expect(card).toContain("bg-card");
  });

  it("keeps optional profile and tools inside My rather than the primary nav", () => {
    expect(settingsPage).toContain(">我的</h1>");
    expect(settingsPage).toContain("添加可选资料");
    expect(settingsPage).toContain("不填也能正常使用");
    expect(settingsPage).toContain("常用工具");
    expect(settingsPage).toContain('href="/hospital"');
    expect(settingsPage).toContain('href="/timeline"');
    expect(settingsPage).toContain('href="/contractions"');
    expect(settingsPage).toContain('href="/go"');
    expect(settingsPage).toContain('href="/birth-plan"');
    expect(settingsPage).toContain('href="/postpartum"');
    expect(settingsPage).toContain('href="/share"');
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
