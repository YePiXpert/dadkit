import { describe, expect, it } from "vitest";

import { shouldInitializeOpenDraft } from "@/lib/use-open-draft";

describe("open draft initialization", () => {
  it("initializes only on the opening edge or an entity change", () => {
    expect(shouldInitializeOpenDraft(false, true, undefined, "a")).toBe(true);
    expect(shouldInitializeOpenDraft(true, true, "a", "a")).toBe(false);
    expect(shouldInitializeOpenDraft(true, true, "a", "b")).toBe(true);
    expect(shouldInitializeOpenDraft(true, false, "a", "a")).toBe(false);
    expect(shouldInitializeOpenDraft(false, true, "a", "a")).toBe(true);
  });
});
