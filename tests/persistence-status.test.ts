import { afterEach, describe, expect, it, vi } from "vitest";

import {
  checkStorageCapacity,
  getChecklistPersistenceStatus,
  recordStorageWarning,
  resetChecklistPersistenceStatus,
} from "@/lib/persistence-status";

afterEach(() => {
  resetChecklistPersistenceStatus();
  vi.unstubAllGlobals();
});

describe("local persistence warnings", () => {
  it("warns before quota exhaustion and clears the warning after capacity recovers", async () => {
    const persist = vi.fn(async () => true);
    const estimate = vi.fn(async () => ({ usage: 85, quota: 100 }));

    vi.stubGlobal("navigator", { storage: { persist, estimate } });
    await checkStorageCapacity();

    expect(getChecklistPersistenceStatus().storageWarning).toContain("存储空间已接近上限");
    expect(persist).not.toHaveBeenCalled();

    estimate.mockResolvedValueOnce({ usage: 40, quota: 100 });
    await checkStorageCapacity();

    expect(getChecklistPersistenceStatus().storageWarning).toBeUndefined();
  });

  it("keeps write failures visible through the shared warning surface", () => {
    recordStorageWarning("成长记尚未写入本机存储：存储空间不足");

    expect(getChecklistPersistenceStatus().storageWarning).toContain("成长记");
  });
});
