export const MIN_GROWTH_WEEK = 8;
export const MAX_GROWTH_WEEK = 40;
export const DEFAULT_GROWTH_WEEK = 36;

export type GrowthTrimester = "孕早期" | "孕中期" | "孕晚期";

export type GrowthIllustrationKind =
  | "berry"
  | "round"
  | "pear"
  | "citrus"
  | "pepper"
  | "banana"
  | "root"
  | "corn"
  | "squash"
  | "stalk"
  | "crown"
  | "leaf";

export type GrowthWeek = {
  week: number;
  trimester: GrowthTrimester;
  stage: string;
  analogy: string;
  illustration: GrowthIllustrationKind;
  lengthCm: number;
  lengthBasis: "头臀长" | "头踵长";
  referenceWeightG?: number;
  summary: string;
  checkupTaskId: string;
  checkupReminder: string;
};

type GrowthWeekSeed = Omit<
  GrowthWeek,
  | "trimester"
  | "stage"
  | "lengthBasis"
  | "referenceWeightG"
  | "checkupTaskId"
  | "checkupReminder"
>;

const WEEK_SEEDS = [
  {
    week: 8,
    analogy: "一颗覆盆子",
    illustration: "berry",
    lengthCm: 1.6,
    summary:
      "头部与四肢轮廓正在变得更清楚，胎盘也在继续建立支持生长的结构。此时个体差异很常见。",
  },
  {
    week: 9,
    analogy: "一颗樱桃",
    illustration: "berry",
    lengthCm: 2.2,
    summary:
      "身体主要结构仍在快速形成，面部和手脚的轮廓继续细化。许多变化很细小，通常需要超声才能观察。",
  },
  {
    week: 10,
    analogy: "一颗草莓",
    illustration: "berry",
    lengthCm: 3,
    summary:
      "四肢关节和面部结构继续发育，身体开始有更多细微动作。现在仍处在器官形成的重要阶段。",
  },
  {
    week: 11,
    analogy: "一颗无花果",
    illustration: "pear",
    lengthCm: 4.1,
    summary:
      "手指和脚趾逐渐分开，躯干继续拉长。器官已经有了基本结构，但还会长期生长和成熟。",
  },
  {
    week: 12,
    analogy: "一颗李子",
    illustration: "round",
    lengthCm: 5.4,
    summary:
      "肌肉与内部器官继续发育，骨骼组织开始逐步变硬。头部仍相对较大，身体比例会继续改变。",
  },
  {
    week: 13,
    analogy: "一颗小桃子",
    illustration: "round",
    lengthCm: 7.4,
    summary:
      "身体增长速度加快，面部与四肢比例继续调整。早期形成的器官正进入持续生长阶段。",
  },
  {
    week: 14,
    analogy: "一颗柠檬",
    illustration: "citrus",
    lengthCm: 8.5,
    summary:
      "面部肌肉和吞咽动作可能开始练习，四肢活动也更协调。动作是否能被感受到仍因人而异。",
  },
  {
    week: 15,
    analogy: "一颗苹果",
    illustration: "round",
    lengthCm: 10.1,
    summary:
      "骨骼与肌肉继续生长，关节活动范围逐渐增加。外部声音的传导结构也在继续发育。",
  },
  {
    week: 16,
    analogy: "一颗牛油果",
    illustration: "pear",
    lengthCm: 11.6,
    summary:
      "神经与肌肉的配合继续进步，手脚会有更丰富的活动。是否已经感觉到胎动并没有统一时间。",
  },
  {
    week: 17,
    analogy: "一颗梨",
    illustration: "pear",
    lengthCm: 12,
    summary:
      "皮下脂肪开始逐渐积累，身体仍在快速伸展。胎盘继续承担氧气和营养交换。",
  },
  {
    week: 18,
    analogy: "一颗甜椒",
    illustration: "pepper",
    lengthCm: 14.2,
    summary:
      "耳部结构接近最终位置，听觉通路继续发育。活动可能更有规律，但孕妇感受会有很大差异。",
  },
  {
    week: 19,
    analogy: "一颗芒果",
    illustration: "pear",
    lengthCm: 15.3,
    summary:
      "感觉相关的神经连接继续建立，皮肤表面逐渐出现保护层。身体比例正在更接近新生儿。",
  },
  {
    week: 20,
    analogy: "一根香蕉",
    illustration: "banana",
    lengthCm: 25.6,
    summary:
      "从本周起常用头到脚的身长口径。宝宝会继续练习吞咽、吸吮与转身等动作，胎动感受因人而异。",
  },
  {
    week: 21,
    analogy: "一根胡萝卜",
    illustration: "root",
    lengthCm: 26.7,
    summary:
      "吞咽与活动模式继续发展，四肢动作可能更有力量。每天的活动节律尚未完全固定。",
  },
  {
    week: 22,
    analogy: "一只红薯",
    illustration: "root",
    lengthCm: 27.8,
    summary:
      "肺部继续发育并练习类似呼吸的动作，味觉结构也在形成。此后的体重仅显示群体参考值。",
  },
  {
    week: 23,
    analogy: "一颗西柚",
    illustration: "citrus",
    lengthCm: 28.9,
    summary:
      "听觉和运动反应继续发展，皮肤与肺部仍较不成熟。每个宝宝的生长轨迹不应只用单周数字判断。",
  },
  {
    week: 24,
    analogy: "一穗玉米",
    illustration: "corn",
    lengthCm: 30,
    summary:
      "肺部与脑部持续成熟，身体开始更稳定地积累组织。规律产检比和类比物大小更能反映个体情况。",
  },
  {
    week: 25,
    analogy: "一根西葫芦",
    illustration: "squash",
    lengthCm: 34.6,
    summary:
      "神经系统和惊跳等反应继续发展，活动可能更容易被感受到。胎动模式仍会随睡眠周期变化。",
  },
  {
    week: 26,
    analogy: "一根小葱",
    illustration: "stalk",
    lengthCm: 35.6,
    summary:
      "眼睑可能逐渐打开，肺部仍在为出生后的呼吸做准备。现在的成熟程度存在明显个体差异。",
  },
  {
    week: 27,
    analogy: "一颗花椰菜",
    illustration: "crown",
    lengthCm: 36.6,
    summary:
      "脑部、肺部和脂肪组织继续发展，睡眠与活动周期可能更清楚。胎动的强弱不能单独代表健康状况。",
  },
  {
    week: 28,
    analogy: "一根茄子",
    illustration: "pear",
    lengthCm: 37.6,
    summary:
      "进入孕晚期后，脑部连接和体重增长通常会加快。宝宝仍有较多空间改变姿势。",
  },
  {
    week: 29,
    analogy: "一只奶油南瓜",
    illustration: "squash",
    lengthCm: 38.6,
    summary:
      "骨骼已经形成但仍相对柔软，脂肪和肌肉继续增加。活动方式会随空间变化而改变。",
  },
  {
    week: 30,
    analogy: "一颗圆白菜",
    illustration: "round",
    lengthCm: 39.9,
    summary:
      "眼睛与神经调节继续成熟，身体储存更多脂肪。宝宝可能在一天中的某些时段更活跃。",
  },
  {
    week: 31,
    analogy: "一颗椰子",
    illustration: "round",
    lengthCm: 41.1,
    summary:
      "脑部仍在快速发育，皮下脂肪让身体轮廓更饱满。肺部尚会继续成熟数周。",
  },
  {
    week: 32,
    analogy: "一颗哈密瓜",
    illustration: "round",
    lengthCm: 42.4,
    summary:
      "吸吮、吞咽和类似呼吸的动作继续练习，体重稳步增加。姿势可能趋于稳定但仍可能变化。",
  },
  {
    week: 33,
    analogy: "一颗菠萝",
    illustration: "crown",
    lengthCm: 43.7,
    summary:
      "免疫保护物质会经胎盘继续传递，骨骼逐步变硬但头骨仍保留柔韧性。肺和脑仍在成熟。",
  },
  {
    week: 34,
    analogy: "一把芹菜",
    illustration: "stalk",
    lengthCm: 45,
    summary:
      "肺部和神经系统继续成熟，脂肪积累有助于出生后调节体温。此时姿势需要由产检测量确认。",
  },
  {
    week: 35,
    analogy: "一颗蜜瓜",
    illustration: "round",
    lengthCm: 46.2,
    summary:
      "多数器官结构已较完整，但脑、肺与体重仍在持续发展。空间变小后动作感觉可能改变，次数不应明显减少。",
  },
  {
    week: 36,
    analogy: "一棵罗马生菜",
    illustration: "leaf",
    lengthCm: 47.4,
    summary:
      "肺部、吸吮和消化能力继续成熟，宝宝也在为出生调整姿势。成熟速度与体重都存在正常个体差异。",
  },
  {
    week: 37,
    analogy: "一把甜菜叶",
    illustration: "leaf",
    lengthCm: 48.6,
    summary:
      "宝宝继续练习呼吸、吸吮与抓握，脂肪仍在增加。是否入盆和何时发动都因人而异。",
  },
  {
    week: 38,
    analogy: "一根大葱",
    illustration: "stalk",
    lengthCm: 49.8,
    summary:
      "覆盖身体的细毛可能继续减少，器官功能仍在最后成熟。空间有限不等于胎动应当减少。",
  },
  {
    week: 39,
    analogy: "一颗小西瓜",
    illustration: "round",
    lengthCm: 50.7,
    summary:
      "从 39 周起通常进入足月范围，脑和肺仍会继续发育。体重和发动时间都不能由类比物预测。",
  },
  {
    week: 40,
    analogy: "一只南瓜",
    illustration: "squash",
    lengthCm: 51.2,
    summary:
      "宝宝通常蜷曲在子宫内，熟悉的活动模式仍应持续。预产期只是估算日期，实际分娩时间可能提前或推后。",
  },
] as const satisfies readonly GrowthWeekSeed[];

