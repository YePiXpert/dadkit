import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function workspaceFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("VPS Docker deployment", () => {
  it("binds the container to loopback with a least-privilege runtime", () => {
    const compose = workspaceFile("docker-compose.yml");

    expect(compose).toContain(
      "${DADKIT_BIND_ADDRESS:-127.0.0.1}:${DADKIT_PORT:-3333}:3333",
    );
    expect(compose).toContain('PORT: "3333"');
    expect(compose).toContain("no-new-privileges:true");
    expect(compose).toMatch(/cap_drop:\s*\n\s*- ALL/);
    expect(compose).toContain('DADKIT_PUBLIC_ORIGIN: "${DADKIT_PUBLIC_ORIGIN:-}"');
    expect(compose).toContain(
      'DADKIT_WEBDAV_PROXY_ALLOWED_HOSTS: "${DADKIT_WEBDAV_PROXY_ALLOWED_HOSTS:-}"',
    );
  });

  it("documents HTTPS ingress and the explicit WebDAV allowlist", () => {
    const readme = workspaceFile("README.md");
    const exampleEnv = workspaceFile(".env.example");
    const dockerIgnore = workspaceFile(".dockerignore");

    expect(readme).toContain("HTTPS 反向代理");
    expect(readme).toContain("DADKIT_BIND_ADDRESS");
    expect(readme).toContain("DADKIT_PUBLIC_ORIGIN");
    expect(readme).toContain("DADKIT_WEBDAV_PROXY_ALLOWED_HOSTS");
    expect(exampleEnv).toContain("DADKIT_BIND_ADDRESS=127.0.0.1");
    expect(exampleEnv).toContain("DADKIT_PUBLIC_ORIGIN=https://dadkit.example.com");
    expect(dockerIgnore).toMatch(/^\.env$/m);
    expect(dockerIgnore).toContain("!.env.example");
  });

  it("adds baseline response hardening for the standalone server", () => {
    const nextConfig = workspaceFile("next.config.ts");

    expect(nextConfig).toContain("Content-Security-Policy");
    expect(nextConfig).toContain("Strict-Transport-Security");
    expect(nextConfig).toContain("X-Content-Type-Options");
    expect(nextConfig).toContain("X-Frame-Options");
  });

  it("lets an existing Compose .env remain authoritative during deploy and upgrade", () => {
    for (const scriptPath of [
      "scripts/docker-deploy.sh",
      "scripts/docker-upgrade.sh",
    ]) {
      const script = workspaceFile(scriptPath);

      expect(script).not.toMatch(/^DADKIT_PORT="\$\{DADKIT_PORT:-/m);
      expect(script).not.toMatch(/^DADKIT_BIND_ADDRESS="\$\{DADKIT_BIND_ADDRESS:-/m);
      expect(script).not.toMatch(/^DADKIT_PUBLIC_ORIGIN="\$\{DADKIT_PUBLIC_ORIGIN:-/m);
      expect(script).not.toMatch(
        /^DADKIT_WEBDAV_PROXY_ALLOWED_HOSTS="\$\{DADKIT_WEBDAV_PROXY_ALLOWED_HOSTS:-/m,
      );
      expect(script).not.toMatch(
        /^export DADKIT_(?:PORT|BIND_ADDRESS|PUBLIC_ORIGIN|WEBDAV_PROXY_ALLOWED_HOSTS)$/m,
      );
      expect(script).toContain(
        "unset DADKIT_PORT DADKIT_BIND_ADDRESS DADKIT_PUBLIC_ORIGIN DADKIT_WEBDAV_PROXY_ALLOWED_HOSTS",
      );
      expect(script).toContain('DADKIT_PORT_WAS_SET="${DADKIT_PORT+x}"');
      expect(script).toContain("if [ -e .env ] || [ -L .env ]; then");
      expect(script).toContain(": > .env");
      expect(script).toContain("chmod 600 .env");
      expect(script).toMatch(/\nwrite_initial_env\nstart_and_wait/);
      expect(script).toContain("--wait --wait-timeout");
      expect(script).toContain("compose logs --no-color --tail=100 dadkit");
      expect(script).toContain("compose port dadkit 3333");
    }
  });
});
