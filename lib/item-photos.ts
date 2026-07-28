const ITEM_PHOTO_DATABASE = "dadkit-v2-item-photos";
const ITEM_PHOTO_DATABASE_VERSION = 3;
const ITEM_PHOTO_STORE = "photos";

export const ITEM_PHOTO_MAX_EDGE = 800;
export const ITEM_PHOTO_JPEG_QUALITY = 0.8;
export const ITEM_PHOTO_MAX_SOURCE_BYTES = 20 * 1024 * 1024;

export type ItemPhotoDimensions = {
  height: number;
  width: number;
};

export type ItemPhotoRecord = ItemPhotoDimensions & {
  blob: Blob;
  itemId: string;
  updatedAt: string;
};

// WebKit's IndexedDB implementation can reject Blob/File structured clones.
// Persist raw bytes instead and recreate the Blob only at the UI/export edge.
// Existing v2 records used Blob and remain readable through the legacy branch.
type StoredBinaryItemPhotoRecord = ItemPhotoDimensions & {
  bytes: ArrayBuffer;
  itemId: string;
  mimeType: string;
  updatedAt: string;
};

export type ItemPhotoCompressionOptions = {
  maxEdge?: number;
  quality?: number;
};

type NormalizedItemPhotoCompressionOptions = {
  maxEdge: number;
  quality: number;
};

type ItemPhotoChangeListener = (itemId?: string) => void;

const photoChangeListeners = new Set<ItemPhotoChangeListener>();
let photoDatabasePromise: Promise<IDBDatabase> | undefined;
const photoReadPromises = new Map<
  string,
  Promise<ItemPhotoRecord | undefined>
>();

type PhotoUrlEntry = {
  refs: number;
  url: string;
};

export type ItemPhotoUrlLease = {
  url?: string;
  release: () => void;
};

const photoUrlEntries = new Map<string, PhotoUrlEntry>();

export function getItemPhotoDimensions(
  width: number,
  height: number,
  maxEdge = ITEM_PHOTO_MAX_EDGE,
): ItemPhotoDimensions {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error("照片尺寸无效。");
  }

  const normalizedMaxEdge = normalizePositiveInteger(
    maxEdge,
    ITEM_PHOTO_MAX_EDGE,
  );
  const scale = Math.min(1, normalizedMaxEdge / Math.max(width, height));

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function normalizeItemPhotoCompressionOptions(
  options: ItemPhotoCompressionOptions = {},
): NormalizedItemPhotoCompressionOptions {
  const quality = Number.isFinite(options.quality)
    ? Math.min(1, Math.max(0.1, options.quality ?? ITEM_PHOTO_JPEG_QUALITY))
    : ITEM_PHOTO_JPEG_QUALITY;

  return {
    maxEdge: normalizePositiveInteger(
      options.maxEdge,
      ITEM_PHOTO_MAX_EDGE,
    ),
    quality,
  };
}

export function isImageBlob(blob: Blob) {
  return blob.type.toLowerCase().startsWith("image/");
}

export async function compressItemPhoto(
  sourceBlob: Blob,
  options: ItemPhotoCompressionOptions = {},
): Promise<{ blob: Blob } & ItemPhotoDimensions> {
  if (!isImageBlob(sourceBlob)) {
    throw new Error("请选择图片文件。");
  }

  if (sourceBlob.size > ITEM_PHOTO_MAX_SOURCE_BYTES) {
    throw new Error("图片不能超过 20 MiB。");
  }

  const normalizedOptions = normalizeItemPhotoCompressionOptions(options);
  const decoded = await decodeImage(sourceBlob);
  let canvas: HTMLCanvasElement | undefined;

  try {
    const dimensions = getItemPhotoDimensions(
      decoded.width,
      decoded.height,
      normalizedOptions.maxEdge,
    );

    if (typeof document === "undefined") {
      throw new Error("当前环境无法压缩照片。");
    }

    canvas = document.createElement("canvas");
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    const context = canvas.getContext("2d", { alpha: false });

    if (!context) {
      throw new Error("当前浏览器无法处理照片。");
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, dimensions.width, dimensions.height);
    context.drawImage(
      decoded.source,
      0,
      0,
      dimensions.width,
      dimensions.height,
    );

    const blob = await canvasToBlob(
      canvas,
      "image/jpeg",
      normalizedOptions.quality,
    );

    return { blob, ...dimensions };
  } finally {
    decoded.dispose();

    if (canvas) {
      canvas.width = 1;
      canvas.height = 1;
    }
  }
}

export function getItemPhoto(itemId: string) {
  const normalizedItemId = normalizeItemId(itemId);

  const existing = photoReadPromises.get(normalizedItemId);

  if (existing) {
    return existing;
  }

  const pending = readItemPhoto(normalizedItemId);

  photoReadPromises.set(normalizedItemId, pending);
  void pending.catch(() => {
    if (photoReadPromises.get(normalizedItemId) === pending) {
      photoReadPromises.delete(normalizedItemId);
    }
  });

  return pending;
}

