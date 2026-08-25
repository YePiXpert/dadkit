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
      .checklist.filter(
        (item) =>
          item.category === existing!.category && item.name === existing!.name,
      ).length;

    const result = useDadKitStore.getState().addCustomItem({
      name: ` ${existing!.name} `,
      category: existing!.category,
      priority: "recommended",
      quantity: "1 个",
    });

    const matches = useDadKitStore
      .getState()
      .checklist.filter(
        (item) =>
          item.category === existing!.category && item.name === existing!.name,
      );

    expect(result.merged).toBe(true);
    expect(beforeCount).toBe(1);
    expect(matches).toHaveLength(1);
    expect(useDadKitStore.getState().customItems).toHaveLength(1);
  });

  it("keeps same-name items in different bag categories separate", () => {
    vi.useFakeTimers();

    try {
      const first = useDadKitStore.getState().addCustomItem({
        name: "备用小盆",
        category: "mom_postpartum",
        priority: "recommended",
      });
      const second = useDadKitStore.getState().addCustomItem({
        name: "备用小盆",
        category: "baby",
        priority: "recommended",
      });

      expect(first.merged).toBe(false);
      expect(second.merged).toBe(false);
      expect(second.itemId).not.toBe(first.itemId);
      expect(
        useDadKitStore
          .getState()
          .checklist.filter((item) => item.name === "备用小盆"),
      ).toHaveLength(2);

      useDadKitStore.getState().removeItem(first.itemId);
      expect(
        useDadKitStore
          .getState()
          .checklist.filter((item) => item.name === "备用小盆"),
      ).toHaveLength(1);
      expect(
        useDadKitStore
          .getState()
          .checklist.some((item) => item.id === second.itemId),
      ).toBe(true);

      useDadKitStore.getState().undoRemoveItem(first.itemId);
      expect(
        useDadKitStore
          .getState()
          .checklist.filter((item) => item.name === "备用小盆"),
      ).toHaveLength(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
