import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import {
  acquireItemPhotoUrl,
  clearItemPhotos,
  exportItemPhotos,
  getItemPhoto,
  importItemPhotoBackup,
  ITEM_PHOTO_ORPHAN_MIN_AGE_MS,
  ITEM_PHOTO_READ_CACHE_LIMIT,
  pruneOrphanedPhotos,
} from "@/lib/item-photos";
import {
  installFakeItemPhotoDb,
  type FakeItemPhotoDbHarness,
} from "@/tests/helpers/fake-item-photo-db";

let harness: FakeItemPhotoDbHarness;

beforeAll(() => {
  harness = installFakeItemPhotoDb();
});

afterAll(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  harness.records.clear();
  vi.restoreAllMocks();
});

describe("item photo read cache LRU", () => {
  it("serves repeat reads from the cache while under the limit", async () => {
    const first = getItemPhoto("cache-basic-a");
    getItemPhoto("cache-basic-b");

    expect(getItemPhoto("cache-basic-a")).toBe(first);
    await expect(first).resolves.toBeUndefined();
  });

  it("evicts the least recently used entry once the cache exceeds the limit", () => {
    const oldest = getItemPhoto("lru-oldest");

    for (let index = 1; index <= ITEM_PHOTO_READ_CACHE_LIMIT; index += 1) {
      getItemPhoto(`lru-filler-${index}`);
    }

    expect(getItemPhoto("lru-oldest")).not.toBe(oldest);

    const newest = getItemPhoto(`lru-filler-${ITEM_PHOTO_READ_CACHE_LIMIT}`);
    expect(getItemPhoto(`lru-filler-${ITEM_PHOTO_READ_CACHE_LIMIT}`)).toBe(
      newest,
    );
  });

  it("keeps a recently re-read entry while evicting colder ones", () => {
    const touched = getItemPhoto("lru-touched");
    const fillers: Promise<unknown>[] = [];

    for (let index = 1; index < ITEM_PHOTO_READ_CACHE_LIMIT; index += 1) {
      fillers.push(getItemPhoto(`lru-warm-${index}`));
    }

    // 重新读取让 lru-touched 成为最新条目,下一个插入应驱逐 lru-warm-1。
    expect(getItemPhoto("lru-touched")).toBe(touched);

    getItemPhoto("lru-warm-new");

    expect(getItemPhoto("lru-warm-1")).not.toBe(fillers[0]);
    expect(getItemPhoto("lru-touched")).toBe(touched);
  });
});

describe("item photo object URL leases", () => {
  it("does not revoke a leased object URL when the read cache evicts the entry", async () => {
    harness.seedPhoto("lease-item", new Date().toISOString());
    const createSpy = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:lease-item");
    const revokeSpy = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => undefined);

    const lease = await acquireItemPhotoUrl("lease-item");

    expect(lease.url).toBe("blob:lease-item");
    expect(createSpy).toHaveBeenCalledTimes(1);

    for (let index = 0; index < ITEM_PHOTO_READ_CACHE_LIMIT; index += 1) {
      getItemPhoto(`lease-filler-${index}`);
    }

    expect(revokeSpy).not.toHaveBeenCalled();

    lease.release();
    expect(revokeSpy).toHaveBeenCalledWith("blob:lease-item");
  });
});

describe("pruneOrphanedPhotos", () => {
  const staleUpdatedAt = () =>
    new Date(Date.now() - ITEM_PHOTO_ORPHAN_MIN_AGE_MS - 1_000).toISOString();

  it("removes stored photos whose items are no longer in the checklist", async () => {
    harness.seedPhoto("prune-orphan-a", staleUpdatedAt());
    harness.seedPhoto("prune-orphan-b", staleUpdatedAt());

    await expect(pruneOrphanedPhotos(["prune-kept"])).resolves.toBe(2);
    expect(harness.records.has("prune-orphan-a")).toBe(false);
    expect(harness.records.has("prune-orphan-b")).toBe(false);
  });

  it("keeps photos that still belong to checklist items", async () => {
    harness.seedPhoto("prune-kept-a", staleUpdatedAt());
    harness.seedPhoto("prune-kept-b", staleUpdatedAt());

    await expect(
      pruneOrphanedPhotos(["prune-kept-a", "prune-kept-b"]),
    ).resolves.toBe(0);
    expect(harness.records.has("prune-kept-a")).toBe(true);
    expect(harness.records.has("prune-kept-b")).toBe(true);
    await expect(getItemPhoto("prune-kept-a")).resolves.toMatchObject({
      itemId: "prune-kept-a",
      width: 800,
    });
  });

  it("keeps fresh photos added after the valid-id snapshot was taken", async () => {
    harness.seedPhoto("prune-fresh", new Date().toISOString());

    await expect(pruneOrphanedPhotos([])).resolves.toBe(0);
    expect(harness.records.has("prune-fresh")).toBe(true);
  });
});

describe("item photo backup package", () => {
  it("exports and restores compressed photos in a fresh local photo library", async () => {
    harness.seedPhoto("backup-photo", "2026-07-30T00:00:00.000Z");

    const backup = await exportItemPhotos();

    expect(backup).toMatchObject({
      version: 1,
      photos: [
        {
          itemId: "backup-photo",
          mimeType: "image/jpeg",
          width: 800,
          height: 600,
        },
      ],
    });
    expect(backup.photos[0]?.data).toBeTruthy();

    await clearItemPhotos();
    expect(harness.records.size).toBe(0);

    await expect(importItemPhotoBackup(backup)).resolves.toBe(1);
    await expect(getItemPhoto("backup-photo")).resolves.toMatchObject({
      itemId: "backup-photo",
      width: 800,
      height: 600,
    });
  });
});
