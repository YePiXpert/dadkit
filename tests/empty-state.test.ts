import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readSource(...segments: string[]) {
  return readFileSync(join(process.cwd(), ...segments), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const emptyState = readSource("components", "EmptyState.tsx");
const checklistWorkspace = readSource("components", "ChecklistWorkspace.tsx");
const checklistSectionWorkspace = readSource(
  "components",
  "ChecklistSectionWorkspace.tsx",
);
const departureWorkspace = readSource("components", "DepartureWorkspace.tsx");

const SCENE_ILLUSTRATION_IDS = [
  "general-baby-bottle-brush",
  "general-baby-formula-bottle",
  "general-baby-blanket",
  "general-baby-hospital-clothes",
  "general-baby-diapers",
  "general-partner-doc-folder",
] as const;

describe("empty states with scene illustrations", () => {
  it("renders the illustration as a small lazy-loaded decorative image", () => {
    expect(emptyState).toContain("illustrationId?: string");
    expect(emptyState).toContain('loading="lazy"');
    expect(emptyState).toContain('aria-hidden="true"');
    expect(emptyState).toContain("src={`/item-art/${illustrationId}.webp`}");
  });

  it("pairs checklist, section and departure empty states with existing artwork", () => {
    const callSites = [
      checklistWorkspace,
      checklistSectionWorkspace,
      departureWorkspace,
    ].join("\n");

    for (const id of SCENE_ILLUSTRATION_IDS) {
      expect(callSites).toContain(id);
      expect(
        existsSync(join(process.cwd(), "public", "item-art", `${id}.webp`)),
      ).toBe(true);
    }
  });
});