async function readItemPhoto(normalizedItemId: string) {
  const database = await openItemPhotoDatabase();

  if (!database) {
    return undefined;
  }

  const transaction = database.transaction(ITEM_PHOTO_STORE, "readonly");
  const completion = waitForTransaction(transaction);
  const request = transaction
    .objectStore(ITEM_PHOTO_STORE)
    .get(normalizedItemId);
  const [result] = await Promise.all([
    waitForRequest<ItemPhotoRecord | undefined>(request),
    completion,
  ]);

  return toItemPhotoRecord(result);
}

export async function acquireItemPhotoUrl(
  itemId: string,
): Promise<ItemPhotoUrlLease> {
  const normalizedItemId = normalizeItemId(itemId);
  const existing = photoUrlEntries.get(normalizedItemId);

  if (existing) {
    existing.refs += 1;
    return createPhotoUrlLease(normalizedItemId, existing);
  }

  const record = await getItemPhoto(normalizedItemId);

  if (!record) {
    return { release: () => undefined };
  }

  if (
    typeof URL === "undefined" ||
    typeof URL.createObjectURL !== "function"
  ) {
    throw new Error("当前浏览器无法显示本地照片。");
  }

  const entry = {
    refs: 1,
    url: URL.createObjectURL(record.blob),
  };

  photoUrlEntries.set(normalizedItemId, entry);
  return createPhotoUrlLease(normalizedItemId, entry);
}

function createPhotoUrlLease(
  itemId: string,
  entry: PhotoUrlEntry,
): ItemPhotoUrlLease {
  let released = false;

  return {
    url: entry.url,
    release() {
      if (released) return;
      released = true;
      entry.refs -= 1;

      if (entry.refs <= 0) {
        if (photoUrlEntries.get(itemId) === entry) {
          photoUrlEntries.delete(itemId);
        }
        revokePhotoUrl(entry.url);
      }
    },
  };
}

export async function saveItemPhoto(itemId: string, sourceBlob: Blob) {
  const normalizedItemId = normalizeItemId(itemId);
  const compressed = await compressItemPhoto(sourceBlob);
  const database = await requireItemPhotoDatabase();
  const record: ItemPhotoRecord = {
    itemId: normalizedItemId,
    blob: compressed.blob,
    width: compressed.width,
    height: compressed.height,
    updatedAt: new Date().toISOString(),
  };
  const storedRecord = await toStoredItemPhotoRecord(record);
  const transaction = database.transaction(ITEM_PHOTO_STORE, "readwrite");
  const completion = waitForTransaction(transaction);
  const request = transaction.objectStore(ITEM_PHOTO_STORE).put(storedRecord);

  await Promise.all([waitForRequest(request), completion]);
  emitItemPhotoChange(normalizedItemId);

  return record;
}

export async function deleteItemPhoto(itemId: string) {
  const normalizedItemId = normalizeItemId(itemId);
  const database = await openItemPhotoDatabase();

  if (database) {
    const transaction = database.transaction(ITEM_PHOTO_STORE, "readwrite");
    const completion = waitForTransaction(transaction);

    transaction.objectStore(ITEM_PHOTO_STORE).delete(normalizedItemId);
    await completion;
  }

  emitItemPhotoChange(normalizedItemId);
}

export async function clearItemPhotos() {
  const database = await openItemPhotoDatabase();

  if (database) {
    const transaction = database.transaction(ITEM_PHOTO_STORE, "readwrite");
    const completion = waitForTransaction(transaction);

    transaction.objectStore(ITEM_PHOTO_STORE).clear();
    await completion;
  }

  emitItemPhotoChange();
}

export function subscribeToItemPhotoChanges(listener: ItemPhotoChangeListener) {
  photoChangeListeners.add(listener);

  return () => {
    photoChangeListeners.delete(listener);
  };
}

function emitItemPhotoChange(itemId?: string) {
  invalidatePhotoCaches(itemId);

  for (const listener of photoChangeListeners) {
    try {
      listener(itemId);
    } catch {
      // A stale UI subscriber must not make a successful photo write fail.
    }
  }
}

function invalidatePhotoCaches(itemId?: string) {
  const ids = itemId
    ? [itemId]
    : Array.from(
        new Set([...photoReadPromises.keys(), ...photoUrlEntries.keys()]),
      );

  for (const id of ids) {
    photoReadPromises.delete(id);
    const entry = photoUrlEntries.get(id);

    if (entry) {
      photoUrlEntries.delete(id);
      if (entry.refs <= 0) {
        revokePhotoUrl(entry.url);
      }
    }
  }
}

function revokePhotoUrl(url: string) {
  if (
    typeof URL !== "undefined" &&
    typeof URL.revokeObjectURL === "function"
  ) {
    URL.revokeObjectURL(url);
  }
}

