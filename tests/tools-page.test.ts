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

const page = readSource("app", "tools", "page.tsx");
const entryGrid = readSource("components", "LinkEntryGrid.tsx");

describe("tools hub page and navigation", () => {
  it("ships the primary tools and lower-frequency management entries", () => {
    expect(page).toContain("工具");
    expect(page).toContain("从孕周跟踪到出发待产，这些帮手随取随用。");
    expect(page).toContain("page-shell page-shell-with-nav");
    expect(page).toContain("<LinkEntryGrid");
    expect(entryGrid).toContain("rounded-card bg-card p-4 shadow-sm");
    expect(entryGrid).toContain("sm:grid-cols-2");

    const entries = [
      { href: "/growth", title: "孕期成长记" },
      { href: "/departure", title: "准备出发" },
      { href: "/settings/checklist", title: "清单设置" },
    ];

    for (const entry of entries) {
      expect(page).toContain(`href: "${entry.href}"`);
      expect(page).toContain(entry.title);
    }

    expect(page).not.toContain('href: "/planning"');
    expect(page).not.toContain("家庭分工");

    expect(page).toContain("管理与支持");
    for (const entry of [
      { href: "/settings/family", title: "家庭成员" },
      { href: "/settings/backup", title: "备份与恢复" },
      { href: "/settings/sync", title: "家庭同步" },
      { href: "/support", title: "帮助与反馈" },
    ]) {
      expect(page).toContain(`href: "${entry.href}"`);
      expect(page).toContain(entry.title);
    }
  });

  it("assigns /tools and its owned routes to the 工具 navigation tab", () => {
    const checklist = PRIMARY_NAVIGATION_ITEMS.find(
      (item) => item.id === "checklist",
    )!;
    const tools = PRIMARY_NAVIGATION_ITEMS.find((item) => item.id === "tools")!;
    const mine = PRIMARY_NAVIGATION_ITEMS.find((item) => item.id === "mine")!;

    for (const route of ["/tools", "/growth", "/departure"]) {
      expect(isPrimaryNavigationItemActive(route, tools)).toBe(true);
      expect(isPrimaryNavigationItemActive(route, checklist)).toBe(false);
      expect(isPrimaryNavigationItemActive(route, mine)).toBe(false);
    }

    expect(showsMobileNavigation("/tools")).toBe(true);
    expect(showsMobileNavigation("/departure")).toBe(true);
    expect(showsMobileNavigation("/growth")).toBe(true);
    expect(page).not.toContain('href: "/hospital"');
  });
});
