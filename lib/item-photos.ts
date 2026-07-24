const ITEM_PHOTO_DATABASE = "dadkit-v2-item-photos";
const ITEM_PHOTO_DATABASE_VERSION = 1;
const ITEM_PHOTO_STORE = "photos";

export const ITEM_PHOTO_MAX_EDGE = 800;
export const ITEM_PHOTO_JPEG_QUALITY = 0.8;

export type ItemPhotoDimensions = {
  height: number;
  width: number;
};

export type ItemPhotoRecord = ItemPhotoDimensions & {
  blob: Blob;
  itemId: string;
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

export async function getItemPhoto(itemId: string) {
  const normalizedItemId = normalizeItemId(itemId);
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

  return isItemPhotoRecord(result) ? result : undefined;
}

export async function saveItemPhoto(itemId: string, sourceBlob: Blob) {
  const normalizedItemId = normalizeItemId(itemId);
  const database = await requireItemPhotoDatabase();
  const compressed = await compressItemPhoto(sourceBlob);
  const record: ItemPhotoRecord = {
    itemId: normalizedItemId,
    blob: compressed.blob,
    width: compressed.width,
    height: compressed.height,
    updatedAt: new Date().toISOString(),
  };
  const transaction = database.transaction(ITEM_PHOTO_STORE, "readwrite");
  const completion = waitForTransaction(transaction);

  transaction.objectStore(ITEM_PHOTO_STORE).put(record);
  await completion;
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
  for (const listener of photoChangeListeners) {
    try {
      listener(itemId);
    } catch {
      // A stale UI subscriber must not make a successful photo write fail.
    }
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
