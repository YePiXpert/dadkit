import { vi } from "vitest";

export type FakeItemPhotoDbHarness = {
  records: Map<string, Record<string, unknown>>;
  seedPhoto: (itemId: string, updatedAt: string) => void;
};

type FakeCursor = {
  continue: () => void;
  delete: () => void;
  key: string;
  value: Record<string, unknown> | undefined;
};

type FakeRequest<T> = {
  error: Error | undefined;
  onerror: (() => void) | undefined;
  onsuccess: (() => void) | undefined;
  result: T | undefined;
};

// 轻量的 IndexedDB 内存替身:只实现 lib/item-photos.ts 用到的最小表面
// (open/upgrade、transaction、get/put/delete/clear、openCursor),
// 让照片缓存与孤儿清理逻辑可以在 node 测试里端到端跑通。
export function installFakeItemPhotoDb(): FakeItemPhotoDbHarness {
  const records = new Map<string, Record<string, unknown>>();
  const storeNames = new Set<string>();

  const database = {
    close: () => undefined,
    createObjectStore: (name: string) => {
      storeNames.add(name);
      return {};
    },
    deleteObjectStore: (name: string) => {
      storeNames.delete(name);
    },
    onversionchange: undefined as (() => void) | undefined,
    get objectStoreNames() {
      return Object.assign(Array.from(storeNames), {
        contains(name: string) {
          return storeNames.has(name);
        },
      });
    },
    transaction: () => createTransaction(),
  };

  function createTransaction() {
    let pendingRequests = 0;
    const transaction = {
      onabort: undefined as (() => void) | undefined,
      oncomplete: undefined as (() => void) | undefined,
      onerror: undefined as (() => void) | undefined,
      objectStore: () => storeAccess,
    };

    const scheduleCompletionCheck = () => {
      queueMicrotask(() => {
        if (pendingRequests === 0) {
          transaction.oncomplete?.();
        }
      });
    };

    function createRequest<T>(action: () => T): FakeRequest<T> {
      pendingRequests += 1;
      const request: FakeRequest<T> = {
        error: undefined,
        onerror: undefined,
        onsuccess: undefined,
        result: undefined,
      };

      queueMicrotask(() => {
        try {
          request.result = action();
          request.onsuccess?.();
        } catch (cause) {
          request.error =
            cause instanceof Error ? cause : new Error(String(cause));
          request.onerror?.();
        } finally {
          pendingRequests -= 1;
          scheduleCompletionCheck();
        }
      });

      return request;
    }

    function createCursorRequest(): FakeRequest<FakeCursor> {
      pendingRequests += 1;
      const keys = Array.from(records.keys());
      let index = 0;
      const request: FakeRequest<FakeCursor> = {
        error: undefined,
        onerror: undefined,
        onsuccess: undefined,
        result: undefined,
      };

      const step = () => {
        queueMicrotask(() => {
          if (index >= keys.length) {
            request.result = undefined;
            request.onsuccess?.();
            pendingRequests -= 1;
            scheduleCompletionCheck();
            return;
          }

          const key = keys[index];

          request.result = {
            continue: () => {
              index += 1;
              step();
            },
            delete: () => {
              records.delete(key);
            },
            key,
            value: records.get(key),
          };
          request.onsuccess?.();
        });
      };

      step();
      return request;
    }

    const storeAccess = {
      clear: () =>
        createRequest(() => {
          records.clear();
          return undefined;
        }),
      delete: (key: string) =>
        createRequest(() => {
          records.delete(key);
          return undefined;
        }),
      get: (key: string) => createRequest(() => records.get(key)),
      openCursor: () => createCursorRequest(),
      put: (record: Record<string, unknown> & { itemId: string }) =>
        createRequest(() => {
          records.set(record.itemId, record);
          return record.itemId;
        }),
    };

    return transaction;
  }

  vi.stubGlobal("indexedDB", {
    open: () => {
      const request = {
        error: undefined as Error | undefined,
        onblocked: undefined as (() => void) | undefined,
        onerror: undefined as (() => void) | undefined,
        onsuccess: undefined as (() => void) | undefined,
        onupgradeneeded: undefined as (() => void) | undefined,
        result: database,
      };

      queueMicrotask(() => request.onupgradeneeded?.());
      queueMicrotask(() => request.onsuccess?.());

      return request;
    },
  });

  return {
    records,
    seedPhoto: (itemId, updatedAt) => {
      records.set(itemId, {
        bytes: new TextEncoder().encode(`fake-jpeg:${itemId}`).buffer,
        height: 600,
        itemId,
        mimeType: "image/jpeg",
        updatedAt,
        width: 800,
      });
    },
  };
}