const REFERENCE_WEIGHT_G: Readonly<Record<number, number>> = {
  22: 525,
  23: 592,
  24: 668,
  25: 756,
  26: 856,
  27: 969,
  28: 1097,
  29: 1239,
  30: 1396,
  31: 1568,
  32: 1755,
  33: 1954,
  34: 2162,
  35: 2378,
  36: 2594,
  37: 2806,
  38: 3006,
  39: 3186,
  40: 3338,
};

const CHECKUP_REMINDERS: Readonly<Record<number, string>> = {
  8: "如尚未开始产检，可预约首次产前接触并准备既往病史、用药和末次月经信息。",
  9: "首次产检常包含血压、体重、血型、血常规、尿检及感染筛查，具体项目以当地安排为准。",
  10: "8–14 周常会安排孕周确认或早孕超声；预产期请以产科确认结果为准。",
  11: "可向医生了解当地提供的染色体异常筛查或诊断选择、时间窗和局限。",
  12: "确认首次建档检查与早孕筛查是否完成，并请医生解释任何需要复查的结果。",
  13: "复核早孕检查结果与后续预约；不要自行停用处方药或改变补充剂剂量。",
  14: "如本周无特定检查，仍按个人方案随访血压、体重和尿检等常规项目。",
  15: "可确认 18–22 周左右的胎儿结构超声是否已预约；不同地区时间窗会不同。",
  16: "常规随访时可记录血压、尿检与症状变化，并带上之前的检查报告。",
  17: "提前整理结构超声想询问的问题；胎动出现时间因胎盘位置和孕次等因素而不同。",
  18: "18–22 周常见胎儿结构超声时间窗；它是筛查，并不能排除所有情况。",
  19: "如已完成结构超声，请按医生建议复查未显示清楚的切面或需要随访的发现。",
  20: "WHO 建议约 20 周安排一次产前接触，并在 24 周前完成当地提供的结构筛查。",
  21: "确认结构超声与常规随访结果；有疑问时请让产科人员结合完整报告解释。",
  22: "常规随访可关注血压、尿检及症状；超声估重应看连续趋势，不能只看一次数字。",
  23: "确认下一次产检与 24–28 周糖代谢筛查安排，是否需要检查由医生结合风险决定。",
  24: "24–28 周常见妊娠期糖尿病筛查；24 周后产检也常开始监测宫高与胎儿生长。",
  25: "如已安排糖代谢筛查，按机构要求准备；不要自行用家用血糖结果替代正式评估。",
  26: "WHO 建议约 26 周产前接触；可复核血压、尿检、宫高和糖筛查进度。",
  27: "如为 Rh 阴性血型，可向医生确认是否需在约 28 周接受抗 D 免疫球蛋白。",
  28: "常规产检可复核生长、血压和胎动；孕期疫苗与抗 D 安排请遵循当地方案。",
  29: "开始熟悉宝宝平时的胎动模式；若明显变化，不要等待下次预约再咨询。",
  30: "WHO 建议约 30 周产前接触，常见项目包括血压、尿检、宫高和胎动询问。",
  31: "按个人方案复诊并讨论早产征象、就医联系方式及何时需要立即联系产科。",
  32: "产检常继续监测血压、宫高和胎动；是否需要生长超声取决于临床情况。",
  33: "可在随访中讨论分娩地点、交通、陪伴和紧急联络方式，形成可调整的准备方案。",
  34: "WHO 建议约 34 周产前接触；可询问胎位、分娩准备和母乳喂养支持。",
  35: "部分地区会在约 35–37 周安排 B 族链球菌筛查，请以本地指南和产科安排为准。",
  36: "WHO 建议约 36 周产前接触；常见内容包括胎位、血压、尿检及分娩计划复核。",
  37: "确认 B 族链球菌结果（如当地开展）、待产联系方式和需要立即就医的信号。",
  38: "WHO 建议约 38 周产前接触；继续关注血压、胎动与分娩征象。",
  39: "复核入院路线、证件和分娩计划；熟悉的胎动模式发生明显变化应及时联系产科。",
  40: "WHO 建议约 40 周产前接触，并与医生讨论超过预产期后的监测和分娩安排。",
};

