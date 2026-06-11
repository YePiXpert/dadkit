import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const examplePage = readFileSync(
  join(process.cwd(), "app", "example", "page.tsx"),
  "utf8",
);

describe("example page copy", () => {
  it("sends old example links to the setup flow without rendering demo data", () => {
    expect(examplePage).toContain('redirect("/setup")');
    expect(examplePage).not.toContain("generateChecklist");
    expect(examplePage).not.toContain("createProfile");
    expect(examplePage).not.toContain("localStorage");
  });
});
