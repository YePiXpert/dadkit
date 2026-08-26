import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function source(...segments: string[]) {
  return readFileSync(join(process.cwd(), ...segments), "utf8");
}

describe("background startup performance", () => {
  it("keeps the cross-tab listener light until a domain actually changes", () => {
    const crossTabSync = source("lib", "data", "cross-tab-sync.ts");
    const backgroundTasks = source("components", "BackgroundTasks.tsx");

    expect(crossTabSync).toContain('await import("@/lib/baby/store")');
    expect(crossTabSync).toContain('"@/lib/data/cross-tab-checklist"');
    expect(crossTabSync).not.toContain('from "@/lib/store"');
    expect(crossTabSync).not.toContain('from "@/lib/baby/store"');
    expect(crossTabSync).not.toContain('from "@/lib/growth-store"');
    expect(backgroundTasks).toContain('import("@/lib/data/cross-tab-sync")');
    const listenerStart = backgroundTasks.lastIndexOf("startCrossTabListener();");
    const deferredWorkStart = backgroundTasks.lastIndexOf(
      "scheduleBackgroundWork();",
    );
    expect(listenerStart).toBeGreaterThan(-1);
    expect(deferredWorkStart).toBeGreaterThan(listenerStart);
  });

  it("does not load the full storage module just to remove retired keys", () => {
    const backgroundTasks = source("components", "BackgroundTasks.tsx");

    expect(backgroundTasks).toContain('import("@/lib/retired-data")');
    expect(backgroundTasks).not.toContain('import("@/lib/storage")');
    expect(backgroundTasks).toContain("hasStoredSyncSession()");
  });
});
