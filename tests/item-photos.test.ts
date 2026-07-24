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
  });

  it("offers gallery, rear-camera, replacement and deletion controls", () => {
    expect(photoField).toContain('accept="image/*"');
    expect(photoField).toContain('capture="environment"');
    expect(photoField).toContain("从相册替换");
    expect(photoField).toContain("重新拍照");
    expect(photoField).toContain("删除照片");
    expect(photoField).toContain("URL.revokeObjectURL");
  });

  it("shows a 36px row thumbnail without replacing the item icon tile", () => {
    expect(itemRow).toContain("useItemPhoto(item.id)");
    expect(itemRow).toContain('className="mt-0.5 size-9 shrink-0');
    expect(itemRow).toContain("ChecklistItemGlyph");
    expect(itemRow).toContain("ItemPhotoField");
  });

  it("keeps photos out of JSON and WebDAV data paths", () => {
    expect(storage).not.toContain("@/lib/item-photos");
    expect(webDavClient).not.toContain("@/lib/item-photos");
    expect(photoField).toContain("不包含在 JSON 或 WebDAV 备份中");
  });

  it("schedules photo cleanup without awaiting it during clearAll", () => {
    expect(store).toContain('from "@/lib/item-photos"');
    expect(store).toContain("clearItemPhotos");
    expect(store).toContain("deleteItemPhoto");
    expect(store).toContain("void clearItemPhotos().catch(() => undefined)");
    expect(store).toContain("void deleteItemPhoto(id).catch(() => undefined)");
  });
});
