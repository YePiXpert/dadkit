export type StampedHouseholdValue<T> = {
  value: T;
  updatedAt: number;
};

export type HouseholdMemberPortable = {
  id: string;
  createdAt: number;
  displayName: StampedHouseholdValue<string>;
  relationshipLabel: StampedHouseholdValue<string>;
  deleted: StampedHouseholdValue<boolean>;
};

export type HouseholdPortableData = {
  version: 1;
  clearedAt: number;
  householdName: StampedHouseholdValue<string>;
  members: Record<string, HouseholdMemberPortable>;
};

export type HouseholdMemberDraft = {
  displayName: string;
  relationshipLabel: string;
};

export type HouseholdValidationErrors = Partial<
  Record<keyof HouseholdMemberDraft | "householdName", string>
>;

export const HOUSEHOLD_NAME_LIMIT = 40;
export const HOUSEHOLD_MEMBER_NAME_LIMIT = 40;
export const HOUSEHOLD_RELATIONSHIP_LIMIT = 30;
export const HOUSEHOLD_MEMBER_ID_LIMIT = 100;
export const HOUSEHOLD_ACTIVE_MEMBER_LIMIT = 12;
export const HOUSEHOLD_MEMBER_RECORD_LIMIT = 100;

export const HOUSEHOLD_RELATIONSHIP_SUGGESTIONS = [
  "爸爸",
  "妈妈",
  "家长",
  "奶奶",
  "爷爷",
  "外婆",
  "外公",
  "月嫂",
  "育儿嫂",
  "亲属",
  "其他照护者",
] as const;
