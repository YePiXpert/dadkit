import { spawn } from "node:child_process";
import { join } from "node:path";

const port = Number(process.env.DADKIT_SCREENSHOT_PORT ?? 3218);
const baseUrl = `http://127.0.0.1:${port}`;
const outDir = join(process.cwd(), "dist", "mobile-handoff", "screenshots");
const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";
const nodeExecutable = process.execPath;
const nextBin = join(process.cwd(), "node_modules", "next", "dist", "bin", "next");

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

async function main() {
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
      throw new Error("Next.js server exited before screenshots started.");
    }

    await run(nodeExecutable, ["scripts/capture-mobile-screenshots.mjs"], {
      env: {
        ...process.env,
        BASE_URL: baseUrl,
        OUT_DIR: outDir,
      },
    });
    await run(nodeExecutable, ["scripts/package-mobile-handoff.mjs"]);

    console.log(`Mobile handoff screenshots: ${outDir}`);
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
