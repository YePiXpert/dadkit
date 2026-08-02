import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createEmptyBabyData } from "@/lib/baby/defaults";
import { MemoryBabyRepository, setBabyRepositoryForTests } from "@/lib/baby/repository";
import type { CareEvent } from "@/lib/baby/types";
import {
  STORAGE_KEYS,
  applyImportDataAsync,
  createSnapshotAsync,
  loadChecklist,
  loadSnapshotsAsync,
  restoreSnapshotAsync,
  saveChecklist,
  saveSnapshots,
} from "@/lib/storage";
import { installBrowserStorage } from "@/tests/helpers/browser-storage";
import { portableTestItem, portableV7, portableV8 } from "@/tests/helpers/portable-data";

let repository: MemoryBabyRepository;

function diaper(id: string, updatedAt: number): CareEvent {
  return { id, type: "diaper", note: "", createdAt: updatedAt, updatedAt, deletedAt: null, occurredAt: "2026-08-01T00:00:00.000Z", kind: "wet" };
}

beforeEach(() => {
  installBrowserStorage();
  repository = new MemoryBabyRepository();
  setBabyRepositoryForTests(repository);
});

afterEach(() => {
  setBabyRepositoryForTests(undefined);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("baby snapshots and compensated import rollback", () => {
  it("stores and restores complete v8 snapshots in IndexedDB only", async () => {
    const data = createEmptyBabyData();
    data.profile.fields.birthDate = { value: "2026-08-01", updatedAt: 10 };
    data.care.events = [diaper("snapshot-event", 20)];
    await repository.replaceBabyDataTransaction(data);
    const storage = installBrowserStorage();

    const snapshot = await createSnapshotAsync("宝宝快照测试");
    if (!snapshot || snapshot.data.version !== 8) throw new Error("v8 快照未创建");
    expect(snapshot.data.baby.care.events.map((event) => event.id)).toEqual(["snapshot-event"]);
    expect(storage.writes).not.toContain(STORAGE_KEYS.snapshots);
    expect(await loadSnapshotsAsync()).toHaveLength(1);

    await repository.clearAllBabyData(100);
    const restored = await restoreSnapshotAsync(snapshot!.id, { snapshotBeforeRestore: false });
    expect(restored.ok).toBe(true);
    expect((await repository.getAllBabyData()).care.events.map((event) => event.id)).toEqual(["snapshot-event"]);
  });

  it("reads legacy localStorage snapshots and gives v7 restore a safe baby tombstone", async () => {
    await repository.putEvent(diaper("legacy-local-event", 50));
    saveSnapshots([{
      id: "legacy-v7",
      createdAt: "2026-08-01T00:00:00.000Z",
      reason: "旧恢复点",
      data: portableV7(),
    }]);

    const snapshots = await loadSnapshotsAsync();
    expect(snapshots.map((snapshot) => snapshot.id)).toContain("legacy-v7");
    const result = await restoreSnapshotAsync("legacy-v7", { snapshotBeforeRestore: false });
    expect(result.ok).toBe(true);
    expect(result.message).toContain("v7 备份不包含宝宝资料和照护记录");
    const baby = await repository.getAllBabyData();
    expect(baby.care.events).toEqual([]);
    expect(baby.care.clearedAt).toBeGreaterThan(50);
    expect(baby.profile.clearedAt).toBe(baby.care.clearedAt);
  });

  it("rolls back localStorage and baby IndexedDB when the baby write fails", async () => {
    const oldChecklist = [portableTestItem("old-item")];
    saveChecklist(oldChecklist);
    await repository.putEvent(diaper("old-baby-event", 10));
    const beforeBaby = await repository.getAllBabyData();

    const incoming = portableV8({ checklist: [portableTestItem("new-item")] });
    incoming.baby.care.events = [diaper("new-baby-event", 20)];
    repository.failNextWrite = true;
    const result = await applyImportDataAsync(incoming);

    expect(result).toEqual({ ok: false, message: "导入失败，本地数据已回滚。" });
    expect(loadChecklist().map((item) => item.id)).toEqual(["old-item"]);
    expect(await repository.getAllBabyData()).toEqual(beforeBaby);
  });
});
