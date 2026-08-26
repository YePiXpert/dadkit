import { beforeEach, describe, expect, it } from "vitest";

import { DEVICE_IDENTITY_STORAGE_KEY, loadDeviceIdentity, saveDeviceIdentity } from "@/lib/device-identity/repository";
import { buildLatestPortableData, createSnapshotAsync, exportData, saveChecklist } from "@/lib/storage";
import { installBrowserStorage } from "@/tests/helpers/browser-storage";
import { buildDadKitWebDavBackup } from "@/lib/webdav/client";
import { useDeviceIdentityStore } from "@/lib/device-identity/store";
import { failNextStorageWrite } from "@/tests/helpers/browser-storage";
import { portableTestItem } from "@/tests/helpers/portable-data";

beforeEach(() => installBrowserStorage());

describe("device identity isolation", () => {
  it("persists locally but never enters portable data", () => {
    saveDeviceIdentity({ version: 1, preferredEntry: "baby", onboardingCompletedAt: 10 });
    expect(loadDeviceIdentity().preferredEntry).toBe("baby");
    expect(window.localStorage.getItem(DEVICE_IDENTITY_STORAGE_KEY)).toContain("preferredEntry");
    expect(JSON.stringify(exportData())).not.toContain("preferredEntry");
  });

  it("drops the retired currentMemberId field from legacy storage", () => {
    window.localStorage.setItem(
      DEVICE_IDENTITY_STORAGE_KEY,
      JSON.stringify({ version: 1, currentMemberId: "member-a", preferredEntry: "auto", onboardingCompletedAt: 10 }),
    );
    expect(loadDeviceIdentity()).toEqual({
      version: 1,
      preferredEntry: "auto",
      onboardingCompletedAt: 10,
    });
  });

  it("never enters complete JSON, IndexedDB snapshots or WebDAV envelopes", async () => {
    saveDeviceIdentity({ version: 1, preferredEntry: "baby", onboardingCompletedAt: 10 });
    saveChecklist([portableTestItem("snapshot-seed")]);

    const portable = await buildLatestPortableData();
    const snapshot = await createSnapshotAsync("设备身份隔离测试");
    const webDav = buildDadKitWebDavBackup(portable, "device-1");
    for (const value of [portable, snapshot, webDav]) {
      const serialized = JSON.stringify(value);
      expect(serialized).toBeDefined();
      expect(serialized).not.toContain("onboardingCompletedAt");
      expect(serialized).not.toContain("preferredEntry");
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
      preferredEntry: "auto",
      onboardingCompletedAt: 10,
    });

    const result = useDeviceIdentityStore
      .getState()
      .setPreferredEntry("baby");

    expect(result.ok).toBe(true);
    expect(loadDeviceIdentity()).toMatchObject({
      preferredEntry: "baby",
      onboardingCompletedAt: 10,
    });
  });
});
