import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// 静态导出构建：产物 out/ 供静态托管与 App 壳（Android assets / iOS bundle）使用。
//
// 两点必要的构建期隔离（Next 15 实测行为，与 distDir 设置无关）：
// 1. App Router 的 output: "export" 不兼容路由处理器与 middleware，也无法用
//    pageExtensions 排除（vercel/next.js#51478）——构建期把 app/api、
//    app/healthz、middleware.ts 临时移到 .static-excluded/，结束（无论成败）恢复。
// 2. 导出构建会改写 .next/static 与 .next/BUILD_ID、删除 .next/standalone，
//    破坏已完成的服务器构建——构建期把整个 .next 暂存，结束后恢复。
//    注意：构建前请先停掉正在使用 .next 的 dev/e2e 服务器（Windows 会锁目录）。
//
// 可选环境变量：
//   NEXT_PUBLIC_DADKIT_API_BASE          云端同步 API 地址（空 = 同源部署）
//   NEXT_PUBLIC_DADKIT_PUBLIC_WEB_ORIGIN 邀请链接指向的公网 Web 地址

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const staging = path.join(root, ".static-excluded");
const distDir = path.join(root, ".dadkit-static-build");
const exportDir = path.join(root, "out");
const nextDir = path.join(root, ".next");
const stagedNext = path.join(staging, "next");
const excluded = ["app/api", "app/healthz", "middleware.ts"];

mkdirSync(staging, { recursive: true });
const moved = [];
for (const relative of excluded) {
  const from = path.join(root, relative);
  if (!existsSync(from)) continue;
  const to = path.join(staging, relative.split(/[\\/]/).join("__"));
  renameSync(from, to);
  moved.push([to, from]);
}
if (existsSync(nextDir)) {
  renameSync(nextDir, stagedNext);
}

let status = 1;
try {
  const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
  const result = spawnSync(process.execPath, [nextBin, "build"], {
    stdio: "inherit",
    cwd: root,
    env: {
      ...process.env,
      BUILD_TARGET: "static",
    },
  });
  status = result.status ?? 1;

  // output: "export" 会把最终静态文件直接写进 distDir，改名到约定的 out/。
  if (status === 0 && existsSync(distDir)) {
    rmSync(exportDir, { recursive: true, force: true });
    renameSync(distDir, exportDir);
  }
} finally {
  for (const [staged, original] of moved) renameSync(staged, original);
  if (existsSync(stagedNext)) {
    rmSync(nextDir, { recursive: true, force: true });
    renameSync(stagedNext, nextDir);
  }
  rmSync(staging, { recursive: true, force: true });
  rmSync(distDir, { recursive: true, force: true });
}

process.exit(status);
