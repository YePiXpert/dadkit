import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const sharePage = readFileSync(join(process.cwd(), "app", "share", "page.tsx"), "utf8");

describe("share page copy", () => {
  it("uses restrained export and collaboration language", () => {
    expect(sharePage).toContain('title="导出与协作"');
    expect(sharePage).toContain("摘要卡片");
    expect(sharePage).toContain("复制摘要");
    expect(sharePage).toContain("详细文本");
    expect(sharePage).toContain("待产准备摘要");
    expect(sharePage).toContain("已整理");
    expect(sharePage).not.toContain("一键分享");
    expect(sharePage).not.toContain("分享配图");
    expect(sharePage).not.toContain("笔记配图");
    expect(sharePage).not.toContain("可截图");
    expect(sharePage).not.toContain("姐妹");
    expect(sharePage).not.toContain("小红书");
    expect(sharePage).not.toContain("先把清单");
    expect(sharePage).not.toContain('metric: "安心"');
  });
});