const CHECKUP_TASK_IDS: Readonly<Record<number, string>> = {
  8: "first-prenatal-contact",
  9: "initial-routine-labs",
  10: "dating-ultrasound",
  11: "screening-options",
  12: "review-early-results",
  13: "plan-followups",
  14: "routine-monitoring-transition",
  15: "schedule-anatomy-scan",
  16: "routine-followup-mid-pregnancy",
  17: "prepare-anatomy-scan-questions",
  18: "anatomy-scan-window-open",
  19: "review-anatomy-scan",
  20: "who-contact-20-weeks",
  21: "complete-anatomy-scan-followup",
  22: "review-growth-monitoring",
  23: "schedule-glucose-screening",
  24: "glucose-screening-window-open",
  25: "complete-glucose-screening",
  26: "who-contact-26-weeks",
  27: "review-rh-negative-plan",
  28: "review-28-week-care",
  29: "learn-fetal-movement-pattern",
  30: "who-contact-30-weeks",
  31: "review-preterm-contact-plan",
  32: "review-third-trimester-growth",
  33: "birth-readiness-plan",
  34: "who-contact-34-weeks",
  35: "gbs-screening-window-open",
  36: "who-contact-36-weeks",
  37: "review-gbs-and-labor-contact",
  38: "who-contact-38-weeks",
  39: "finalize-admission-plan",
  40: "who-contact-40-weeks",
};

