import {
  BABY_SEX_LABELS,
  type BabySex,
  type UserProfile,
} from "@/lib/types";

type ChineseNewYearBoundary = {
  date: string;
  year: number;
};

export type BabyMascot = {
  alt: string;
  src: string;
};

export type BabyZodiacInfo = {
  animal: string;
  branch: string;
  element: string;
  lunarYear: number;
  stem: string;
};

const CHINESE_NEW_YEAR_BOUNDARIES: ChineseNewYearBoundary[] = [
  { date: "2020-01-25", year: 2020 },
  { date: "2021-02-12", year: 2021 },
  { date: "2022-02-01", year: 2022 },
  { date: "2023-01-22", year: 2023 },
  { date: "2024-02-10", year: 2024 },
  { date: "2025-01-29", year: 2025 },
  { date: "2026-02-17", year: 2026 },
  { date: "2027-02-06", year: 2027 },
  { date: "2028-01-26", year: 2028 },
  { date: "2029-02-13", year: 2029 },
  { date: "2030-02-03", year: 2030 },
  { date: "2031-01-23", year: 2031 },
  { date: "2032-02-11", year: 2032 },
  { date: "2033-01-31", year: 2033 },
  { date: "2034-02-19", year: 2034 },
  { date: "2035-02-08", year: 2035 },
  { date: "2036-01-28", year: 2036 },
  { date: "2037-02-15", year: 2037 },
  { date: "2038-02-04", year: 2038 },
  { date: "2039-01-24", year: 2039 },
  { date: "2040-02-12", year: 2040 },
];

const HEAVENLY_STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const EARTHLY_BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const BRANCH_ANIMALS = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"];
const STEM_ELEMENTS = ["木", "木", "火", "火", "土", "土", "金", "金", "水", "水"];

export function getBabySex(profile?: Pick<UserProfile, "babySex">): BabySex {
  if (profile?.babySex === "girl" || profile?.babySex === "boy") {
    return profile.babySex;
  }

  return "unknown";
}

export function getBabySexLabel(profile?: Pick<UserProfile, "babySex">) {
  return BABY_SEX_LABELS[getBabySex(profile)];
}

export function getChineseZodiacInfo(dueDate?: string): BabyZodiacInfo | undefined {
  const date = parseLocalDate(dueDate);

  if (!date) {
    return undefined;
  }

  const boundary =
    [...CHINESE_NEW_YEAR_BOUNDARIES]
      .reverse()
      .find((candidate) => parseLocalDate(candidate.date)! <= date) ??
    CHINESE_NEW_YEAR_BOUNDARIES[0];

  if (!boundary) {
    return undefined;
  }

  const stemIndex = positiveModulo(boundary.year - 4, 10);
  const branchIndex = positiveModulo(boundary.year - 4, 12);

  return {
    animal: BRANCH_ANIMALS[branchIndex] ?? "",
    branch: EARTHLY_BRANCHES[branchIndex] ?? "",
    element: STEM_ELEMENTS[stemIndex] ?? "",
    lunarYear: boundary.year,
    stem: HEAVENLY_STEMS[stemIndex] ?? "",
  };
}

export function formatBabyZodiacLine(
  profile?: Pick<UserProfile, "babySex" | "dueDate">,
) {
  const zodiac = getChineseZodiacInfo(profile?.dueDate);
  const sexLabel = getBabySexLabel(profile);

  if (!zodiac) {
    return sexLabel;
  }

  return `${zodiac.stem}${zodiac.branch}年 · ${zodiac.element}${zodiac.animal}${sexLabel}`;
}

export function getBabyMascot(
  profile?: Pick<UserProfile, "babySex" | "dueDate">,
): BabyMascot {
  const zodiac = getChineseZodiacInfo(profile?.dueDate);
  const sex = getBabySex(profile);

  if (zodiac?.animal === "马" && sex === "girl") {
    return {
      alt: "小马女宝待产插图",
      src: "/illustrations/dadkit-horse-girl.png",
    };
  }

  if (sex === "girl") {
    return {
      alt: "女宝待产插图",
      src: "/illustrations/dadkit-baby-girl-timer.png",
    };
  }

  return {
    alt: "待产准备插图",
    src: "/illustrations/dadkit-bear-transparent.png",
  };
}

function positiveModulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

function parseLocalDate(dateString?: string) {
  if (!dateString) {
    return undefined;
  }

  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  date.setHours(0, 0, 0, 0);

  return date;
}
