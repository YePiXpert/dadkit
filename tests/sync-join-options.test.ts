import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { parsePastedInvite } from "@/lib/sync/client-invite";

const source = readFileSync(
  join(process.cwd(), "components", "sync", "JoinSyncWorkspace.tsx"),
  "utf8",
);

describe("sync join data choices", () => {
  it("accepts links, raw tokens, and normalized short invitation codes", () => {
    const token = `DK2.${"a".repeat(64)}.${"A".repeat(20)}`;
    expect(parsePastedInvite(token)).toBe(token);
    expect(parsePastedInvite(`https://dadkit.test/join#invite=${token}`)).toBe(token);
    expect(parsePastedInvite("abcd 2345")).toBe("ABCD-2345");
    expect(parsePastedInvite("ABCI-2345")).toBeUndefined();
  });

  it("defaults to family data and explains both first-sync behaviors", () => {
    expect(source).toContain('useState<"remote" | "merge">("remote")');
    expect(source).toContain("使用家庭数据（推荐）");
    expect(source).toContain("用远端家庭数据替换本机业务数据");
    expect(source).toContain("合并本机数据");
    expect(source).toContain("合并结果会上传到家庭空间");
    expect(source).toContain("initialDataMode,");
    expect(source).toContain("邀请链接或短口令");
  });
});