function normalizePositiveInteger(value: number | undefined, fallback: number) {
  if (!Number.isFinite(value) || (value ?? 0) <= 0) {
    return fallback;
  }

  return Math.max(1, Math.round(value ?? fallback));
}

function normalizeItemId(itemId: string) {
  const normalized = itemId.trim();

  if (!normalized) {
    throw new Error("物品标识不能为空。");
  }

  return normalized;
}

async function toStoredItemPhotoRecord(
  record: ItemPhotoRecord,
): Promise<StoredBinaryItemPhotoRecord> {
  return {
    bytes: await record.blob.arrayBuffer(),
    height: record.height,
    itemId: record.itemId,
    mimeType: record.blob.type,
    updatedAt: record.updatedAt,
    width: record.width,
  };
}

function toItemPhotoRecord(value: unknown): ItemPhotoRecord | undefined {
  if (isItemPhotoRecord(value)) {
    return value;
  }

  if (!isStoredBinaryItemPhotoRecord(value)) {
    return undefined;
  }

  return {
    blob: new Blob([value.bytes.slice(0)], { type: value.mimeType }),
    height: value.height,
    itemId: value.itemId,
    updatedAt: value.updatedAt,
    width: value.width,
  };
}

function isStoredBinaryItemPhotoRecord(
  value: unknown,
): value is StoredBinaryItemPhotoRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<StoredBinaryItemPhotoRecord>;

  return (
    typeof candidate.itemId === "string" &&
    typeof candidate.updatedAt === "string" &&
    typeof candidate.width === "number" &&
    typeof candidate.height === "number" &&
    typeof candidate.mimeType === "string" &&
    candidate.bytes instanceof ArrayBuffer
  );
}

function isItemPhotoRecord(value: unknown): value is ItemPhotoRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ItemPhotoRecord>;

  return (
    typeof candidate.itemId === "string" &&
    typeof candidate.updatedAt === "string" &&
    typeof candidate.width === "number" &&
    typeof candidate.height === "number" &&
    typeof candidate.blob === "object" &&
    candidate.blob !== null &&
    typeof candidate.blob.arrayBuffer === "function"
  );
}

async function requireItemPhotoDatabase() {
  const database = await openItemPhotoDatabase();

  if (!database) {
    throw new Error("当前浏览器不支持本地照片存储。");
  }

  return database;
}

function openItemPhotoDatabase(): Promise<IDBDatabase | undefined> {
  if (typeof indexedDB === "undefined") {
    return Promise.resolve(undefined);
  }

  if (photoDatabasePromise) {
    return photoDatabasePromise;
  }

  const pendingDatabase = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(
      ITEM_PHOTO_DATABASE,
      ITEM_PHOTO_DATABASE_VERSION,
    );

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(ITEM_PHOTO_STORE)) {
        database.createObjectStore(ITEM_PHOTO_STORE, { keyPath: "itemId" });
      }

      for (const storeName of Array.from(database.objectStoreNames)) {
        if (storeName !== ITEM_PHOTO_STORE) {
          database.deleteObjectStore(storeName);
        }
      }
    };
    request.onsuccess = () => {
      const database = request.result;

      database.onversionchange = () => {
        database.close();
        photoDatabasePromise = undefined;
      };
      resolve(database);
    };
    request.onerror = () => {
      reject(request.error ?? new Error("无法打开物品照片库。"));
    };
    request.onblocked = () => {
      reject(new Error("物品照片库正在被其他页面占用。"));
    };
  });

  photoDatabasePromise = pendingDatabase;
  void pendingDatabase.catch(() => {
    if (photoDatabasePromise === pendingDatabase) {
      photoDatabasePromise = undefined;
    }
  });

  return pendingDatabase;
}

function waitForRequest<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      reject(request.error ?? new Error("读取物品照片失败。"));
    };
  });
}

function waitForTransaction(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => {
      reject(transaction.error ?? new Error("物品照片操作已中止。"));
    };
    transaction.onerror = () => {
      reject(transaction.error ?? new Error("物品照片操作失败。"));
    };
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("照片压缩失败。"));
        }
      },
      mimeType,
      quality,
    );
  });
}

async function decodeImage(blob: Blob): Promise<{
  dispose: () => void;
  height: number;
  source: CanvasImageSource;
  width: number;
}> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(blob);

      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        dispose: () => bitmap.close(),
      };
    } catch {
      // Some mobile browsers expose createImageBitmap but reject HEIC/JPEG input.
    }
  }

  if (
    typeof document === "undefined" ||
    typeof Image === "undefined" ||
    typeof URL === "undefined" ||
    typeof URL.createObjectURL !== "function"
  ) {
    throw new Error("当前环境无法读取照片。");
  }

  const objectUrl = URL.createObjectURL(blob);
  const image = new Image();

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("无法读取这张照片。"));
      image.src = objectUrl;
    });

    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      dispose: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}
