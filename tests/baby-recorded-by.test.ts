import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createEmptyBabyProfile } from "@/lib/baby/defaults";
import { MemoryBabyRepository, setBabyRepositoryForTests } from "@/lib/baby/repository";
import { useBabyStore } from "@/lib/baby/store";
import { saveDeviceIdentity } from "@/lib/device-identity/repository";
import { createEmptyHousehold } from "@/lib/household/defaults";
import { saveHousehold } from "@/lib/household/repository";
import { installBrowserStorage } from "@/tests/helpers/browser-storage";

let repository: MemoryBabyRepository;

beforeEach(() => {
  installBrowserStorage();
  const household = createEmptyHousehold();
  household.members["member-a"] = {
    id: "member-a",
    createdAt: 1,
    displayName: { value: "小江", updatedAt: 1 },
    relationshipLabel: { value: "家长", updatedAt: 1 },
    deleted: { value: false, updatedAt: 1 },
  };
  saveHousehold(household);
  repository = new MemoryBabyRepository();
  setBabyRepositoryForTests(repository);
  useBabyStore.setState({ hydrated: false, profile: createEmptyBabyProfile(), careClearedAt: 0, recentEvents: [], todayEvents: [], activeEvents: [], timelineEvents: [], loading: false, repositoryError: undefined, changeToken: 0 });
});

afterEach(() => setBabyRepositoryForTests(undefined));

describe("baby event recorder", () => {
  it("uses the current device member for new records and null when unset", async () => {
    saveDeviceIdentity({ version: 1, currentMemberId: "member-a", preferredEntry: "auto", onboardingCompletedAt: 1 });
    await useBabyStore.getState().hydrate();
    await useBabyStore.getState().addDiaperRecord({ occurredAt: new Date().toISOString(), kind: "wet", note: "" });
    expect((await repository.getAllEventsForPortableExport())[0].recordedByMemberId).toBe("member-a");
    saveDeviceIdentity({ version: 1, currentMemberId: null, preferredEntry: "auto", onboardingCompletedAt: 1 });
    await useBabyStore.getState().addDiaperRecord({ occurredAt: new Date().toISOString(), kind: "dirty", note: "" });
    expect((await repository.getAllEventsForPortableExport()).some((event) => event.recordedByMemberId === null)).toBe(true);
  });

  it("keeps the recorder while switching and finishing timers", async () => {
    saveDeviceIdentity({ version: 1, currentMemberId: "member-a", preferredEntry: "auto", onboardingCompletedAt: 1 });
    await useBabyStore.getState().hydrate();
    await useBabyStore.getState().startBreastfeeding("left");
    await useBabyStore.getState().switchBreastfeedingSide("right");
    await useBabyStore.getState().finishBreastfeeding();
    expect((await repository.getAllEventsForPortableExport())[0].recordedByMemberId).toBe("member-a");
  });

  it("uses null for a stale device member and honors an explicit per-record choice", async () => {
    saveDeviceIdentity({ version: 1, currentMemberId: "missing-member", preferredEntry: "auto", onboardingCompletedAt: 1 });
    await useBabyStore.getState().hydrate();
    await useBabyStore.getState().addDiaperRecord(
      { occurredAt: new Date().toISOString(), kind: "wet", note: "" },
    );
    await useBabyStore.getState().addDiaperRecord(
      { occurredAt: new Date().toISOString(), kind: "dirty", note: "" },
      "member-a",
    );
    const events = await repository.getAllEventsForPortableExport();
    expect(events.find((event) => event.type === "diaper" && event.kind === "wet")?.recordedByMemberId).toBeNull();
    expect(events.find((event) => event.type === "diaper" && event.kind === "dirty")?.recordedByMemberId).toBe("member-a");
  });
});
