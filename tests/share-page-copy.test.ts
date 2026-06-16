import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const sharePage = readFileSync(join(process.cwd(), "app", "share", "page.tsx"), "utf8");
const banned = (...parts: string[]) => parts.join("");

describe("share page copy", () => {
  it("uses restrained export and collaboration language", () => {
    expect(sharePage).toContain('title="导出与协作"');
    expect(sharePage).toContain("摘要卡片");
    expect(sharePage).toContain("复制摘要");
    expect(sharePage).toContain("详细文本");
    expect(sharePage).toContain("待产准备摘要");
    expect(sharePage).toContain("待产包 · 医院规则 · 临出门检查");
    expect(sharePage).toContain("packing.completed");
    expect(sharePage).toContain("packing.total");
    expect(sharePage).toContain("医院规则");
    expect(sharePage).toContain("已整理");
    expect(sharePage).not.toContain("准备进度");
    expect(sharePage).not.toContain("下次产检要问");
    expect(sharePage).not.toContain("产检问题");
    expect(sharePage).not.toContain("医院问题");
    expect(sharePage).not.toContain("COMPLETED_STATUSES");
    expect(sharePage).not.toContain(banned("一键", "分享"));
    expect(sharePage).not.toContain(banned("分享", "配图"));
    expect(sharePage).not.toContain(banned("笔记", "配图"));
    expect(sharePage).not.toContain(banned("可", "截图"));
    expect(sharePage).not.toContain(banned("姐", "妹"));
    expect(sharePage).not.toContain(banned("小", "红", "书"));
    expect(sharePage).not.toContain(banned("先把", "清单"));
    expect(sharePage).not.toContain(`metric: "${banned("安", "心")}"`);
  });
});
