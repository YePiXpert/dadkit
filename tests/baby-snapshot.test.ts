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
import { loadDeviceIdentity, saveDeviceIdentity } from "@/lib/device-identity/repository";
import { createEmptyHousehold } from "@/lib/household/defaults";
import { loadHousehold, saveHousehold } from "@/lib/household/repository";
import { createEmptyItemPlanningRecordV1 } from "@/lib/planning/defaults";

let repository: MemoryBabyRepository;

function diaper(id: string, updatedAt: number): CareEvent {
  return { id, type: "diaper", note: "", createdAt: updatedAt, updatedAt, deletedAt: null, recordedByMemberId: null, occurredAt: "2026-08-01T00:00:00.000Z", kind: "wet" };
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
  it("stores and restores complete v9 snapshots in IndexedDB only", async () => {
    const data = createEmptyBabyData();
    data.profile.fields.birthDate = { value: "2026-08-01", updatedAt: 10 };
    data.care.events = [diaper("snapshot-event", 20)];
    await repository.replaceBabyDataTransaction(data);
    const storage = installBrowserStorage();

    const snapshot = await createSnapshotAsync("宝宝快照测试");
    if (!snapshot || snapshot.data.version !== 9) throw new Error("v9 快照未创建");
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
    const oldHousehold = createEmptyHousehold();
    oldHousehold.members["member-a"] = {
      id: "member-a",
      createdAt: 1,
      displayName: { value: "小江", updatedAt: 1 },
      relationshipLabel: { value: "家长", updatedAt: 1 },
      deleted: { value: false, updatedAt: 1 },
    };
    saveHousehold(oldHousehold);
    const oldIdentity = { version: 1 as const, currentMemberId: "member-a", preferredEntry: "baby" as const, onboardingCompletedAt: 10 };
    saveDeviceIdentity(oldIdentity);
    await repository.putEvent(diaper("old-baby-event", 10));
    const beforeBaby = await repository.getAllBabyData();

    const incoming = portableV8({ checklist: [portableTestItem("new-item")] });
    const { recordedByMemberId: _recordedByMemberId, ...legacyEvent } = diaper("new-baby-event", 20);
    void _recordedByMemberId;
    incoming.baby.care.events = [legacyEvent];
    repository.failNextWrite = true;
    const result = await applyImportDataAsync(incoming);

    expect(result).toEqual({ ok: false, message: "导入失败，本地数据已回滚。" });
    expect(loadChecklist().map((item) => item.id)).toEqual(["old-item"]);
    expect(await repository.getAllBabyData()).toEqual(beforeBaby);
    expect(loadHousehold()).toEqual(oldHousehold);
    expect(loadDeviceIdentity()).toEqual(oldIdentity);
  });

  it("fully restores v8 with deterministic legacy members and resets only the local identity", async () => {
    const current = createEmptyHousehold();
    current.members["custom-before"] = {
      id: "custom-before",
      createdAt: 500,
      displayName: { value: "导入前成员", updatedAt: 500 },
      relationshipLabel: { value: "自定义", updatedAt: 500 },
      deleted: { value: false, updatedAt: 500 },
    };
    saveHousehold(current);
    saveDeviceIdentity({ version: 1, currentMemberId: "custom-before", preferredEntry: "baby", onboardingCompletedAt: 10 });

    const incoming = portableV8();
    incoming.planning.items.bag = {
      ...createEmptyItemPlanningRecordV1(),
      assignee: { value: "dad", updatedAt: 20 },
    };
    const { recordedByMemberId: _recorder, ...legacyEvent } = diaper("legacy-v8-event", 30);
    void _recorder;
    incoming.baby.care.events = [legacyEvent];

    const result = await applyImportDataAsync(incoming);
    expect(result.ok).toBe(true);
    const household = loadHousehold();
    expect(household.members["custom-before"]).toBeUndefined();
    expect(household.members["legacy-dad-v1"].createdAt).toBeGreaterThan(household.clearedAt);
    expect(loadDeviceIdentity().currentMemberId).toBeNull();
    expect((await repository.getAllBabyData()).care.events[0].recordedByMemberId).toBeNull();
  });
});
