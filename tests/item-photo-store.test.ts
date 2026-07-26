import { afterEach, describe, expect, it, vi } from "vitest";

const photoMocks = vi.hoisted(() => ({
  clearItemPhotos: vi.fn(async () => undefined),
}));

vi.mock("@/lib/item-photos", () => ({
  clearItemPhotos: photoMocks.clearItemPhotos,
}));

import { installBrowserStorage } from "@/tests/helpers/browser-storage";
import { getChecklistViewItems } from "@/lib/checklist-v2";
import { useDadKitStore } from "@/lib/store";

const pristineStoreState = useDadKitStore.getState();

afterEach(() => {
  useDadKitStore.setState(pristineStoreState, true);
  photoMocks.clearItemPhotos.mockClear();
  vi.unstubAllGlobals();
});

describe("item photo store cleanup", () => {
  it("waits for IndexedDB cleanup while keeping the rebuilt list usable", async () => {
    installBrowserStorage();
    useDadKitStore.getState().hydrate();

    await useDadKitStore.getState().clearAll();
    const visibleItems = getChecklistViewItems(
      useDadKitStore.getState().checklist,
      "all",
    );

    expect(photoMocks.clearItemPhotos).toHaveBeenCalledTimes(1);
    expect(visibleItems.length).toBeGreaterThan(0);
  });

  it("reports partial cleanup when IndexedDB photo deletion fails", async () => {
    installBrowserStorage();
    useDadKitStore.getState().hydrate();
    photoMocks.clearItemPhotos.mockRejectedValueOnce(
      new Error("simulated photo cleanup failure"),
    );

    await expect(useDadKitStore.getState().clearAll()).rejects.toThrow(
      "清单与成长数据已清空，但物品照片未能清理",
    );
    expect(useDadKitStore.getState().checklist.length).toBeGreaterThan(0);
  });
});
