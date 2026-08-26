import { describe, expect, it } from "vitest";

import { createEmptyBabyData } from "@/lib/baby/defaults";
import { MemoryBabyRepository } from "@/lib/baby/repository";
import type { CareEvent } from "@/lib/baby/types";

const diaper = (id: string, updatedAt = 1): CareEvent => ({ id, type: "diaper", note: "", createdAt: 1, updatedAt, deletedAt: null, occurredAt: "2026-08-01T00:00:00.000Z", kind: "wet" });

describe("baby repository contract", () => {
  it("saves profiles and events, queries ranges and active records", async () => {
    const repository = new MemoryBabyRepository();
    const data = createEmptyBabyData();
    data.profile.fields.birthDate = { value: "2026-08-01", updatedAt: 2 };
    await repository.saveBabyProfile(data.profile);
    await repository.putEvents([diaper("d1"), { id: "sleep", type: "sleep", note: "", createdAt: 2, updatedAt: 2, deletedAt: null, startAt: "2026-08-01T01:00:00.000Z", endAt: null }]);
    expect((await repository.loadBabyProfile()).fields.birthDate.value).toBe("2026-08-01");
    expect(await repository.getEventsByRange(Date.parse("2026-08-01T00:00:00.000Z"), Date.parse("2026-08-02T00:00:00.000Z"))).toHaveLength(2);
    expect(await repository.getActiveEvents()).toHaveLength(1);
  });

  it("writes deletion tombstones and supports transactional replacement", async () => {
    const repository = new MemoryBabyRepository();
    await repository.putEvent(diaper("d1"));
    expect((await repository.deleteEventAsTombstone("d1", 10))?.deletedAt).toBe(10);
    const replacement = createEmptyBabyData(20);
    await repository.replaceBabyDataTransaction(replacement);
    expect(await repository.getAllBabyData()).toEqual(replacement);
  });

  it("does not partially replace data when an injected write fails", async () => {
    const repository = new MemoryBabyRepository();
    await repository.putEvent(diaper("keep"));
    const before = await repository.getAllBabyData();
    repository.failNextWrite = true;
    await expect(repository.replaceBabyDataTransaction(createEmptyBabyData(20))).rejects.toThrow("Injected");
    expect(await repository.getAllBabyData()).toEqual(before);
  });

  it("stores at most two v8 snapshots outside localStorage", async () => {
    const repository = new MemoryBabyRepository();
    for (let index = 0; index < 3; index += 1) await repository.saveSnapshot({ id: `s${index}`, createdAt: new Date(index * 1000).toISOString(), reason: `${index}`, data: createEmptyBabyData() });
    expect((await repository.loadSnapshots()).map((snapshot) => snapshot.id)).toEqual(["s2", "s1"]);
  });
});
