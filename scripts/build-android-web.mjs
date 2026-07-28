import { cp, mkdir, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const staging = path.join(root, ".android-static-build");
const androidAssets = path.join(
  root,
  "android",
  "app",
  "src",
  "main",
  "assets",
  "www",
);
const sourceEntries = [
  "app",
  "components",
  "lib",
  "public",
  "next-env.d.ts",
  "next.config.ts",
  "package.json",
  "postcss.config.mjs",
  "tailwind.config.ts",
  "tsconfig.json",
];

assertGeneratedPath(staging);
assertGeneratedPath(androidAssets);

await rm(staging, { force: true, recursive: true });
await mkdir(staging, { recursive: true });

try {
  for (const entry of sourceEntries) {
    await cp(path.join(root, entry), path.join(staging, entry), {
      recursive: true,
    });
  }

  // Android calls the production API over the same public origin. Route
  // handlers stay on the server and are not part of the bundled UI.
  await rm(path.join(staging, "app", "api"), {
    force: true,
    recursive: true,
  });

  await runNextExport();

  await rm(androidAssets, { force: true, recursive: true });
  await mkdir(path.dirname(androidAssets), { recursive: true });
  await cp(path.join(staging, "out"), androidAssets, { recursive: true });

  console.log(`Bundled Android web assets at ${androidAssets}.`);
} finally {
  await rm(staging, { force: true, recursive: true });
}

function assertGeneratedPath(target) {
  const relative = path.relative(root, target);

  if (
    !relative ||
    relative.startsWith("..") ||
    path.isAbsolute(relative)
  ) {
    throw new Error(`Refusing to modify path outside the project: ${target}`);
  }
}

async function runNextExport() {
  const nextCli = path.join(
    root,
    "node_modules",
    "next",
    "dist",
    "bin",
    "next",
  );

  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [nextCli, "build"], {
      cwd: staging,
      env: {
        ...process.env,
        DADKIT_BUILD_TARGET: "android",
        NEXT_TELEMETRY_DISABLED: "1",
      },
      stdio: "inherit",
      windowsHide: true,
    });

    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Android static export failed with exit code ${code}.`));
      }
    });
  });
}
