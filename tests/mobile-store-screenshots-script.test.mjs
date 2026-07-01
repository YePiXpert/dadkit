import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const script = readFileSync(
  join(process.cwd(), "scripts", "capture-mobile-store-screenshots.mjs"),
  "utf8",
);

describe("mobile store screenshot script", () => {
  it("captures 10 App Store 6.9-inch screenshot drafts from real pages", () => {
    for (const name of [
      "01-home",
      "02-setup",
      "03-checklist",
      "04-hospital",
      "05-timeline",
      "06-go",
      "07-contractions",
      "08-postpartum",
      "09-settings",
      "10-share",
    ]) {
      expect(script).toContain(`"${name}"`);
    }

    expect(script).toContain("VISUAL_WIDTH: \"430\"");
    expect(script).toContain("VISUAL_HEIGHT: \"932\"");
    expect(script).toContain("VISUAL_DPR: \"3\"");
    expect(script).toContain("1290x2796");
    expect(script).toContain("store-screenshots");
    expect(script).toContain("app-store-6-9");
    expect(script).toContain("readdirSync(outDir");
    expect(script).toContain("selectedNames.has(entry.name)");
  });
});
