import { afterEach, describe, expect, it, vi } from "vitest";

import {
  checkStorageCapacity,
  getChecklistPersistenceStatus,
  recordStorageWarning,
  requestPersistentStorage,
  resetChecklistPersistenceStatus,
} from "@/lib/persistence-status";

afterEach(() => {
  resetChecklistPersistenceStatus();
  vi.unstubAllGlobals();
});

describe("local persistence warnings", () => {
  it("requests persistent storage on startup as a best-effort capability", async () => {
    const persist = vi.fn(async () => true);

    vi.stubGlobal("navigator", { storage: { persist } });
    await requestPersistentStorage();

    expect(persist).toHaveBeenCalledTimes(1);

    // 浏览器拒绝或接口缺失时都不抛出,不阻塞后续容量检查。
    persist.mockRejectedValueOnce(new Error("denied"));
    await expect(requestPersistentStorage()).resolves.toBeUndefined();

    vi.stubGlobal("navigator", { storage: {} });
    await expect(requestPersistentStorage()).resolves.toBeUndefined();

    vi.stubGlobal("navigator", {});
    await expect(requestPersistentStorage()).resolves.toBeUndefined();
  });

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
