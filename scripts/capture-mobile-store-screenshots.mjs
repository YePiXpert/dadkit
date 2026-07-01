import { spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, join } from "node:path";

const port = Number(process.env.DADKIT_STORE_SCREENSHOT_PORT ?? 3219);
const baseUrl = `http://127.0.0.1:${port}`;
const outDir = join(
  process.cwd(),
  "dist",
  "mobile-handoff",
  "store-screenshots",
  "app-store-6-9",
);
const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";
const nodeExecutable = process.execPath;
const nextBin = join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const selectedScreenshots = [
  "01-home",
  "02-setup",
  "03-checklist",
  "04-hospital",
  "05-timeline",
  "06-go",
  "07-contractions",
  "08-postpartum",
  "09-settings",
  "10-share",
];

function commandFor(executable, args) {
  if (process.platform !== "win32" || executable !== npmExecutable) {
    return { command: executable, args };
  }

  return {
    command: process.env.ComSpec ?? "cmd.exe",
    args: ["/d", "/s", "/c", ["npm", ...args].join(" ")],
  };
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const invocation = commandFor(command, args);
    const child = spawn(invocation.command, invocation.args, {
      cwd: process.cwd(),
      stdio: "inherit",
      windowsHide: true,
      ...options,
    });

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `${invocation.command} ${invocation.args.join(" ")} failed with ${
            code ?? signal
          }`,
        ),
      );
    });
  });
}

async function waitForServer(timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl, { cache: "no-store" });

      if (response.ok) {
        return;
      }

      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(
    `Timed out waiting for ${baseUrl}: ${lastError?.message ?? "unknown"}`,
  );
}

function pruneStoreScreenshots() {
  const manifestPath = join(outDir, "manifest.json");

  if (!existsSync(manifestPath)) {
    throw new Error(`Store screenshot manifest missing: ${manifestPath}`);
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const selected = (manifest.manifest ?? []).filter((entry) =>
    selectedScreenshots.includes(entry.name),
  );
  const selectedNames = new Set(selected.map((entry) => `${entry.name}.png`));

  if (selected.length !== selectedScreenshots.length) {
    throw new Error(
      `Expected ${selectedScreenshots.length} store screenshots, found ${selected.length}`,
    );
  }

  for (const entry of selected) {
    const filePath = join(outDir, `${entry.name}.png`);

    if (!existsSync(filePath)) {
      throw new Error(`Store screenshot missing: ${filePath}`);
    }

    entry.file = `store-screenshots/app-store-6-9/${basename(filePath)}`;
  }

  for (const entry of readdirSync(outDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".png")) {
      continue;
    }

    if (!selectedNames.has(entry.name)) {
      unlinkSync(join(outDir, entry.name));
    }
  }

  const remainingPngs = readdirSync(outDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".png"))
    .map((entry) => entry.name)
    .sort();

  if (
    remainingPngs.length !== selectedScreenshots.length ||
    remainingPngs.some((name) => !selectedNames.has(name))
  ) {
    throw new Error(
      `Unexpected App Store screenshot files after pruning: ${remainingPngs.join(", ")}`,
    );
  }

  writeFileSync(
    manifestPath,
    `${JSON.stringify(
      {
        ...manifest,
        usage: "App Store Connect 6.9-inch screenshot draft",
        requirement: "1290x2796 PNG, 1-10 screenshots per platform listing",
        manifest: selected,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

async function main() {
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  await run(npmExecutable, ["run", "build"]);

  const server = spawn(nodeExecutable, [nextBin, "start", "-p", String(port)], {
    cwd: process.cwd(),
    stdio: ["ignore", "inherit", "inherit"],
    windowsHide: true,
  });

  let serverExited = false;

  server.once("exit", () => {
    serverExited = true;
  });

  try {
    await waitForServer();

    if (serverExited) {
      throw new Error("Next.js server exited before store screenshots started.");
    }

    await run(nodeExecutable, ["scripts/capture-mobile-screenshots.mjs"], {
      env: {
        ...process.env,
        BASE_URL: baseUrl,
        OUT_DIR: outDir,
        VISUAL_WIDTH: "430",
        VISUAL_HEIGHT: "932",
        VISUAL_DPR: "3",
      },
    });
    pruneStoreScreenshots();

    console.log(`Mobile store screenshots: ${outDir}`);
  } finally {
    if (!serverExited) {
      server.kill("SIGTERM");
    }
  }
}

try {
  await main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
