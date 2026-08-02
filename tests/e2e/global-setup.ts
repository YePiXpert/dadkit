import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";

const port = 3100;
const baseURL = `http://127.0.0.1:${port}`;
const root = process.cwd();

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForServer(server: ChildProcess, output: () => string) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error(`端到端服务器提前退出：${output()}`);
    }

    try {
      const response = await fetch(`${baseURL}/healthz`);
      if (response.ok) return;
    } catch {
      // The standalone server is still starting.
    }

    await delay(250);
  }

  throw new Error(`端到端服务器未在 20 秒内就绪：${output()}`);
}

export default async function globalSetup() {
  let output = "";
  const server = spawn(process.execPath, ["scripts/start-e2e-server.mjs"], {
    cwd: root,
    env: {
      ...process.env,
      DADKIT_DATA_DIR: path.join(root, "data", "playwright"),
      DADKIT_PUBLIC_ORIGIN: baseURL,
      HOSTNAME: "127.0.0.1",
      PORT: String(port),
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  server.stdout?.on("data", (chunk: Buffer) => {
    output += chunk.toString();
  });
  server.stderr?.on("data", (chunk: Buffer) => {
    output += chunk.toString();
  });

  await waitForServer(server, () => output);

  return async () => {
    if (server.exitCode !== null) return;

    const exited = new Promise<void>((resolve) => {
      server.once("exit", () => resolve());
    });

    server.kill();
    await Promise.race([exited, delay(5_000)]);
  };
}
