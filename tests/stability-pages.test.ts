import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function source(...segments: string[]) {
  return readFileSync(join(process.cwd(), ...segments), "utf8");
}

describe("stability page contracts", () => {
  it("ships a route error recovery surface without clearing data", () => {
    const errorPage = source("app", "error.tsx");
    expect(errorPage).toContain("reset");
    expect(errorPage).toContain("window.location.reload()");
    expect(errorPage).toContain('href="/settings/backup"');
    expect(errorPage).not.toContain("clearAll");
  });

  it("gives settings, tools, planning, backup and checklist sections distinct titles", () => {
    expect(source("app", "settings", "page.tsx")).toContain("我的设置 | DadKit");
    expect(source("app", "tools", "page.tsx")).toContain("工具 | DadKit");
    expect(source("app", "planning", "page.tsx")).toContain("家庭分工与采购 | DadKit");
    expect(source("app", "settings", "checklist", "layout.tsx")).toContain("清单设置 | DadKit");
    expect(source("app", "settings", "backup", "layout.tsx")).toContain("备份与恢复 | DadKit");
    expect(source("app", "checklist", "[sectionId]", "page.tsx")).toContain("generateMetadata");
  });
});
