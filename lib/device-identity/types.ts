export type PreferredEntry = "checklist" | "baby" | "auto";

export type DeviceIdentityLocalData = {
  version: 1;
  currentMemberId: string | null;
  preferredEntry: PreferredEntry;
  onboardingCompletedAt: number | null;
};