export const GROWTH_WEEKS: readonly GrowthWeek[] = WEEK_SEEDS.map((seed) => ({
  ...seed,
  trimester: getTrimester(seed.week),
  stage: getStage(seed.week),
  lengthBasis: seed.week < 20 ? "头臀长" : "头踵长",
  referenceWeightG: REFERENCE_WEIGHT_G[seed.week],
  checkupTaskId: CHECKUP_TASK_IDS[seed.week],
  checkupReminder: CHECKUP_REMINDERS[seed.week],
}));

export const GROWTH_CHECKUP_TASK_IDS = GROWTH_WEEKS.map(
  (entry) => entry.checkupTaskId,
);

export const GROWTH_MEDICAL_DISCLAIMER =
  "医学提示：本页仅用于记录与一般科普，不能替代产检、超声、诊断或个体化医疗建议。孕周、检查安排及胎儿生长以产科医生、助产士和当地医疗机构意见为准；如有出血、持续疼痛、胎动明显变化或其他担忧，请及时联系专业医疗机构。";

export const GROWTH_SOURCES = [
  {
    organization: "NHS",
    title: "Week-by-week guide to pregnancy",
    href: "https://www.nhs.uk/best-start-in-life/pregnancy/week-by-week-guide-to-pregnancy/",
    use: "逐周身长口径与发育主题",
  },
  {
    organization: "NHS",
    title: "Your antenatal care and appointments",
    href: "https://www.nhs.uk/pregnancy/your-pregnancy-care/your-antenatal-care-and-appointments/",
    use: "常见产检、扫描与筛查节点",
  },
  {
    organization: "ACOG",
    title: "Prenatal Care",
    href: "https://www.acog.org/womens-health/faqs/prenatal-care",
    use: "产前随访与个体化安排",
  },
  {
    organization: "ACOG",
    title: "Routine Tests During Pregnancy",
    href: "https://www.acog.org/womens-health/faqs/routine-tests-during-pregnancy",
    use: "常见孕期筛查时间窗",
  },
  {
    organization: "WHO",
    title: "Recommendations on antenatal care for a positive pregnancy experience",
    href: "https://www.who.int/publications/i/item/9789241549912/",
    use: "8 次产前接触模型与常规照护",
  },
  {
    organization: "INTERGROWTH-21st",
    title: "International Fetal Growth Standards: Estimated Fetal Weight",
    href: "https://intergrowth21.com/sites/default/files/2023-01/grow_efw_zs_table.pdf",
    use: "22–40 周超声估重中位参考",
  },
] as const;

