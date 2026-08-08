import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";

// 新路由未登记预算时的兜底值。
const DEFAULT_FIRST_LOAD_JS_BYTES = 200 * 1024;
// CSS 现状 8.4 KiB（gzip），按现状 +20% 余量向上取整。
const MAX_CSS_BYTES = 11 * 1024;

// 预算 = 当前构建实测 gzip 体积（含 polyfills chunk）+ 10%–15% 余量；
// 备份页已濒临超限，仅按现状 +5%。
const routeBudgets = new Map([
  // v3.3 首页改为仪表盘（进度卡 + 功能入口），实测约 217 KiB，留 10% 余量。
  ["/page", 240 * 1024],
  ["/checklist/page", 255 * 1024],
  ["/checklist/[sectionId]/page", 255 * 1024],
  ["/departure/page", 250 * 1024],
  ["/hospital/page", 225 * 1024],
  // v3.1 的动态家庭成员、多负责人筛选与兼容标签增加约 7 KiB；
  // 255 KiB 仅比旧预算高 4.1%，并保留约 1.2% 实测余量。
  ["/planning/page", 255 * 1024],
  ["/baby/page", 260 * 1024],
  ["/baby/timeline/page", 260 * 1024],
  ["/growth/page", 190 * 1024],
  // /tools 是轻量中转页（与 /settings 类似），仅渲染 4 个入口卡片。
  ["/tools/page", 170 * 1024],
  ["/settings/page", 170 * 1024],
  ["/join/page", 200 * 1024],
  ["/settings/sync/page", 250 * 1024],
  ["/onboarding/page", 225 * 1024],
  ["/settings/family/page", 225 * 1024],
  // v3.4.3 adds the shared Android bundle/theme bridge; measured +0.8 KiB.
  ["/settings/checklist/page", 232 * 1024],
  // v3.1 adds household/planning-v2/baby-v2 validation to the dense backup
  // surface. Keep roughly 1.5% headroom over the measured v3.1 bundle.
  ["/settings/backup/page", 258 * 1024],
  ["/privacy/page", 160 * 1024],
  ["/support/page", 160 * 1024],
]);

const routeLabels = new Map([
  ["/page", "首页仪表盘"],
  ["/checklist/page", "纯清单页"],
  ["/checklist/[sectionId]/page", "清单分类页"],
  ["/departure/page", "准备出发页"],
  ["/hospital/page", "医院档案页"],
  ["/planning/page", "家庭分工与采购页"],
  ["/baby/page", "宝宝记录页"],
  ["/baby/timeline/page", "宝宝时间线页"],
  ["/growth/page", "成长记页"],
  ["/tools/page", "工具页"],
  ["/settings/page", "我的页"],
  ["/join/page", "家庭同步加入页"],
  ["/settings/sync/page", "家庭同步管理页"],
  ["/onboarding/page", "首次使用引导页"],
  ["/settings/family/page", "家庭成员设置页"],
  ["/settings/checklist/page", "清单设置页"],
  ["/settings/backup/page", "备份页"],
  ["/privacy/page", "隐私说明页"],
  ["/support/page", "支持与反馈页"],
]);

