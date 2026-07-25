import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  formatChecklistDisplayText,
  getChecklistHomeHref,
  getChecklistSectionHref,
  preserveChecklistStorageText,
  setChecklistViewInQuery,
} from "@/lib/checklist-display";
import {
  CHECKLIST_DESCRIPTION_PREFERENCE_KEY,
  readChecklistDescriptionPreference,
} from "@/lib/use-checklist-description-preference";

function readSource(...segments: string[]) {
  return readFileSync(join(process.cwd(), ...segments), "utf8");
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("checklist section routes", () => {
  it("keeps the active filter query on section and back links", () => {
    const query = "view=shopping&from=home";

    expect(getChecklistSectionHref("documents", query)).toBe(
      "/checklist/documents?view=shopping&from=home",
    );
    expect(getChecklistHomeHref(query)).toBe("/?view=shopping&from=home");
    expect(setChecklistViewInQuery(query, "packing")).toBe(
      "view=packing&from=home",
    );
    expect(setChecklistViewInQuery(query, "all")).toBe("from=home");
  });

  it("converts slash alternatives without changing source values", () => {
    const original = "医保卡/社保卡";

    expect(formatChecklistDisplayText(original)).toBe("医保卡或社保卡");
    expect(formatChecklistDisplayText("纸巾 / 湿巾 / 棉柔巾")).toBe(
      "纸巾、湿巾或棉柔巾",
    );
    expect(preserveChecklistStorageText("医保卡或社保卡", original)).toBe(
      original,
    );
    expect(original).toBe("医保卡/社保卡");
  });

  it("leaves user-authored URLs, dates, and fractions untouched", () => {
    const options = { transformAlternatives: false };

    expect(
      formatChecklistDisplayText(
        "说明见 https://example.com/a/b，复查日期 2026/7/25",
        options,
      ),
    ).toBe("说明见 https://example.com/a/b，复查日期 2026/7/25");
    expect(formatChecklistDisplayText("服用 1/2 片", options)).toBe(
      "服用 1/2 片",
    );
    expect(
      preserveChecklistStorageText("自定义 A/B", "自定义 A/B", options),
    ).toBe("自定义 A/B");
  });

  it("defaults full descriptions on and keeps the preference outside backup storage", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: vi.fn(() => null),
      },
    });
    expect(readChecklistDescriptionPreference()).toBe(true);

    vi.stubGlobal("window", {
      localStorage: {
        getItem: vi.fn(() => "false"),
      },
    });
    expect(readChecklistDescriptionPreference()).toBe(false);
    expect(CHECKLIST_DESCRIPTION_PREFERENCE_KEY).toBe(
      "dadkit:ui:checklist:show-full-descriptions",
    );
  });

  it("uses one column at 320px and exactly two from 360px through tablet", () => {
    const styles = readSource("app", "globals.css");
    const workspace = readSource(
      "components",
      "ChecklistSectionWorkspace.tsx",
    );

    expect(workspace).toContain('className="item-card-grid"');
    expect(styles).toMatch(
      /\.item-card-grid\s*\{[\s\S]*?grid-cols-1[\s\S]*?\}/,
    );
    expect(styles).toMatch(
      /@media \(min-width: 360px\)[\s\S]*?\.item-card-grid\s*\{[\s\S]*?repeat\(2, minmax\(0, 1fr\)\)/,
    );
    expect(styles).not.toMatch(/\.item-card-grid[^}]*grid-cols-3/);
  });

  it("hides the mobile footer only on checklist detail routes", () => {
    const mobileNav = readSource("components", "MobileNav.tsx");

    expect(mobileNav).toContain('pathname.startsWith("/checklist/")');
    expect(mobileNav).toContain("return null");
  });
});
