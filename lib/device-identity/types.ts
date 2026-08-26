export type PreferredEntry = "checklist" | "baby" | "auto";

export type DeviceIdentityLocalData = {
  version: 1;
  preferredEntry: PreferredEntry;
  onboardingCompletedAt: number | null;
};
