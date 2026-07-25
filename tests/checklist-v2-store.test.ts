import { afterEach, describe, expect, it, vi } from "vitest";

import { getChecklistViewItems } from "@/lib/checklist-v2";
import { generateChecklist } from "@/lib/rules";
import { saveChecklist, STORAGE_KEYS } from "@/lib/storage";
import { useDadKitStore } from "@/lib/store";

const LEGACY_SENTINELS = {
  "dadkit:v2:checklist": JSON.stringify([
    { id: "v2-sentinel-item", name: "旧清单哨兵", status: "packed" },
  ]),
  "dadkit:v2:custom-items": JSON.stringify([
    { id: "v2-custom-sentinel" },
  ]),
  "dadkit:v2:checklist-mode": JSON.stringify("lean"),
} as const;

function installBrowserStorage(initial: Record<string, string> = {}) {
  const localValues = new Map(Object.entries(initial));
  const sessionValues = new Map<string, string>();
  const reads: string[] = [];
  const writes: string[] = [];
  const removals: string[] = [];

  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => {
        reads.push(key);
        return localValues.get(key) ?? null;
      },
      setItem: (key: string, value: string) => {
        writes.push(key);
        localValues.set(key, value);
      },
      removeItem: (key: string) => {
        removals.push(key);
        localValues.delete(key);
      },
      clear: () => localValues.clear(),
    },
    sessionStorage: {
      getItem: (key: string) => sessionValues.get(key) ?? null,
      setItem: (key: string, value: string) => sessionValues.set(key, value),
      removeItem: (key: string) => sessionValues.delete(key),
      clear: () => sessionValues.clear(),
    },
  });

  return { localValues, reads, removals, writes };
}

function resetStoreState() {
  useDadKitStore.setState({
    hydrated: false,
    checklist: [],
    checklistMode: "lean",
    customItems: [],
    hiddenTemplateItemIds: [],
  });
}

afterEach(() => {
  resetStoreState();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("v3 checklist persistence", () => {
  it("generates a visible checklist from empty storage", () => {
    installBrowserStorage();

    useDadKitStore.getState().hydrate();

    const state = useDadKitStore.getState();
    expect(state.hydrated).toBe(true);
    expect(getChecklistViewItems(state.checklist, "all")).toEqual(
      state.checklist,
    );
    expect(state.checklist.length).toBeGreaterThan(0);
  });

  it("uses only the dadkit:v3 namespace", () => {
    expect(
      Object.values(STORAGE_KEYS).every((key) => key.startsWith("dadkit:v3:")),
    ).toBe(true);

    const browserStorage = installBrowserStorage();
    useDadKitStore.getState().hydrate();

    expect(browserStorage.reads.length).toBeGreaterThan(0);
    expect(browserStorage.writes.length).toBeGreaterThan(0);
    expect(
      [...browserStorage.reads, ...browserStorage.writes].every((key) =>
        key.startsWith("dadkit:v3:"),
      ),
    ).toBe(true);
  });

  it("ignores v2 data and leaves it untouched during reset", () => {
    const browserStorage = installBrowserStorage(LEGACY_SENTINELS);

    useDadKitStore.getState().hydrate();
    expect(
      useDadKitStore.getState().checklist.some(
        (item) => item.id === "v2-sentinel-item",
      ),
    ).toBe(false);
    expect(browserStorage.reads.some((key) => key.startsWith("dadkit:v2:"))).toBe(
      false,
    );

    useDadKitStore.getState().clearAll();

    expect(
      browserStorage.removals.every((key) => key.startsWith("dadkit:v3:")),
    ).toBe(true);
    for (const [key, value] of Object.entries(LEGACY_SENTINELS)) {
      expect(browserStorage.localValues.get(key)).toBe(value);
    }
  });

  it("preserves persisted item progress during hydration", () => {
    installBrowserStorage();
    const checklist = generateChecklist();
    const first = checklist[0];
    saveChecklist(
      checklist.map((item) =>
        item.id === first.id ? { ...item, status: "packed" } : item,
      ),
    );

    useDadKitStore.getState().hydrate();

    expect(
      useDadKitStore
        .getState()
        .checklist.find((item) => item.id === first.id)?.status,
    ).toBe("packed");
  });
});
