import { describe, expect, it } from "vitest";

import { createEmptyHousehold } from "@/lib/household/defaults";
import { isHouseholdPortableData, normalizeHouseholdText, validateHouseholdMemberDraft, validateHouseholdName } from "@/lib/household/validation";

function member(id: string, timestamp = 1) {
  return { id, createdAt: timestamp, displayName: { value: "小江", updatedAt: timestamp }, relationshipLabel: { value: "自定义照护者", updatedAt: timestamp }, deleted: { value: false, updatedAt: timestamp } };
}

describe("household strict validation", () => {
  it("accepts an empty household name and custom relationships", () => {
    const household = createEmptyHousehold();
    household.members["member-a"] = member("member-a");
    expect(isHouseholdPortableData(household)).toBe(true);
  });

  it("normalizes controls and rejects empty or too-long names", () => {
    expect(normalizeHouseholdText(" \u0000 小\n江 ")).toBe("小江");
    expect(validateHouseholdMemberDraft({ displayName: "   ", relationshipLabel: "" }).ok).toBe(false);
    expect(validateHouseholdMemberDraft({ displayName: "a".repeat(41), relationshipLabel: "" }).ok).toBe(false);
    expect(validateHouseholdMemberDraft({ displayName: "小江", relationshipLabel: "a".repeat(31) }).ok).toBe(false);
    expect(validateHouseholdName("a".repeat(41)).ok).toBe(false);
  });

  it("rejects dangerous ids, invalid timestamps, unknown fields and excess records", () => {
    const dangerous = createEmptyHousehold();
    Object.defineProperty(dangerous.members, "__proto__", {
      configurable: true,
      enumerable: true,
      value: member("__proto__"),
      writable: true,
    });
    expect(isHouseholdPortableData(dangerous)).toBe(false);
    expect(isHouseholdPortableData({ ...createEmptyHousehold(), clearedAt: -1 })).toBe(false);
    expect(isHouseholdPortableData({ ...createEmptyHousehold(), extra: true })).toBe(false);
    const unknownMemberField = createEmptyHousehold() as ReturnType<typeof createEmptyHousehold> & {
      members: Record<string, ReturnType<typeof member> & { extra?: boolean }>;
    };
    unknownMemberField.members["member-a"] = { ...member("member-a"), extra: true };
    expect(isHouseholdPortableData(unknownMemberField)).toBe(false);
    const tooMany = createEmptyHousehold();
    for (let index = 0; index < 101; index += 1) tooMany.members[`member-${index}`] = { ...member(`member-${index}`), deleted: { value: true, updatedAt: 1 } };
    expect(isHouseholdPortableData(tooMany)).toBe(false);
  });

  it("rejects more than 12 active members without mutating input", () => {
    const household = createEmptyHousehold();
    for (let index = 0; index < 13; index += 1) household.members[`member-${index}`] = member(`member-${index}`);
    const before = structuredClone(household);
    expect(isHouseholdPortableData(household)).toBe(false);
    expect(household).toEqual(before);
  });
});
