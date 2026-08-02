import { beforeEach, describe, expect, it } from "vitest";

import { saveDeviceIdentity, loadDeviceIdentity } from "@/lib/device-identity/repository";
import { createEmptyHousehold } from "@/lib/household/defaults";
import { getActiveHouseholdMembers, getRemovedHouseholdMembers } from "@/lib/household/selectors";
import { useHouseholdStore } from "@/lib/household/store";
import { installBrowserStorage } from "@/tests/helpers/browser-storage";
import { useDeviceIdentityStore } from "@/lib/device-identity/store";

beforeEach(() => {
  installBrowserStorage();
  useHouseholdStore.setState({ hydrated: true, household: createEmptyHousehold() });
});

describe("household store", () => {
  it("adds, edits and tombstones members without reusing their ids", () => {
    const added = useHouseholdStore.getState().addMember({ displayName: " 小\n江 ", relationshipLabel: " 家长 " });
    expect(added.ok).toBe(true);
    const id = added.memberId!;
    expect(useHouseholdStore.getState().household.members[id].displayName.value).toBe("小江");

    const beforeRelationship = useHouseholdStore.getState().household.members[id].relationshipLabel.updatedAt;
    expect(useHouseholdStore.getState().updateMember(id, { displayName: "小江同学", relationshipLabel: "家长" }).ok).toBe(true);
    expect(useHouseholdStore.getState().household.members[id].relationshipLabel.updatedAt).toBe(beforeRelationship);
    expect(useHouseholdStore.getState().removeMember(id).ok).toBe(true);
    expect(getRemovedHouseholdMembers(useHouseholdStore.getState().household).map((member) => member.id)).toEqual([id]);

    const replacement = useHouseholdStore.getState().addMember({ displayName: "小江同学", relationshipLabel: "家长" });
    expect(replacement.memberId).not.toBe(id);
  });

  it("enforces the active limit and clears an unavailable local device member", () => {
    let selectedId = "";
    for (let index = 0; index < 12; index += 1) {
      const result = useHouseholdStore.getState().addMember({ displayName: `成员${index}`, relationshipLabel: "" });
      expect(result.ok).toBe(true);
      selectedId ||= result.memberId!;
    }
    expect(useHouseholdStore.getState().addMember({ displayName: "第十三人", relationshipLabel: "" }).ok).toBe(false);
    saveDeviceIdentity({ version: 1, currentMemberId: selectedId, preferredEntry: "auto", onboardingCompletedAt: 1 });
    useDeviceIdentityStore.setState({ version: 1, currentMemberId: selectedId, preferredEntry: "auto", onboardingCompletedAt: 1, hydrated: true });
    useHouseholdStore.getState().removeMember(selectedId);
    expect(loadDeviceIdentity().currentMemberId).toBeNull();
    expect(useDeviceIdentityStore.getState().currentMemberId).toBeNull();
    expect(getActiveHouseholdMembers(useHouseholdStore.getState().household)).toHaveLength(11);
  });

  it("clears names and members with a newer clearedAt", () => {
    useHouseholdStore.getState().setHouseholdName("小满之家");
    useHouseholdStore.getState().addMember({ displayName: "奶奶", relationshipLabel: "祖辈" });
    const before = useHouseholdStore.getState().household;
    useHouseholdStore.getState().clearAll();
    const after = useHouseholdStore.getState().household;
    expect(after.clearedAt).toBeGreaterThan(before.householdName.updatedAt);
    expect(after.householdName.value).toBe("");
    expect(after.members).toEqual({});
  });
});
