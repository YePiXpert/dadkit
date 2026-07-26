#!/usr/bin/env node
// 物品参考实拍采集管线（一次性工具，产物提交，脚本保留以便增补）。
//
// 用法：
//   node scripts/fetch-item-refs.mjs candidates   # 拉候选图 + 生成 contact sheet
//   node scripts/fetch-item-refs.mjs finalize     # 按 scripts/item-ref-picks.json 出正式图
//
// 图片来源：Openverse（CC 授权聚合）。仅使用 cc0 / by / by-sa（可商用、可裁切），
// by-nc / by-nd 一律排除。署名信息写入 public/item-refs/CREDITS.md。

import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const ITEMS = [
  { id: "general-postpartum-pads", label: "产褥垫", query: "disposable underpad", provider: "commons" },
  { id: "general-postpartum-paper", label: "刀纸", query: "hospital paper sheet roll" },
  { id: "general-labor-ctg-belt", label: "胎心监护带", query: "CTG belt pregnancy", provider: "commons" },
  { id: "general-postpartum-pull-up-pants", label: "产妇拉拉裤", query: "adult diaper" },
  { id: "general-postpartum-underwear", label: "一次性内裤", query: "disposable underwear hospital", provider: "commons" },
  { id: "general-postpartum-breast-pads", label: "防溢乳垫", query: "disposable nursing pads" },
  { id: "general-postpartum-breast-pump", label: "吸奶器", query: "breast pump", provider: "commons" },
  { id: "general-postpartum-milk-bags", label: "储奶袋", query: "milk storage bags" },
  { id: "general-postpartum-nipple-cream", label: "乳头膏", query: "lanolin cream" },
  { id: "general-baby-changing-pads", label: "隔尿垫", query: "baby changing pad" },
  { id: "general-baby-navel-care", label: "护脐用品", query: "newborn umbilical cord care" },
  { id: "general-baby-nail-clipper", label: "婴儿指甲剪", query: "baby nail clipper", provider: "commons" },
  { id: "general-confinement-baby-bodysuit", label: "和尚服", query: "baby kimono wrap bodysuit", provider: "commons" },
  { id: "general-going-home-blanket", label: "包被", query: "baby swaddle blanket" },
  { id: "general-confinement-baby-pacifier", label: "安抚奶嘴", query: "baby pacifier" },
  { id: "general-confinement-baby-bottle-warmer", label: "温奶器", query: "bottle warmer" },
  { id: "general-going-home-car-seat", label: "安全座椅", query: "infant car seat" },
  { id: "general-postpartum-metered-pads", label: "计量卫生巾", query: "sanitary napkins" },
  { id: "general-postpartum-peri-bottle", label: "会阴冲洗瓶", query: "peri bottle", provider: "commons" },
  { id: "general-confinement-mom-nursing-pillow", label: "哺乳枕", query: "nursing pillow" },
];

const BAD_HINTS = [
  "clipart",
  "vector",
  "illustration",
  "sticker",
  "drawing",
  "cartoon",
  "rawpixel",
  "cake",
  "cupcake",
  "logo",
  "icon ",
  "painting",
];

const REVIEW_DIR = "refs-review";
const OUT_DIR = "public/item-refs";
const PICKS_FILE = "scripts/item-ref-picks.json";
const MANIFEST_FILE = `${REVIEW_DIR}/manifest.json`;
const CANDIDATES_PER_ITEM = 8;

