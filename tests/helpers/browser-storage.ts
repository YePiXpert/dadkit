import { vi } from "vitest";

export type BrowserStorageHarness = {
  localValues: Map<string, string>;
  sessionValues: Map<string, string>;
  reads: string[];
  writes: string[];
  removals: string[];
};

// 统一的浏览器存储 mock:localStorage + sessionStorage 都用 Map 实现,
// 读写删恒开追踪,调用方按需取用。
export function installBrowserStorage(
  initial: Record<string, string> = {},
): BrowserStorageHarness {
  const localValues = new Map(Object.entries(initial));
  const sessionValues = new Map<string, string>();
  const reads: string[] = [];
  const writes: string[] = [];
  const removals: string[] = [];

  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => {
        reads.push(key);
        return localValues.get(key) ?? null;
      },
      setItem: (key: string, value: string) => {
        writes.push(key);
        localValues.set(key, value);
      },
      removeItem: (key: string) => {
        removals.push(key);
        localValues.delete(key);
      },
      clear: () => localValues.clear(),
    },
    sessionStorage: {
      getItem: (key: string) => sessionValues.get(key) ?? null,
      setItem: (key: string, value: string) => sessionValues.set(key, value),
      removeItem: (key: string) => sessionValues.delete(key),
      clear: () => sessionValues.clear(),
    },
  });

  return { localValues, sessionValues, reads, writes, removals };
}

// 让指定 key 的下一次 localStorage 写入抛错,用于验证事务回滚。
export function failNextStorageWrite(key: string) {
  const setItem = window.localStorage.setItem.bind(window.localStorage);
  let shouldFail = true;

  vi.spyOn(window.localStorage, "setItem").mockImplementation(
    (candidateKey, value) => {
      if (shouldFail && candidateKey === key) {
        shouldFail = false;
        throw new Error("simulated storage write failure");
      }

      setItem(candidateKey, value);
    },
  );
}
