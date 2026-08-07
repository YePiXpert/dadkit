import { beforeEach, describe, expect, it } from "vitest";

import { DEVICE_IDENTITY_STORAGE_KEY, clearCurrentMemberIfUnavailable, loadDeviceIdentity, saveDeviceIdentity } from "@/lib/device-identity/repository";
import { createEmptyHousehold } from "@/lib/household/defaults";
import { buildLatestPortableData, createSnapshotAsync, exportData } from "@/lib/storage";
import { installBrowserStorage } from "@/tests/helpers/browser-storage";
import { buildDadKitWebDavBackup } from "@/lib/webdav/client";
import { saveHousehold } from "@/lib/household/repository";
import { useDeviceIdentityStore } from "@/lib/device-identity/store";
import { failNextStorageWrite } from "@/tests/helpers/browser-storage";

beforeEach(() => installBrowserStorage());

describe("device identity isolation", () => {
  it("persists locally but never enters portable data", () => {
    saveDeviceIdentity({ version: 1, currentMemberId: "member-a", preferredEntry: "baby", onboardingCompletedAt: 10 });
    expect(loadDeviceIdentity().currentMemberId).toBe("member-a");
    expect(window.localStorage.getItem(DEVICE_IDENTITY_STORAGE_KEY)).toContain("member-a");
    expect(JSON.stringify(exportData())).not.toContain("currentMemberId");
  });

  it("clears the local selection after a member is removed", () => {
    const household = createEmptyHousehold();
    household.members["member-a"] = { id: "member-a", createdAt: 1, displayName: { value: "小江", updatedAt: 1 }, relationshipLabel: { value: "", updatedAt: 1 }, deleted: { value: true, updatedAt: 2 } };
    saveDeviceIdentity({ version: 1, currentMemberId: "member-a", preferredEntry: "auto", onboardingCompletedAt: null });
    expect(clearCurrentMemberIfUnavailable(household)).toBe(true);
    expect(loadDeviceIdentity().currentMemberId).toBeNull();
  });

  it("never enters complete JSON, IndexedDB snapshots or WebDAV envelopes", async () => {
    const household = createEmptyHousehold();
    household.householdName = { value: "隔离测试家庭", updatedAt: 1 };
    saveHousehold(household);
    saveDeviceIdentity({ version: 1, currentMemberId: "member-secret", preferredEntry: "baby", onboardingCompletedAt: 10 });

    const portable = await buildLatestPortableData();
    const snapshot = await createSnapshotAsync("设备身份隔离测试");
    const webDav = buildDadKitWebDavBackup(portable, "device-1");
    for (const value of [portable, snapshot, webDav]) {
      expect(JSON.stringify(value)).not.toContain("member-secret");
      expect(JSON.stringify(value)).not.toContain("currentMemberId");
    }
  });

  it("does not update the identity store after a failed write", () => {
    useDeviceIdentityStore.setState({
      ...loadDeviceIdentity(),
      hydrated: true,
    });
    const before = useDeviceIdentityStore.getState().preferredEntry;
    failNextStorageWrite(DEVICE_IDENTITY_STORAGE_KEY);

    const result = useDeviceIdentityStore
      .getState()
      .setPreferredEntry("baby");

    expect(result.ok).toBe(false);
    expect(result.message).toContain("本机存储");
    expect(useDeviceIdentityStore.getState().preferredEntry).toBe(before);
  });

  it("rebases a field patch on the latest persisted identity", () => {
    useDeviceIdentityStore.setState({
      ...loadDeviceIdentity(),
      hydrated: true,
    });
    saveDeviceIdentity({
      version: 1,
      currentMemberId: "member-external",
      preferredEntry: "auto",
      onboardingCompletedAt: 10,
    });

    const result = useDeviceIdentityStore
      .getState()
      .setPreferredEntry("baby");

    expect(result.ok).toBe(true);
    expect(loadDeviceIdentity()).toMatchObject({
      currentMemberId: "member-external",
      preferredEntry: "baby",
      onboardingCompletedAt: 10,
    });
  });
});
