export type BabySex = "unspecified" | "boy" | "girl";

export const BABY_PROFILE_FIELD_KEYS = [
  "nickname",
  "birthDate",
  "birthTime",
  "sex",
] as const;

export type BabyProfileFieldKey = (typeof BABY_PROFILE_FIELD_KEYS)[number];

export type StampedBabyField<T> = {
  value: T;
  updatedAt: number;
};

export type BabyProfilePortableData = {
  version: 1;
  clearedAt: number;
  fields: {
    nickname: StampedBabyField<string>;
    birthDate: StampedBabyField<string>;
    birthTime: StampedBabyField<string>;
    sex: StampedBabyField<BabySex>;
  };
};

export type BabyProfileValues = {
  nickname: string;
  birthDate: string;
  birthTime: string;
  sex: BabySex;
};

export type BabyProfileDraft = BabyProfileValues;
export type BabyProfileValidationErrors = Partial<Record<BabyProfileFieldKey, string>>;

export type CareEventType =
  | "breastfeeding"
  | "bottle"
  | "pumping"
  | "diaper"
  | "sleep";

export type CareEventBase = {
  id: string;
  type: CareEventType;
  note: string;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

export type BreastSide = "left" | "right";

export type BreastfeedingSegment = {
  side: BreastSide;
  startAt: string;
  endAt: string | null;
};

export type BreastfeedingEvent = CareEventBase & {
  type: "breastfeeding";
  startAt: string;
  endAt: string | null;
  segments: BreastfeedingSegment[];
};

export type BottleMilkType = "breastmilk" | "formula";

export type BottleEvent = CareEventBase & {
  type: "bottle";
  occurredAt: string;
  milkType: BottleMilkType;
  amountMl: number;
};

export type PumpingSide = "left" | "right" | "both";

export type PumpingEvent = CareEventBase & {
  type: "pumping";
  startAt: string;
  endAt: string | null;
  side: PumpingSide;
  amountMl: number | null;
};

export type DiaperKind = "wet" | "dirty" | "both";

export type DiaperEvent = CareEventBase & {
  type: "diaper";
  occurredAt: string;
  kind: DiaperKind;
};

export type SleepEvent = CareEventBase & {
  type: "sleep";
  startAt: string;
  endAt: string | null;
};

export type CareEvent =
  | BreastfeedingEvent
  | BottleEvent
  | PumpingEvent
  | DiaperEvent
  | SleepEvent;

// 家庭成员功能下线后，V1/V2 记录结构一致，仅保留版本号区分旧数据。
export type CareEventV1 = CareEvent;

export type BabyCarePortableDataV1 = {
  version: 1;
  clearedAt: number;
  events: CareEventV1[];
};

export type BabyPortableDataV1 = {
  version: 1;
  profile: BabyProfilePortableData;
  care: BabyCarePortableDataV1;
};

export type BabyCarePortableData = {
  version: 2;
  clearedAt: number;
  events: CareEvent[];
};

export type BabyPortableData = {
  version: 2;
  profile: BabyProfilePortableData;
  care: BabyCarePortableData;
};

export type BottleRecordDraft = {
  occurredAt: string;
  milkType: BottleMilkType;
  amountMl: number;
  note: string;
};

export type DiaperRecordDraft = {
  occurredAt: string;
  kind: DiaperKind;
  note: string;
};

export type PumpingFinishDraft = { amountMl: number | null; note: string };

export type CareActionResult = {
  ok: boolean;
  changed: boolean;
  message?: string;
};

export type TodayCareSummary = {
  breastfeedingCount: number;
  breastfeedingDurationMs: number;
  breastmilkBottleCount: number;
  breastmilkBottleMl: number;
  formulaCount: number;
  formulaMl: number;
  pumpingCount: number;
  pumpingRecordedAmountCount: number;
  pumpingMl: number;
  wetDiaperCount: number;
  dirtyDiaperCount: number;
  completedSleepCount: number;
  sleepDurationMs: number;
  sleeping: boolean;
  totalRecordCount: number;
};

export const BABY_NICKNAME_LIMIT = 40;
export const BABY_EVENT_NOTE_LIMIT = 1_000;
export const BABY_EVENT_ID_LIMIT = 100;
export const BABY_EVENT_LIMIT = 25_000;
export const BREASTFEEDING_SEGMENT_LIMIT = 20;
export const BABY_MILK_AMOUNT_MAX_ML = 2_000;
