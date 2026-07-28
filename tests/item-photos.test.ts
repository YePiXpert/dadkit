import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  clearItemPhotos,
  compressItemPhoto,
  getItemPhotoDimensions,
  ITEM_PHOTO_JPEG_QUALITY,
  ITEM_PHOTO_MAX_EDGE,
  normalizeItemPhotoCompressionOptions,
} from "@/lib/item-photos";

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

describe("item photo compression helpers", () => {
  it("limits landscape and portrait photos to an 800px longest edge", () => {
    expect(getItemPhotoDimensions(1600, 1200)).toEqual({
      width: 800,
      height: 600,
    });
    expect(getItemPhotoDimensions(1200, 1600)).toEqual({
      width: 600,
      height: 800,
    });
  });

  it("does not upscale small photos and keeps dimensions positive", () => {
    expect(getItemPhotoDimensions(320, 200)).toEqual({
      width: 320,
      height: 200,
    });
    expect(getItemPhotoDimensions(10_000, 1)).toEqual({
      width: 800,
      height: 1,
    });
  });

  it("normalizes compression settings around the V2 defaults", () => {
    expect(normalizeItemPhotoCompressionOptions()).toEqual({
      maxEdge: ITEM_PHOTO_MAX_EDGE,
      quality: ITEM_PHOTO_JPEG_QUALITY,
    });
    expect(
      normalizeItemPhotoCompressionOptions({ maxEdge: 640.4, quality: 4 }),
    ).toEqual({ maxEdge: 640, quality: 1 });
  });

  it("rejects non-image blobs before browser-only canvas work", async () => {
    await expect(
      compressItemPhoto(new Blob(["not an image"], { type: "text/plain" })),
    ).rejects.toThrow("请选择图片文件");
  });

  it("makes clear a safe no-op when IndexedDB is unavailable", async () => {
    await expect(clearItemPhotos()).resolves.toBeUndefined();
  });
});

describe("item photo integration contract", () => {
  const photoLibrary = readFileSync(
    join(process.cwd(), "lib", "item-photos.ts"),
    "utf8",
  );
  const photoField = readFileSync(
    join(process.cwd(), "components", "ItemPhotoField.tsx"),
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
  const webDavClient = readFileSync(
    join(process.cwd(), "lib", "webdav", "client.ts"),
    "utf8",
  );

  it("uses native IndexedDB and canvas JPEG compression", () => {
    expect(photoLibrary).toContain("indexedDB.open");
    expect(photoLibrary).toContain("createObjectStore");
    expect(photoLibrary).toContain('"image/jpeg"');
    expect(photoLibrary).toContain("canvas.toBlob");
    expect(photoLibrary).toContain("ITEM_PHOTO_MAX_EDGE = 800");
    expect(photoLibrary).toContain("ITEM_PHOTO_JPEG_QUALITY = 0.8");
    expect(photoLibrary).toContain("ITEM_PHOTO_MAX_SOURCE_BYTES = 20");
    expect(photoLibrary).toContain("bytes: await record.blob.arrayBuffer()");
    expect(photoLibrary).toContain("new Blob([value.bytes.slice(0)]");
  });

  it("offers gallery, rear-camera, replacement and deletion controls", () => {
    expect(photoField).toContain('accept="image/*"');
    expect(photoField).toContain('capture="environment"');
    expect(photoField).toContain("从相册替换");
    expect(photoField).toContain("重新拍照");
    expect(photoField).toContain("删除照片");
    expect(photoField).toContain("处理中");
    expect(photoLibrary).toContain("URL.revokeObjectURL");
  });

  it("loads row photos only near the viewport and keeps one controlled dialog", () => {
    expect(itemRow).toContain("useItemPhoto(item.id, photoEnabled)");
    expect(itemRow).toContain('rootMargin: "600px 0px"');
    expect(itemRow).toContain('className="size-full object-cover"');
    expect(itemRow).toContain("ChecklistItemIllustration");
    expect(itemDetails).toContain("ItemPhotoField");
    expect(itemDetails).toContain("useItemPhoto(item.id, open)");
    expect(itemDetails).toContain("const EditItemDialog = dynamic");
  });

  it("keeps photos local and out of portable backups", () => {
    expect(storage).not.toContain("@/lib/item-photos");
    expect(webDavClient).not.toContain("@/lib/item-photos");
    expect(photoField).toContain("WebDAV 备份");
    expect(photoField).toContain("仅保存在当前浏览器");
    expect(photoLibrary).toContain("ITEM_PHOTO_DATABASE_VERSION = 3");
    expect(photoLibrary).toContain("deleteObjectStore");
  });

  it("waits for photo cleanup during clearAll and reports partial failures", () => {
    expect(store).toContain('from "@/lib/item-photos"');
    expect(store).toContain("clearItemPhotos");
    expect(store).toContain("deleteItemPhoto");
    expect(store).toContain("await clearItemPhotos()");
    expect(store).toContain("photosCleared = false");
    expect(store).toContain("清单与成长数据已清空");
    expect(store).toContain("void deleteItemPhoto(id).catch(() => undefined)");
  });
});
