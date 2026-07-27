import { createHash } from "node:crypto";
import { execFile, execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

const root = process.cwd();
const execFileAsync = promisify(execFile);
const dockerAvailable =
  process.platform === "linux" &&
  spawnSync("docker", ["version", "--format", "{{.Server.Version}}"], {
    cwd: root,
    stdio: "ignore",
  }).status === 0;
const describeDocker = dockerAvailable ? describe : describe.skip;

describeDocker("Docker release integration", () => {
  const suffix = `${process.pid}-${Date.now()}`;
  const image = `dadkit-integration:${suffix}`;
  const container = `dadkit-integration-${suffix}`;
  const notes = 'Release says "it\'s ready" and preserves quotes.';
  const apkBytes = Buffer.from("DadKit integration APK\n", "utf8");
  const sha256 = createHash("sha256").update(apkBytes).digest("hex");
  const tempDirectory = mkdtempSync(path.join(tmpdir(), "dadkit-docker-"));
  const apkPath = path.join(tempDirectory, "DadKit-2.1.0.apk");
  let baseURL = "";
  let containerStarted = false;

  function docker(args: string[], timeout = 60_000) {
    return execFileSync("docker", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout,
    }).trim();
  }

  async function dockerAsync(args: string[], timeout = 60_000) {
    const { stdout } = await execFileAsync("docker", args, {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
      timeout,
    });

    return stdout.trim();
  }

  async function waitForServer(url: string) {
    let lastError: unknown;

    for (let attempt = 0; attempt < 45; attempt += 1) {
      try {
        const response = await fetch(`${url}/healthz`);
        if (response.ok) return;
      } catch (error) {
        lastError = error;
      }

      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }

    throw new Error(`Docker 容器未在预期时间内就绪：${String(lastError)}`);
  }

  beforeAll(async () => {
    writeFileSync(apkPath, apkBytes);
    // docker build can take longer than Vitest's worker RPC heartbeat. Keep
    // this child process asynchronous so the worker can continue responding.
    await dockerAsync(["build", "--tag", image, "."], 480_000);
    docker(
      [
        "run",
        "--detach",
        "--name",
        container,
        "--cap-drop",
        "ALL",
        "--publish",
        "127.0.0.1::3333",
        image,
      ],
      30_000,
    );
    containerStarted = true;

    const portMapping = docker(["port", container, "3333/tcp"]);
    const port = portMapping.match(/:(\d+)\s*$/m)?.[1];
    if (!port) {
      throw new Error(`无法解析 Docker 端口映射：${portMapping}`);
    }

    baseURL = `http://127.0.0.1:${port}`;
    await waitForServer(baseURL);
  }, 540_000);

  afterAll(() => {
    if (containerStarted) {
      spawnSync("docker", ["rm", "--force", container], {
        cwd: root,
        stdio: "ignore",
      });
    }
    spawnSync("docker", ["image", "rm", "--force", image], {
      cwd: root,
      stdio: "ignore",
    });
    rmSync(tempDirectory, { force: true, recursive: true });
  });

  it("runs as nextjs and atomically publishes quoted release metadata with Range support", async () => {
    expect(docker(["inspect", "--format", "{{.Config.User}}", container])).toBe(
      "nextjs",
    );

    execFileSync(
      "sh",
      [
        path.join(root, "scripts", "release-apk.sh"),
        apkPath,
        "1",
        "2.1.0",
        notes,
      ],
      {
        cwd: root,
        encoding: "utf8",
        env: {
          ...process.env,
          DADKIT_CONTAINER: container,
          DADKIT_DATA_DIR: "/app/data",
        },
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 60_000,
      },
    );

    const metadataResponse = await fetch(`${baseURL}/api/app-version`);
    expect(metadataResponse.status).toBe(200);
    const metadata = (await metadataResponse.json()) as Record<string, unknown>;
    expect(metadata).toMatchObject({
      notes,
      sha256,
      size: apkBytes.byteLength,
      versionCode: 1,
      versionName: "2.1.0",
    });

    const rangeResponse = await fetch(
      `${baseURL}/api/app-version/apk?versionCode=1`,
      { headers: { Range: "bytes=2-8" } },
    );
    expect(rangeResponse.status).toBe(206);
    expect(rangeResponse.headers.get("content-range")).toBe(
      `bytes 2-8/${apkBytes.byteLength}`,
    );
    expect(rangeResponse.headers.get("etag")).toBe(`"${sha256}"`);
    expect(Buffer.from(await rangeResponse.arrayBuffer())).toEqual(
      apkBytes.subarray(2, 9),
    );

    const headResponse = await fetch(
      `${baseURL}/api/app-version/apk?versionCode=1`,
      { method: "HEAD" },
    );
    expect(headResponse.status).toBe(200);
    expect(headResponse.headers.get("content-length")).toBe(
      String(apkBytes.byteLength),
    );

    expect(
      docker([
        "exec",
        "--user",
        "0",
        container,
        "stat",
        "-c",
        "%a:%U:%G",
        "/app/data/dadkit-1.apk",
      ]),
    ).toBe("600:nextjs:nodejs");
    expect(
      docker([
        "exec",
        "--user",
        "0",
        container,
        "stat",
        "-c",
        "%a:%U:%G",
        "/app/data/app-release.json",
      ]),
    ).toBe("600:nextjs:nodejs");
    expect(
      docker([
        "exec",
        container,
        "sh",
        "-c",
        "find /app/data -maxdepth 1 -name '*.tmp' -print",
      ]),
    ).toBe("");
    expect(
      docker([
        "exec",
        container,
        "sh",
        "-c",
        "find /tmp -maxdepth 1 -name '.dadkit-*.apk.tmp' -print",
      ]),
    ).toBe("");

    const duplicateRelease = spawnSync(
      "sh",
      [
        path.join(root, "scripts", "release-apk.sh"),
        apkPath,
        "1",
        "2.1.0",
        notes,
      ],
      {
        cwd: root,
        encoding: "utf8",
        env: {
          ...process.env,
          DADKIT_CONTAINER: container,
          DADKIT_DATA_DIR: "/app/data",
        },
        timeout: 60_000,
      },
    );

    expect(duplicateRelease.status).not.toBe(0);
    expect(duplicateRelease.stderr).toContain("must be greater than 1");
  }, 90_000);
});
