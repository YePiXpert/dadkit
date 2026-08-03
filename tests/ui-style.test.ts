import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  isPrimaryNavigationItemActive,
  PRIMARY_NAVIGATION_ITEMS,
  showsMobileNavigation,
} from "@/lib/navigation";

function readSource(...segments: string[]) {
  return readFileSync(join(process.cwd(), ...segments), "utf8");
}

const globals = readSource("app", "globals.css");
const layout = readSource("app", "layout.tsx");
const homePage = readSource("app", "page.tsx");
const checklistPage = readSource("app", "checklist", "page.tsx");
const growthPage = readSource("app", "growth", "page.tsx");
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
const appToast = readSource("components", "AppToast.tsx");
const babyQuickActionDialog = readSource(
  "components",
  "baby",
  "BabyQuickActionDialog.tsx",
);
const pwaRegister = readSource("components", "PwaRegister.tsx");
const button = readSource("components", "ui", "button.tsx");
const card = readSource("components", "ui", "card.tsx");
const nextConfig = readSource("next.config.ts");
const tailwindConfig = readSource("tailwind.config.ts");
const packageJson = JSON.parse(readSource("package.json")) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts: Record<string, string>;
};

describe("V3 PWA visual and navigation contract", () => {
  it("keeps the warm, compact mobile design tokens", () => {
    expect(globals).toContain("--background: 40 43% 97%");
    expect(globals).toContain("--background-glow: 32 85% 96%");
    expect(globals).toContain("--foreground: 28 16% 14%");
    expect(globals).toContain("--primary: 7 58% 52%");
    expect(globals).toContain("--secondary: 12 70% 92%");
    expect(globals).toContain("--muted: 35 38% 92%");
    expect(globals).toContain("--muted-foreground: 28 12% 42%");
    expect(globals).toContain("--border: 36 32% 86%");
    expect(globals).toContain("--ring: 7 58% 52%");
    expect(globals).toContain("--radius: 1.75rem");
    expect(globals).toContain("sm:max-w-[42rem]");
    expect(globals).toContain("xs:grid-cols-2");
    expect(tailwindConfig).toContain('xs: "360px"');
    expect(globals).toContain("overflow-x: hidden");
    expect(globals).toContain("touch-action: pan-x pan-y");
    expect(globals).toContain("font-family:\n      MiSans");
    expect(layout).toContain('precedence="font"');
    expect(layout).toContain("MISANS_STYLESHEETS");
    expect(tailwindConfig).toContain('MiSans"');
    expect(tailwindConfig).toContain(
      'sm: "0 1px 2px rgb(64 45 31 / 0.04), 0 10px 28px -12px rgb(64 45 31 / 0.10)"',
    );
    expect(tailwindConfig).toContain(
      'glow: "0 6px 20px -6px hsl(var(--primary) / 0.28)"',
    );
    expect(layout).toContain(
      '{ media: "(prefers-color-scheme: light)", color: "#FBF8F2" }',
    );
    expect(layout).toContain(
      '{ media: "(prefers-color-scheme: dark)", color: "#1A1714" }',
    );
    expect(layout).toContain(
      '{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }',
    );
    expect(layout).toContain('viewportFit: "cover"');
  });

  it("ships a dark palette and keeps colors on design tokens", () => {
    expect(globals).toContain(".dark {");
    expect(globals).toContain("--hero-from:");
    expect(globals).toContain("--warning:");
    expect(globals).toContain("--surface-art:");
    expect(globals).toContain("--confetti-coral:");
    expect(layout).toContain("suppressHydrationWarning");
    expect(layout).toContain("themeInitScript");
    expect(growthPage).toContain('url: "/og-growth.png"');
    expect(growthPage).toContain('images: ["/og-growth.png"]');

    for (const source of [
      settingsPage,
      checklistSettingsPage,
      backupSettingsPage,
      checklistWorkspace,
      checklistSectionWorkspace,
      appToast,
      babyQuickActionDialog,
    ]) {
      expect(source).not.toContain("#eadfce");
      expect(source).not.toContain("#fbe3de");
      expect(source).not.toContain("amber-");
      expect(source).not.toContain("bg-white");
    }
  });

  it("ships standalone web and a dependency-light bundled Android surface", () => {
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
    expect(nextConfig).toContain(
      'output: isAndroidBundle ? "export" : "standalone"',
    );
    expect(nextConfig).toContain('DADKIT_BUILD_TARGET === "android"');
    expect(nextConfig).not.toContain("DADKIT_CAPACITOR_EXPORT");
    expect(pwaRegister).not.toContain("gesturestart");
    expect(pwaRegister).not.toContain("preventDoubleTapZoom");
  });

  it("uses a five-tab navigation model on mobile and desktop", () => {
    expect(
      PRIMARY_NAVIGATION_ITEMS.map(({ href, id, label }) => ({ href, id, label })),
    ).toEqual([
      { href: "/", id: "home", label: "首页" },
      { href: "/checklist", id: "checklist", label: "清单" },
      { href: "/baby", id: "baby", label: "宝宝" },
      { href: "/tools", id: "tools", label: "工具" },
      { href: "/settings", id: "mine", label: "我的" },
    ]);

    const homeNav = PRIMARY_NAVIGATION_ITEMS[0];
    const checklistNav = PRIMARY_NAVIGATION_ITEMS.find(
      (item) => item.id === "checklist",
    )!;
    const toolsNav = PRIMARY_NAVIGATION_ITEMS.find(
      (item) => item.id === "tools",
    )!;
    const mineNav = PRIMARY_NAVIGATION_ITEMS.find((item) => item.id === "mine")!;

    expect(isPrimaryNavigationItemActive("/", homeNav)).toBe(true);
    expect(isPrimaryNavigationItemActive("/checklist", homeNav)).toBe(false);
    expect(isPrimaryNavigationItemActive("/checklist", checklistNav)).toBe(true);
    expect(isPrimaryNavigationItemActive("/", checklistNav)).toBe(false);
    expect(isPrimaryNavigationItemActive("/departure", checklistNav)).toBe(false);
    expect(isPrimaryNavigationItemActive("/planning", checklistNav)).toBe(false);
    expect(isPrimaryNavigationItemActive("/settings", checklistNav)).toBe(false);

    expect(isPrimaryNavigationItemActive("/tools", toolsNav)).toBe(true);
    expect(isPrimaryNavigationItemActive("/growth", toolsNav)).toBe(true);
    expect(isPrimaryNavigationItemActive("/departure", toolsNav)).toBe(true);
    expect(isPrimaryNavigationItemActive("/hospital", toolsNav)).toBe(true);
    expect(isPrimaryNavigationItemActive("/planning", toolsNav)).toBe(true);
    expect(isPrimaryNavigationItemActive("/settings", toolsNav)).toBe(false);

    expect(isPrimaryNavigationItemActive("/settings", mineNav)).toBe(true);
    expect(isPrimaryNavigationItemActive("/settings/backup", mineNav)).toBe(true);
    expect(isPrimaryNavigationItemActive("/privacy", mineNav)).toBe(true);
    expect(isPrimaryNavigationItemActive("/support", mineNav)).toBe(true);
    expect(isPrimaryNavigationItemActive("/growth", mineNav)).toBe(false);
    expect(isPrimaryNavigationItemActive("/hospital", mineNav)).toBe(false);
    expect(isPrimaryNavigationItemActive("/timeline/today", mineNav)).toBe(false);
    expect(isPrimaryNavigationItemActive("/", mineNav)).toBe(false);

    expect(showsMobileNavigation("/onboarding")).toBe(false);
    expect(showsMobileNavigation("/checklist/mom")).toBe(false);
    expect(showsMobileNavigation("/settings/backup")).toBe(false);
    expect(showsMobileNavigation("/")).toBe(true);
    expect(showsMobileNavigation("/growth")).toBe(true);
    expect(showsMobileNavigation("/tools")).toBe(true);

    for (const source of [mobileNav, appHeader]) {
      expect(source).toContain("PRIMARY_NAVIGATION_ITEMS.map");
      expect(source).toContain('aria-label="主导航"');
      expect(source).toContain('aria-current={active ? "page" : undefined}');
    }

    expect(mobileNav).toContain("grid grid-cols-5");
    expect(mobileNav).toContain(
      "fixed inset-x-3 bottom-[max(env(safe-area-inset-bottom),0.75rem)]",
    );
    expect(mobileNav).toContain("rounded-3xl bg-card/90 shadow-lg backdrop-blur-xl");
    expect(mobileNav).toContain("bg-secondary font-semibold text-primary");
    expect(mobileNav).toContain("strokeWidth={active ? 2.2 : 1.8}");

    expect(appHeader).toContain("bg-background/80 shadow-sm backdrop-blur-xl");
    expect(appHeader).toContain("从待产到育儿");
    expect(appHeader).toContain("shadow-glow");
  });

  it("renders the four-view checklist workspace at the dedicated checklist URL", () => {
    expect(checklistPage).toContain("<ChecklistWorkspace />");
    expect(homePage).toContain("<HomeDashboard />");
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
    expect(checklistGroupTabs).toContain("rounded-full bg-muted p-1");
    expect(checklistGroupTabs).toContain("bg-card text-foreground shadow-sm");
    expect(checklistItemRow).toContain("size-11");
    expect(checklistItemRow).toContain("break-words text-[15px] font-semibold leading-5");
    expect(checklistCategoryCard).toContain("break-words text-[15px] font-semibold leading-5");
    expect(checklistCategoryCard).toContain("href={href}");
    expect(checklistSectionWorkspace).toContain('className="item-card-grid"');
    expect(globals).toContain("xs:grid-cols-2");
    expect(checklistItemRow).toContain("ChecklistItemArt");
    expect(button).toContain("rounded-full");
    expect(button).toContain("shadow-glow");
    expect(card).toContain("rounded-card");
    expect(card).toContain("bg-card");
    expect(card).toContain("shadow-sm");
    expect(card).not.toContain("border border-border");
    expect(checklistWorkspace).toContain(
      "grid gap-2 rounded-card bg-card p-3 shadow-sm",
    );
    expect(checklistWorkspace).toContain(
      "safe-bottom-fab fixed right-4 z-40 flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow",
    );
  });

  it("keeps update notices clear of the fixed add-item control", () => {
    expect(globals).toContain(
      "padding-bottom: calc(7.5rem + env(safe-area-inset-bottom));",
    );
    expect(globals).toContain(
      "bottom: calc(11.25rem + env(safe-area-inset-bottom));",
    );
    expect(globals).toContain(
      "bottom: calc(6.5rem + env(safe-area-inset-bottom));",
    );
    expect(pwaRegister).toContain("safe-bottom-toast");
    expect(checklistWorkspace).toContain("safe-bottom-fab");
  });

  it("keeps 我的 as a simple entry surface with subordinate settings pages", () => {
    expect(settingsPage).toContain("我的");
    expect(settingsPage).not.toContain('href: "/hospital"');
    expect(settingsPage).not.toContain('href: "/growth"');
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

  it("does not reintroduce illustration-driven or former dashboard quick-entry styling", () => {
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

    expect(homePage).not.toContain('href="/departure"');
    expect(homePage).not.toContain('href="/planning"');
    expect(homePage).not.toContain('href="/hospital"');
    expect(homePage).not.toContain('href="/growth"');
  });

  it("ships the V3 design-system primitives", () => {
    const badge = readSource("components", "ui", "badge.tsx");
    const skeleton = readSource("components", "ui", "skeleton.tsx");
    const dangerZone = readSource("components", "DangerZone.tsx");
    const dialog = readSource("components", "ui", "dialog.tsx");
    const switchComponent = readSource("components", "ui", "switch.tsx");

    expect(badge).toContain("rounded-full");
    expect(badge).toContain("primarySolid");
    expect(badge).toContain("border-border/50");
    expect(skeleton).toContain("animate-pulse");
    expect(dangerZone).toContain("ring-1 ring-destructive/30");
    expect(dangerZone).toContain("shadow-sm");
    expect(dangerZone).not.toContain("border-destructive/25");
    expect(dialog).toContain("mobileFullscreen");
    expect(dialog).toContain("shadow-lg");

    expect(switchComponent).toContain("before:h-7 before:w-11");
    expect(switchComponent).toContain("size-6");
    expect(switchComponent).toContain("translate-x-[14px]");
    expect(switchComponent).toContain("bg-white");
  });
});
