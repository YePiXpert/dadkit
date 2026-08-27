// 物品照片功能(拍摄与展示)已下线。此文件只为数据迁移窗口期保留:
// 已拍摄的照片仍存放在本机 IndexedDB,可在「设置 - 备份与恢复」导出照片包,
// 或导入到仍在使用旧版本的设备。清空数据时也会一并删除照片库。
const ITEM_PHOTO_DATABASE = "dadkit-v2-item-photos";
const ITEM_PHOTO_DATABASE_VERSION = 3;
const ITEM_PHOTO_STORE = "photos";

export type ItemPhotoDimensions = {
  height: number;
  width: number;
};

export type ItemPhotoRecord = ItemPhotoDimensions & {
  blob: Blob;
  itemId: string;
  updatedAt: string;
};

export type ItemPhotoBackupRecord = ItemPhotoDimensions & {
  data: string;
  itemId: string;
  mimeType: string;
  updatedAt: string;
};

export type ItemPhotoBackup = {
  exportedAt: string;
  photos: ItemPhotoBackupRecord[];
  version: 1;
};

// WebKit's IndexedDB implementation can reject Blob/File structured clones.
// Persist raw bytes instead and recreate the Blob only at the export edge.
// Existing v2 records used Blob and remain readable through the legacy branch.
type StoredBinaryItemPhotoRecord = ItemPhotoDimensions & {
  bytes: ArrayBuffer;
  itemId: string;
  mimeType: string;
  updatedAt: string;
};

let photoDatabasePromise: Promise<IDBDatabase> | undefined;

export async function clearItemPhotos() {
  const database = await openItemPhotoDatabase();

  if (database) {
    const transaction = database.transaction(ITEM_PHOTO_STORE, "readwrite");
    const completion = waitForTransaction(transaction);

    transaction.objectStore(ITEM_PHOTO_STORE).clear();
    await completion;
  }
}

/**
 * Creates a portable, explicit photo package. Photos intentionally stay out of
 * normal checklist backups, so this can be downloaded before moving to
 * a new device without unexpectedly inflating every routine backup.
 */
export async function exportItemPhotos(): Promise<ItemPhotoBackup> {
  const database = await requireItemPhotoDatabase();
  const records = await readAllStoredItemPhotoRecords(database);
  const photos = (
    await Promise.all(
      records.map(async (value) => {
        const photo = toItemPhotoRecord(value);

        if (!photo) {
          return undefined;
        }

        return {
          data: arrayBufferToBase64(await photo.blob.arrayBuffer()),
          height: photo.height,
          itemId: photo.itemId,
          mimeType: photo.blob.type || "image/jpeg",
          updatedAt: photo.updatedAt,
          width: photo.width,
        } satisfies ItemPhotoBackupRecord;
      }),
    )
  ).filter((photo): photo is ItemPhotoBackupRecord => Boolean(photo));

  return { version: 1, exportedAt: new Date().toISOString(), photos };
}

export async function importItemPhotoBackup(payload: unknown) {
  if (!isItemPhotoBackup(payload)) {
    throw new Error("照片备份包格式无效。");
  }

  const records = payload.photos.map((photo) => ({
    bytes: base64ToArrayBuffer(photo.data),
    height: photo.height,
    itemId: normalizeItemId(photo.itemId),
    mimeType: photo.mimeType,
    updatedAt: photo.updatedAt,
    width: photo.width,
  } satisfies StoredBinaryItemPhotoRecord));

  const database = await requireItemPhotoDatabase();
  const transaction = database.transaction(ITEM_PHOTO_STORE, "readwrite");
  const completion = waitForTransaction(transaction);
  const store = transaction.objectStore(ITEM_PHOTO_STORE);

  for (const record of records) {
    store.put(record);
  }

  await completion;

  return payload.photos.length;
}

async function readAllStoredItemPhotoRecords(database: IDBDatabase) {
  const transaction = database.transaction(ITEM_PHOTO_STORE, "readonly");
  const completion = waitForTransaction(transaction);
  const request = transaction.objectStore(ITEM_PHOTO_STORE).openCursor();
  const records: unknown[] = [];

  await new Promise<void>((resolve, reject) => {
    request.onsuccess = () => {
      const cursor = request.result;

      if (!cursor) {
        resolve();
        return;
      }

      records.push(cursor.value);
      cursor.continue();
    };
    request.onerror = () => {
      reject(request.error ?? new Error("读取物品照片失败。"));
    };
  });
  await completion;

  return records;
}

function normalizeItemId(itemId: string) {
  const normalized = itemId.trim();

  if (!normalized) {
    throw new Error("物品标识不能为空。");
  }

  return normalized;
}

function isItemPhotoBackup(value: unknown): value is ItemPhotoBackup {
  if (!value || typeof value !== "object") {
    return false;
  }

  const backup = value as Partial<ItemPhotoBackup>;

  return (
    backup.version === 1 &&
    typeof backup.exportedAt === "string" &&
    Number.isFinite(Date.parse(backup.exportedAt)) &&
    Array.isArray(backup.photos) &&
    backup.photos.every(isItemPhotoBackupRecord)
  );
}

function isItemPhotoBackupRecord(
  value: unknown,
): value is ItemPhotoBackupRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const photo = value as Partial<ItemPhotoBackupRecord>;

  return (
    typeof photo.itemId === "string" &&
    photo.itemId.trim().length > 0 &&
    typeof photo.updatedAt === "string" &&
    Number.isFinite(Date.parse(photo.updatedAt)) &&
    Number.isInteger(photo.width) &&
    (photo.width ?? 0) > 0 &&
    Number.isInteger(photo.height) &&
    (photo.height ?? 0) > 0 &&
    typeof photo.mimeType === "string" &&
    photo.mimeType.toLowerCase().startsWith("image/") &&
    typeof photo.data === "string" &&
    /^[A-Za-z0-9+/]+={0,2}$/.test(photo.data) &&
    photo.data.length % 4 === 0
  );
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  if (typeof btoa !== "function") {
    throw new Error("当前浏览器无法导出照片备份包。");
  }

  const bytes = new Uint8Array(buffer);
  let binary = "";

  for (let start = 0; start < bytes.length; start += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(start, start + 0x8000));
  }

  return btoa(binary);
}

function base64ToArrayBuffer(value: string) {
  if (typeof atob !== "function") {
    throw new Error("当前浏览器无法导入照片备份包。");
  }

  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
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
