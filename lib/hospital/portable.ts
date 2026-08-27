// 医院档案已在 v3.4.13 下线。此文件只为旧数据格式保留:
// 导入 v6-v10 备份时 hospital 字段整体忽略;向旧客户端投影时下发空档案,
// 空档案必须保持旧客户端严格校验要求的完整 15 字段结构。
export type StampedTextField = {
  value: string;
  updatedAt: number;
};

export type HospitalProfilePortableData = {
  version: 1;
  fields: Record<string, StampedTextField>;
};

const HOSPITAL_FIELD_KEYS = [
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

export function createEmptyHospitalProfile(): HospitalProfilePortableData {
  return {
    version: 1,
    fields: Object.fromEntries(
      HOSPITAL_FIELD_KEYS.map((key) => [key, { value: "", updatedAt: 0 }]),
    ),
  };
}