function formatKiB(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

function routePath(manifestKey) {
  return manifestKey === "/page" ? "/" : manifestKey.replace(/\/page$/, "");
}

async function gzipTotalBytes(files) {
  const contents = await Promise.all(
    files.map((file) => readFile(path.join(process.cwd(), ".next", file))),
  );

  // Next.js reports First Load JS as transfer size. The production proxy serves
  // these immutable static chunks with content compression, so use gzip here
  // rather than raw on-disk bytes to match the mobile network budget.
  return contents.reduce((total, chunk) => total + gzipSync(chunk).byteLength, 0);
}

async function readInitialJavaScriptBytes(manifest, manifestKey, polyfillBytes) {
  const chunks = manifest.pages?.[manifestKey];

  if (!Array.isArray(chunks)) {
    throw new Error(`未找到 ${manifestKey} 的构建清单。请先运行 npm run build。`);
  }

  const files = [...new Set(chunks.filter((chunk) => chunk.endsWith(".js")))];

  return {
    // polyfills chunk 随每页首屏加载，计入每条路由总量。
    bytes: (await gzipTotalBytes(files)) + polyfillBytes,
    files,
  };
}

async function readTotalCssBytes() {
  const cssDir = path.join(process.cwd(), ".next", "static", "css");
  const files = (await readdir(cssDir))
    .filter((file) => file.endsWith(".css"))
    .map((file) => path.join("static", "css", file));

  return { bytes: await gzipTotalBytes(files), files };
}

async function verifyIndexedDbReadGate() {
  const [photoLibrary, row] = await Promise.all([
    readFile(path.join(process.cwd(), "lib", "item-photos.ts"), "utf8"),
    readFile(
      path.join(process.cwd(), "components", "ChecklistItemRow.tsx"),
      "utf8",
    ),
  ]);
  const requiredPhotoCacheMarkers = [
    "const photoReadPromises = new Map",
    "const existing = photoReadPromises.get",
    "photoReadPromises.set(normalizedItemId, pending)",
    "const photoUrlEntries = new Map",
    "URL.revokeObjectURL",
  ];

  for (const marker of requiredPhotoCacheMarkers) {
    if (!photoLibrary.includes(marker)) {
      throw new Error(`照片 IndexedDB 读取门禁缺失：${marker}`);
    }
  }

  if (!row.includes('rootMargin: "600px 0px"')) {
    throw new Error("照片视口预加载门禁缺失：必须保持 600px rootMargin。");
  }
}

function usagePercent(bytes, budget) {
  return Math.round((bytes / budget) * 100);
}

const manifestPath = path.join(process.cwd(), ".next", "app-build-manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const buildManifestPath = path.join(
  process.cwd(),
  ".next",
  "build-manifest.json",
);
const buildManifest = JSON.parse(await readFile(buildManifestPath, "utf8"));
const polyfillBytes = await gzipTotalBytes(buildManifest.polyfillFiles ?? []);

// 动态枚举全部页面路由（排除 _not-found 等内部路由），避免新增页面漏测。
const manifestKeys = Object.keys(manifest.pages ?? {})
  .filter((key) => key.endsWith("/page") && !key.startsWith("/_"))
  .sort((a, b) => (a === "/page" ? -1 : b === "/page" ? 1 : a.localeCompare(b)));

let failed = false;

for (const manifestKey of manifestKeys) {
  const budget = routeBudgets.get(manifestKey) ?? DEFAULT_FIRST_LOAD_JS_BYTES;
  const label = routeLabels.get(manifestKey) ?? routePath(manifestKey);
  const result = await readInitialJavaScriptBytes(
    manifest,
    manifestKey,
    polyfillBytes,
  );
  const passed = result.bytes <= budget;

  failed ||= !passed;
  console.log(
    `${passed ? "PASS" : "FAIL"} ${label} (${routePath(manifestKey)}): ${formatKiB(result.bytes)} / ${formatKiB(budget)}，用量 ${usagePercent(result.bytes, budget)}%（${result.files.length} chunks + polyfills）`,
  );
}

const css = await readTotalCssBytes();
const cssPassed = css.bytes <= MAX_CSS_BYTES;

failed ||= !cssPassed;
console.log(
  `${cssPassed ? "PASS" : "FAIL"} CSS 总重: ${formatKiB(css.bytes)} / ${formatKiB(MAX_CSS_BYTES)}，用量 ${usagePercent(css.bytes, MAX_CSS_BYTES)}%（${css.files.length} files）`,
);

await verifyIndexedDbReadGate();
console.log("PASS 照片 IndexedDB 读取、对象 URL 与 600px 预加载门禁");

if (failed) {
  process.exitCode = 1;
}
