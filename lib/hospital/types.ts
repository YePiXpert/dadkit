export const HOSPITAL_FIELD_KEYS = [
  "hospitalName",
  "campusName",
  "maternityPhone",
  "emergencyPhone",
  "address",
  "laborEntranceNote",
  "inpatientEntranceNote",
  "parkingNote",
  "admissionProcessNote",
  "companionRuleNote",
  "providedItemsNote",
  "restrictedItemsNote",
  "requiredDocumentsNote",
  "generalNote",
] as const;

export type HospitalFieldKey = (typeof HOSPITAL_FIELD_KEYS)[number];

export type StampedTextField = {
  value: string;
  updatedAt: number;
};

export type HospitalProfilePortableData = {
  version: 1;
  fields: Record<HospitalFieldKey, StampedTextField>;
};

export type HospitalProfileValues = Record<HospitalFieldKey, string>;

export const HOSPITAL_FIELD_LABELS: Record<HospitalFieldKey, string> = {
  hospitalName: "医院名称",
  campusName: "院区",
  maternityPhone: "产科/住院电话",
  emergencyPhone: "急诊电话",
  address: "医院地址",
  laborEntranceNote: "待产或产科入口",
  inpatientEntranceNote: "住院办理位置",
  parkingNote: "停车位置",
  admissionProcessNote: "入院流程",
  companionRuleNote: "陪护和探视要求",
  providedItemsNote: "医院提供的用品",
  restrictedItemsNote: "医院不允许携带的用品",
  requiredDocumentsNote: "需要携带的证件",
  generalNote: "其他备注",
};

export const HOSPITAL_FIELD_LIMITS: Record<HospitalFieldKey, number> = {
  hospitalName: 80,
  campusName: 80,
  maternityPhone: 40,
  emergencyPhone: 40,
  address: 200,
  laborEntranceNote: 500,
  inpatientEntranceNote: 500,
  parkingNote: 500,
  admissionProcessNote: 500,
  companionRuleNote: 500,
  providedItemsNote: 500,
  restrictedItemsNote: 500,
  requiredDocumentsNote: 500,
  generalNote: 500,
};

export const HOSPITAL_PHONE_FIELDS = [
  "maternityPhone",
  "emergencyPhone",
] as const satisfies readonly HospitalFieldKey[];

export type HospitalValidationErrors = Partial<
  Record<HospitalFieldKey, string>
>;