async function searchOpenverse(query) {
  const url =
    "https://api.openverse.org/v1/images/?" +
    new URLSearchParams({
      q: query,
      per_page: "20",
      license: "cc0,by,by-sa",
      license_type: "commercial",
    });

  const response = await fetch(url, {
    headers: { "User-Agent": "dadkit-ref-photo-fetch/1.0" },
  });

  if (!response.ok) {
    throw new Error(`Openverse ${response.status} for "${query}"`);
  }

  const data = await response.json();
  return (data.results ?? []).filter((result) => {
    const text = `${result.title ?? ""} ${result.url ?? ""}`.toLowerCase();
    return (
      result.url &&
      !BAD_HINTS.some((hint) => text.includes(hint)) &&
      /\.(jpe?g|png|webp)(\?|$)/i.test(result.url)
    );
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function download(url, retries = 2) {
  const response = await fetch(url, {
    headers: { "User-Agent": "dadkit-ref-photo-fetch/1.0 (contact: local-dev)" },
  });

  if (response.status === 429 && retries > 0) {
    await sleep(2500);
    return download(url, retries - 1);
  }

  if (!response.ok) {
    throw new Error(`download ${response.status} ${url}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function searchCommons(query) {
  const url =
    "https://commons.wikimedia.org/w/api.php?" +
    new URLSearchParams({
      action: "query",
      generator: "search",
      gsrsearch: `filetype:bitmap ${query}`,
      gsrnamespace: "6",
      gsrlimit: "12",
      prop: "imageinfo",
      iiprop: "url|extmetadata",
      format: "json",
      origin: "*",
    });

  const response = await fetch(url, {
    headers: { "User-Agent": "dadkit-ref-photo-fetch/1.0" },
  });

  if (!response.ok) {
    throw new Error(`Commons ${response.status} for "${query}"`);
  }

  const data = await response.json();
  const pages = Object.values(data.query?.pages ?? {});

  return pages
    .map((page) => {
      const info = page.imageinfo?.[0];
      const meta = info?.extmetadata ?? {};
      const license = (meta.LicenseShortName?.value ?? "").toLowerCase();
      const usable =
        license.includes("cc0") ||
        license.includes("public domain") ||
        license.includes("cc by") ||
        license.includes("cc-by") ||
        license.includes("attribution");

      if (!info?.url || !usable || license.includes("nc") || license.includes("nd")) {
        return undefined;
      }

      const strip = (value) => String(value ?? "").replace(/<[^>]+>/g, "");

      return {
        title: strip(page.title).replace(/^File:/, ""),
        creator: strip(meta.Artist?.value) || "Wikimedia Commons",
        license: meta.LicenseShortName?.value ?? "CC",
        foreign_landing_url: info.descriptionurl ?? info.url,
        url: info.url,
      };
    })
    .filter(Boolean);
}

async function runCandidates(only) {
  await mkdir(REVIEW_DIR, { recursive: true });
  let manifest = [];

  if (only && existsSync(MANIFEST_FILE)) {
    manifest = JSON.parse(await readFile(MANIFEST_FILE, "utf8"));
  }

  for (const item of ITEMS) {
    if (only && !only.includes(item.id)) {
      continue;
    }

    manifest = manifest.filter((entry) => entry.id !== item.id);
    let results = [];

    try {
      results =
        item.provider === "commons"
          ? await searchCommons(item.query)
          : await searchOpenverse(item.query);
    } catch (error) {
      console.error(`搜索失败 ${item.label}: ${error.message}`);
    }

    const chosen = results.slice(0, CANDIDATES_PER_ITEM);
    const entry = { ...item, candidates: [] };

    for (let index = 0; index < chosen.length; index += 1) {
      const candidate = chosen[index];

      try {
        const buffer = await download(candidate.url);
        const file = `${REVIEW_DIR}/${item.id}__${index}.jpg`;
        await sharp(buffer)
          .rotate()
          .resize({ width: 320, withoutEnlargement: true })
          .jpeg({ quality: 72 })
          .toFile(file);
        entry.candidates.push({
          index,
          file,
          title: candidate.title ?? "",
          creator: candidate.creator ?? "",
          license: candidate.license ?? "",
          source: candidate.foreign_landing_url ?? candidate.url,
          url: candidate.url,
        });
        console.log(`ok ${item.label} [${index}] ${candidate.title?.slice(0, 50)}`);
        await sleep(1200);
      } catch (error) {
        console.error(`候选失败 ${item.label} [${index}]: ${error.message}`);
      }
    }

    manifest.push(entry);
  }

  await writeFile(MANIFEST_FILE, JSON.stringify(manifest, null, 2));
  await buildContactSheet(manifest);
  console.log(`\n候选完成 → ${REVIEW_DIR}/contact-sheet.png`);
}

async function buildContactSheet(manifest) {
  const cols = CANDIDATES_PER_ITEM;
  const cw = 170;
  const ch = 190;
  const rows = manifest.length;
  const cells = [];

  for (let row = 0; row < rows; row += 1) {
    const entry = manifest[row];
    cells.push(
      `<text x="4" y="${row * ch + 16}" font-size="13" font-weight="bold" fill="#333">${entry.label}</text>`,
    );

    for (const candidate of entry.candidates) {
      const { readFileSync } = require("node:fs");
      const base64 = readFileSync(candidate.file).toString("base64");
      const x = candidate.index * cw;
      const y = row * ch + 22;
      cells.push(
        `<image href="data:image/jpeg;base64,${base64}" x="${x}" y="${y}" width="160" height="150" preserveAspectRatio="xMidYMid slice"/>`,
        `<text x="${x + 4}" y="${y + 166}" font-size="12" fill="#333">#${candidate.index} ${candidate.license}</text>`,
      );
    }
  }

  const sheet = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${cols * cw}" height="${rows * ch}"><rect width="100%" height="100%" fill="#f5f0e8"/>${cells.join("")}</svg>`;

  await sharp(Buffer.from(sheet), { density: 96 })
    .png()
    .toFile(`${REVIEW_DIR}/contact-sheet.png`);
}

async function runFinalize() {
  if (!existsSync(PICKS_FILE)) {
    throw new Error(`缺少 ${PICKS_FILE}（格式：{ "<item-id>": <candidateIndex>, ... }，-1 表示放弃）`);
  }

  const picks = JSON.parse(await readFile(PICKS_FILE, "utf8"));
  const manifest = JSON.parse(await readFile(MANIFEST_FILE, "utf8"));
  await mkdir(OUT_DIR, { recursive: true });

  const mapping = [];
  const credits = [
    "# 物品参考实拍图署名",
    "",
    "以下图片经 Openverse 索引的 CC 授权渠道发布，已按许可证要求署名。",
    "图片为通用参考实拍，与品牌无关，具体物品以医院要求为准。",
    "",
  ];

  for (const entry of manifest) {
    const pick = picks[entry.id];

    if (pick === undefined || pick === null || pick < 0) {
      console.log(`跳过 ${entry.label}`);
      continue;
    }

    const candidate = entry.candidates.find((item) => item.index === pick);

    if (!candidate) {
      console.error(`无候选 ${entry.label} #${pick}`);
      continue;
    }

    const buffer = await download(candidate.url);
    const file = `${OUT_DIR}/${entry.id}.webp`;
    await sharp(buffer)
      .rotate()
      .resize({ width: 800, withoutEnlargement: true })
      .webp({ quality: 72 })
      .toFile(file);

    mapping.push({ id: entry.id, label: entry.label });
    credits.push(
      `- **${entry.label}**（\`${entry.id}.webp\`）：“${candidate.title}”，${candidate.creator || "佚名"}，${candidate.license.toUpperCase()}，来源：${candidate.source}`,
    );
    console.log(`完成 ${entry.label} → ${file}`);
  }

  await writeFile(`${OUT_DIR}/CREDITS.md`, `${credits.join("\n")}\n`);

  const lines = mapping
    .map(
      ({ id, label }) =>
        `  "${id}": {\n    src: "/item-refs/${id}.webp",\n    alt: "${label}的参考实拍图",\n  },`,
    )
    .join("\n");

  console.log(
    `\n=== lib/item-refs.ts 的映射内容 ===\n${lines}\n=== 将以上内容写入 lib/item-refs.ts ===`,
  );
}

const command = process.argv[2];
const onlyArg = process.argv.find((arg) => arg.startsWith("--only="));
const only = onlyArg ? onlyArg.slice("--only=".length).split(",") : undefined;

if (command === "candidates") {
  await runCandidates(only);
} else if (command === "finalize") {
  await runFinalize();
} else {
  console.error("用法: node scripts/fetch-item-refs.mjs candidates|finalize");
  process.exit(1);
}
