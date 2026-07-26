import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { installBrowserStorage } from "@/tests/helpers/browser-storage";
import { mergeChecklistQuantity, useDadKitStore } from "@/lib/store";

const pristineStoreState = useDadKitStore.getState();

afterEach(() => {
  useDadKitStore.setState(pristineStoreState, true);
  vi.unstubAllGlobals();
});

describe("custom item same-name merge", () => {
  beforeEach(() => {
    installBrowserStorage();
    useDadKitStore.setState({
      hydrated: false,
      checklist: [],
      checklistMode: "lean",
      customItems: [],
      hiddenTemplateItemIds: [],
    });
    useDadKitStore.getState().hydrate();
  });

  it("adds exact quantities with the same unit", () => {
    expect(mergeChecklistQuantity("1 个", "2 个")).toBe("3 个");
    expect(mergeChecklistQuantity("1-2 包", "1 包")).toBe(
      "1-2 包；另加 1 包",
    );
  });

  it("merges a same-name item into one visible row", () => {
    const existing = useDadKitStore
      .getState()
      .checklist.find((item) => item.itemKind === "item" && item.quantity);

    expect(existing).toBeDefined();
    const beforeCount = useDadKitStore
      .getState()
      .checklist.filter((item) => item.name === existing!.name).length;

    const result = useDadKitStore.getState().addCustomItem({
      name: ` ${existing!.name} `,
      category: existing!.category,
      priority: "recommended",
      quantity: "1 个",
    });

    const matches = useDadKitStore
      .getState()
      .checklist.filter((item) => item.name === existing!.name);

    expect(result.merged).toBe(true);
    expect(beforeCount).toBe(1);
    expect(matches).toHaveLength(1);
    expect(useDadKitStore.getState().customItems).toHaveLength(1);
  });
});
