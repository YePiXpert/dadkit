import type { HospitalProfile } from "@/lib/types";

export const yuquanHospitalTemplate: HospitalProfile = {
  mode: "preset",
  hospitalId: "cn-bj-yuquan-hospital",
  name: "清华大学玉泉医院（清华大学中西医结合医院）",
  aliases: ["玉泉医院", "清华大学玉泉医院", "北京玉泉医院"],
  country: "CN",
  province: "北京市",
  city: "北京市",
  district: "石景山区",
  verificationStatus: "unverified",
  requiredDocuments: [
    "北京市母子健康手册或电子条形码",
    "身份证",
    "医保卡 / 社保卡",
    "产检资料",
    "医院要求的其他入院材料",
  ],
  hospitalProvidedItems: ["不确定"],
  recommendedItems: [
    "把最近一次产检时医生/护士说明的入院须知拍照保存",
    "产检时确认是否需要自带产褥垫",
    "产检时确认是否需要自带宝宝尿不湿",
    "产检时确认是否需要自带宝宝衣物",
    "产检时确认陪产/探视规则",
    "产检时确认住院押金、医保结算和支付方式要求",
    "产检时确认停车和入院动线",
  ],
  notAllowedItems: ["待确认"],
  admissionNotes:
    "玉泉医院模板为未核验模板，不假设医院一定提供或不提供某项物品。请以最近一次产检、入院须知或医院通知为准。",
  partnerPolicyNotes: "待确认。请在产检或入院前向医院确认最新陪产/探视规则。",
  paymentNotes: "待确认。请确认住院押金、医保结算和支付方式要求。",
  parkingNotes: "待确认。请提前确认入院入口和停车安排。",
  sourceNotes: ["该模板用于帮助用户记录医院相关准备事项，不作为官方入院要求。"],
};

export const beijingGeneralHospitalTemplate: HospitalProfile = {
  mode: "preset",
  hospitalId: "cn-bj-general-hospital",
  name: "北京通用模板",
  country: "CN",
  province: "北京市",
  city: "北京市",
  verificationStatus: "unverified",
  requiredDocuments: ["医院要求的其他入院材料"],
  hospitalProvidedItems: ["不确定"],
  recommendedItems: [
    "建议在最近一次产检时确认医院提供物品",
    "建议确认陪产/探视规则是否有变化",
    "建议确认住院押金、入院入口和停车安排",
  ],
  notAllowedItems: ["待确认"],
  admissionNotes:
    "北京通用医院模板只用于整理待确认事项，不代表任何具体医院要求。",
};

export const hospitalTemplates = [
  beijingGeneralHospitalTemplate,
  yuquanHospitalTemplate,
];
