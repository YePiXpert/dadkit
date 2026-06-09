import type { RegionTemplate } from "@/lib/types";

export const beijingRegionTemplate: RegionTemplate = {
  id: "cn-bj-general",
  name: "北京通用模板",
  requiredDocuments: [
    "身份证",
    "医保卡 / 社保卡",
    "北京市母子健康手册或电子条形码",
    "产检资料",
    "支付方式",
  ],
  recommendedItems: [],
  notes: [
    "北京地区用户请确认北京市母子健康手册或电子版手册/条形码是否可用",
    "具体入院材料以生产医院通知为准",
    "不同医院提供物品、陪产规则和入院动线可能不同",
  ],
};

export const otherRegionTemplate: RegionTemplate = {
  id: "other",
  name: "其他地区",
  requiredDocuments: ["身份证件", "医保卡 / 社保卡", "本地区孕产资料", "产检资料", "支付方式"],
  recommendedItems: [],
  notes: ["请以本地区医院入院须知、最近一次产检或医院通知为准。"],
};

export const regionTemplates = [beijingRegionTemplate, otherRegionTemplate];
