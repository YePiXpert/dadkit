import { describe, expect, it } from "vitest";

import { createEmptyHousehold } from "@/lib/household/defaults";
import { mergeHousehold } from "@/lib/household/merge";

function household(id: string, timestamp: number) {
  const data = createEmptyHousehold();
  data.members[id] = { id, createdAt: timestamp, displayName: { value: id, updatedAt: timestamp }, relationshipLabel: { value: "", updatedAt: timestamp }, deleted: { value: false, updatedAt: timestamp } };
  return data;
}

describe("household field-level merge", () => {
  it("keeps different members and independent field edits", () => {
    const local = household("member-a", 10);
    local.householdName = { value: "小满之家", updatedAt: 20 };
    const remote = household("member-b", 30);
    remote.members["member-a"] = { ...local.members["member-a"], displayName: { value: "小江", updatedAt: 40 } };
    const merged = mergeHousehold(local, remote);
    expect(Object.keys(merged.members)).toEqual(["member-a", "member-b"]);
    expect(merged.householdName.value).toBe("小满之家");
    expect(merged.members["member-a"].displayName.value).toBe("小江");
  });

  it("keeps local on ties and preserves deletion tombstones", () => {
    const local = household("member-a", 10);
    const remote = structuredClone(local);
    remote.members["member-a"].displayName = { value: "远端", updatedAt: 10 };
    expect(mergeHousehold(local, remote).members["member-a"].displayName.value).toBe("member-a");
    remote.members["member-a"].deleted = { value: true, updatedAt: 20 };
    expect(mergeHousehold(local, remote).members["member-a"].deleted.value).toBe(true);
  });

  it("prevents members from returning after clearedAt and keeps new members", () => {
    const local = createEmptyHousehold(100);
    const remote = household("old", 50);
    expect(mergeHousehold(local, remote).members).toEqual({});
    remote.members.new = { id: "new", createdAt: 101, displayName: { value: "新成员", updatedAt: 101 }, relationshipLabel: { value: "", updatedAt: 101 }, deleted: { value: false, updatedAt: 101 } };
    expect(mergeHousehold(local, remote).members.new.displayName.value).toBe("新成员");
  });

  it("does not mutate inputs", () => {
    const local = household("a", 1), remote = household("b", 2);
    const before = structuredClone([local, remote]);
    mergeHousehold(local, remote);
    expect([local, remote]).toEqual(before);
  });
});