export function getGrowthWeek(week: number) {
  const normalizedWeek = clampGrowthWeek(week);
  const entry = GROWTH_WEEKS[normalizedWeek - MIN_GROWTH_WEEK];

  if (!entry) {
    throw new Error(`缺少孕 ${normalizedWeek} 周成长数据。`);
  }

  return entry;
}

export function clampGrowthWeek(week: number) {
  if (!Number.isFinite(week)) {
    return DEFAULT_GROWTH_WEEK;
  }

  return Math.min(
    MAX_GROWTH_WEEK,
    Math.max(MIN_GROWTH_WEEK, Math.round(week)),
  );
}

export function describeGrowthSincePreviousWeek(week: number) {
  const current = getGrowthWeek(week);

  if (current.week === MIN_GROWTH_WEEK) {
    return "这是成长记的起点周，暂不与更早孕周比较。";
  }

  const previous = getGrowthWeek(current.week - 1);
  const lengthDelta = roundToOneDecimal(current.lengthCm - previous.lengthCm);
  const lengthText = `身长口径较上周约 ${formatSigned(lengthDelta)} cm`;

  if (
    current.referenceWeightG !== undefined &&
    previous.referenceWeightG !== undefined
  ) {
    return `${lengthText}，参考估重约 +${
      current.referenceWeightG - previous.referenceWeightG
    } g。`;
  }

  if (current.referenceWeightG !== undefined) {
    return `${lengthText}；统一参考估重从 22 周开始显示。`;
  }

  return `${lengthText}。`;
}

export function getProjectedGrowthWeekDate(dueDate: string, week: number) {
  if (!isIsoCalendarDate(dueDate)) {
    return undefined;
  }

  const date = new Date(`${dueDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - (MAX_GROWTH_WEEK - clampGrowthWeek(week)) * 7);

  return date.toISOString().slice(0, 10);
}

export function getCurrentGrowthWeekFromDueDate(
  dueDate: string,
  today = new Date(),
) {
  if (!isIsoCalendarDate(dueDate) || Number.isNaN(today.getTime())) {
    return DEFAULT_GROWTH_WEEK;
  }

  const dueUtc = Date.parse(`${dueDate}T00:00:00Z`);
  const todayUtc = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const daysUntilDue = Math.round((dueUtc - todayUtc) / 86_400_000);

  return clampGrowthWeek(Math.floor((280 - daysUntilDue) / 7));
}

export function isIsoCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00Z`);

  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function getTrimester(week: number): GrowthTrimester {
  if (week <= 12) {
    return "孕早期";
  }

  if (week <= 27) {
    return "孕中期";
  }

  return "孕晚期";
}

function getStage(week: number) {
  if (week <= 10) {
    return "器官形成";
  }

  if (week <= 13) {
    return "早中期过渡";
  }

  if (week <= 19) {
    return "伸展与活动";
  }

  if (week <= 27) {
    return "感官与成熟";
  }

  if (week <= 35) {
    return "增重与成熟";
  }

  return "出生准备";
}

function roundToOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

function formatSigned(value: number) {
  if (value > 0) {
    return `+${value}`;
  }

  return `${value}`;
}
