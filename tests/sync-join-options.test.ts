import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(process.cwd(), "components", "sync", "JoinSyncWorkspace.tsx"),
  "utf8",
);

describe("sync join data choices", () => {
  it("defaults to family data and explains both first-sync behaviors", () => {
    expect(source).toContain('useState<"remote" | "merge">("remote")');
    expect(source).toContain("使用家庭数据（推荐）");
    expect(source).toContain("用远端家庭数据替换本机业务数据");
    expect(source).toContain("合并本机数据");
    expect(source).toContain("合并结果会上传到家庭空间");
    expect(source).toContain("initialDataMode,");
  });
});
