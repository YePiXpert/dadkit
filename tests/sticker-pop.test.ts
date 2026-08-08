import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readSource(...segments: string[]) {
  return readFileSync(join(process.cwd(), ...segments), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const globals = readSource("app", "globals.css");
const checklistItemRow = readSource("components", "ChecklistItemRow.tsx");
const growthWorkspace = readSource("components", "GrowthWorkspace.tsx");

describe("sticker-pop celebration micro-animations", () => {
  it("pops the check icon only when an item transitions into packed", () => {
    expect(checklistItemRow).toContain('justPacked && "sticker-pop"');
    expect(checklistItemRow).toContain('itemState !== "packed"');
    expect(checklistItemRow).toContain("setJustPacked(false), 500");
  });

  it("pops the growth illustration when switching back to the current week", () => {
    expect(growthWorkspace).toContain(
      'className={currentWeekPopping ? "sticker-pop" : undefined}',
    );
    expect(growthWorkspace).toContain("current.week !== currentPregnancyWeek");
    expect(growthWorkspace).toContain("setCurrentWeekPopping(false), 500");
  });

  it("keeps one keyframes token and disables it under reduced motion", () => {
    expect(globals).toContain("@keyframes sticker-pop");
    expect(globals).toContain(".sticker-pop {");
    expect(globals).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.sticker-pop[\s\S]*?animation: none !important;/,
    );
  });
});
