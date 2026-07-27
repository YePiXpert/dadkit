import { readFile } from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";

const MAX_FIRST_LOAD_JS_BYTES = 200 * 1024;
const routes = [
  { label: "首页", manifestKey: "/page" },
  { label: "清单页", manifestKey: "/checklist/[sectionId]/page" },
  { label: "备份页", manifestKey: "/settings/backup/page" },
];

function formatKiB(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

async function readInitialJavaScriptBytes(manifest, manifestKey) {
  const chunks = manifest.pages?.[manifestKey];

  if (!Array.isArray(chunks)) {
    throw new Error(`未找到 ${manifestKey} 的构建清单。请先运行 npm run build。`);
  }

  const files = [...new Set(chunks.filter((chunk) => chunk.endsWith(".js")))];
  const contents = await Promise.all(
    files.map((file) => readFile(path.join(process.cwd(), ".next", file))),
  );

  return {
    // Next.js reports First Load JS as transfer size. The production proxy serves
    // these immutable static chunks with content compression, so use gzip here
    // rather than raw on-disk bytes to match the mobile network budget.
    bytes: contents.reduce((total, chunk) => total + gzipSync(chunk).byteLength, 0),
    files,
  };
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

const manifestPath = path.join(process.cwd(), ".next", "app-build-manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
let failed = false;

for (const route of routes) {
  const result = await readInitialJavaScriptBytes(manifest, route.manifestKey);
  const passed = result.bytes <= MAX_FIRST_LOAD_JS_BYTES;
  failed ||= !passed;
  console.log(
    `${passed ? "PASS" : "FAIL"} ${route.label}: ${formatKiB(result.bytes)} / ${formatKiB(MAX_FIRST_LOAD_JS_BYTES)} (${result.files.length} chunks)`,
  );
}

await verifyIndexedDbReadGate();
console.log("PASS 照片 IndexedDB 读取、对象 URL 与 600px 预加载门禁");

if (failed) {
  process.exitCode = 1;
}
