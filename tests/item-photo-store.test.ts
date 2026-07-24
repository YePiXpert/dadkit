import { afterEach, describe, expect, it, vi } from "vitest";

const photoMocks = vi.hoisted(() => ({
  clearItemPhotos: vi.fn(() => new Promise<void>(() => undefined)),
}));

vi.mock("@/lib/item-photos", () => ({
  clearItemPhotos: photoMocks.clearItemPhotos,
}));

import { getChecklistViewItems } from "@/lib/checklist-v2";
import { useDadKitStore } from "@/lib/store";

const pristineStoreState = useDadKitStore.getState();

function installBrowserStorage() {
  const localValues = new Map<string, string>();
  const sessionValues = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => localValues.get(key) ?? null,
    setItem: (key: string, value: string) => localValues.set(key, value),
    removeItem: (key: string) => localValues.delete(key),
    clear: () => localValues.clear(),
  };
  const sessionStorage = {
    getItem: (key: string) => sessionValues.get(key) ?? null,
    setItem: (key: string, value: string) => sessionValues.set(key, value),
    removeItem: (key: string) => sessionValues.delete(key),
    clear: () => sessionValues.clear(),
  };

  vi.stubGlobal("window", { localStorage, sessionStorage });
}

afterEach(() => {
  useDadKitStore.setState(pristineStoreState, true);
  photoMocks.clearItemPhotos.mockClear();
  vi.unstubAllGlobals();
});

describe("item photo store cleanup", () => {
  it("does not wait for IndexedDB cleanup before rebuilding the generic list", () => {
    installBrowserStorage();
    useDadKitStore.getState().hydrate();

    const result = useDadKitStore.getState().clearAll();
    const visibleItems = getChecklistViewItems(
      useDadKitStore.getState().checklist,
      "all",
    );

    expect(result).toBeUndefined();
    expect(photoMocks.clearItemPhotos).toHaveBeenCalledTimes(1);
    expect(visibleItems.length).toBeGreaterThan(0);
  });
});
