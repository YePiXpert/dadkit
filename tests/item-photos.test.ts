import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { clearItemPhotos } from "@/lib/item-photos";

const indexedDbDescriptor = Object.getOwnPropertyDescriptor(
  globalThis,
  "indexedDB",
);

beforeAll(() => {
  Object.defineProperty(globalThis, "indexedDB", {
    configurable: true,
    value: undefined,
  });
});

afterAll(() => {
  if (indexedDbDescriptor) {
    Object.defineProperty(globalThis, "indexedDB", indexedDbDescriptor);
  } else {
    Reflect.deleteProperty(globalThis, "indexedDB");
  }
});

describe("item photo migration window", () => {
  it("makes clear a safe no-op when IndexedDB is unavailable", async () => {
    await expect(clearItemPhotos()).resolves.toBeUndefined();
  });
});

describe("item photo integration contract", () => {
  const photoLibrary = readFileSync(
    join(process.cwd(), "lib", "item-photos.ts"),
    "utf8",
  );
  const itemRow = readFileSync(
    join(process.cwd(), "components", "ChecklistItemRow.tsx"),
    "utf8",
  );
  const itemDetails = readFileSync(
    join(process.cwd(), "components", "ChecklistItemDetailsDialog.tsx"),
    "utf8",
  );
  const store = readFileSync(join(process.cwd(), "lib", "store.ts"), "utf8");
  const storage = readFileSync(
    join(process.cwd(), "lib", "storage.ts"),
    "utf8",
  );
  const backupPage = [
    readFileSync(
      join(process.cwd(), "app", "settings", "backup", "page.tsx"),
      "utf8",
    ),
    readFileSync(
      join(process.cwd(), "components", "PhotoBackupCard.tsx"),
      "utf8",
    ),
  ].join("\n");

  it("keeps the IndexedDB photo store readable for export and import", () => {
    expect(photoLibrary).toContain("indexedDB.open");
    expect(photoLibrary).toContain("createObjectStore");
    expect(photoLibrary).toContain("arrayBufferToBase64(await photo.blob.arrayBuffer())");
    expect(photoLibrary).toContain("new Blob([value.bytes.slice(0)]");
    expect(photoLibrary).toContain("ITEM_PHOTO_DATABASE_VERSION = 3");
    expect(photoLibrary).toContain("deleteObjectStore");
  });

  it("retires photo capture while keeping the checklist illustrations", () => {
    expect(itemRow).toContain("ChecklistItemArt");
    expect(itemRow).not.toContain("useItemPhoto");
    expect(itemDetails).toContain("ChecklistItemArt");
    expect(itemDetails).not.toContain("ItemPhotoField");
  });

  it("keeps photos out of routine backups while offering an explicit package", () => {
    expect(storage).not.toContain("@/lib/item-photos");
    expect(photoLibrary).toContain("exportItemPhotos");
    expect(photoLibrary).toContain("importItemPhotoBackup");
    expect(backupPage).toContain("导出照片包");
    expect(backupPage).toContain("导入照片包");
    expect(backupPage).toContain("物品照片功能已在新版下线");
  });

  it("waits for photo cleanup during clearAll without per-item deletes", () => {
    expect(store).toContain("clearItemPhotos");
    expect(store).toContain("await clearItemPhotos()");
    expect(store).toContain("photosCleared = false");
    expect(store).toContain("清单与成长数据已清空");
    expect(store).not.toContain("deleteItemPhoto");
  });
});
