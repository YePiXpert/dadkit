import { describe, expect, it } from "vitest";

import { mergeBabyCare } from "@/lib/baby/merge";
import type { BabyCarePortableData, CareEvent, DiaperEvent } from "@/lib/baby/types";

function diaper(id: string, updatedAt: number, deletedAt: number | null = null): DiaperEvent {
  return { id, type: "diaper", note: "", createdAt: 1, updatedAt, deletedAt, occurredAt: "2026-08-01T00:00:00.000Z", kind: "wet" };
}
const care = (events: CareEvent[], clearedAt = 0): BabyCarePortableData => ({ version: 1, clearedAt, events });

describe("baby care merge", () => {
  it("keeps different ids and picks newer same-id records", () => {
    const merged = mergeBabyCare(care([diaper("a", 10), diaper("same", 10)]), care([diaper("b", 20), diaper("same", 30)]));
    expect(merged.events.map((event) => event.id)).toEqual(["a", "b", "same"]);
    expect(merged.events.find((event) => event.id === "same")?.updatedAt).toBe(30);
  });

  it("keeps local on ties and lets newer edit or deletion win", () => {
    const remoteTie = diaper("same", 20);
    remoteTie.kind = "dirty";
    const tied = mergeBabyCare(care([diaper("same", 20)]), care([remoteTie])).events[0];
    expect(tied?.type === "diaper" ? tied.kind : undefined).toBe("wet");
    expect(mergeBabyCare(care([diaper("same", 20)]), care([diaper("same", 30, 30)])).events[0]?.deletedAt).toBe(30);
    expect(mergeBabyCare(care([diaper("same", 40)]), care([diaper("same", 30, 30)])).events[0]?.deletedAt).toBeNull();
  });

  it("uses clearedAt as a global tombstone and keeps newer events", () => {
    const merged = mergeBabyCare(care([], 100), care([diaper("old", 99), diaper("new", 101)]));
    expect(merged.events.map((event) => event.id)).toEqual(["new"]);
  });

  it("does not mutate inputs", () => {
    const local = care([diaper("a", 10)]);
    const remote = care([diaper("b", 20)]);
    const before = [structuredClone(local), structuredClone(remote)];
    mergeBabyCare(local, remote);
    expect([local, remote]).toEqual(before);
  });
});
