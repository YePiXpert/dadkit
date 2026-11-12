import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

function validate(origin: string) {
  return execFileSync(process.execPath, ["scripts/validate-deployment-origin.mjs"], {
    env: { ...process.env, DADKIT_PUBLIC_ORIGIN: origin },
    encoding: "utf8",
    stdio: "pipe",
  });
}

describe("release deployment origin", () => {
  it("accepts an HTTPS origin without printing its address", () => {
    const output = validate("https://sync.example.net");
    expect(output).toContain("configuration is valid");
    expect(output).not.toContain("sync.example.net");
  });

  it.each([
    "", "http://sync.example.net", "https://dadkit.example.com",
    "https://user:pass@sync.example.net", "https://sync.example.net/api",
    "https://sync.example.net?token=test", "https://sync.example.net/#fragment",
    "https://sync.example.net:8443",
  ])("rejects missing, placeholder or unsafe configuration: %s", (origin) => {
    expect(() => validate(origin)).toThrow();
  });
});
