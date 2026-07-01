import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  collectArchiveFiles,
  createMobileHandoffArchive,
  readZipEntryNames,
} from "../scripts/create-mobile-handoff-archive.mjs";

describe("mobile handoff archive", () => {
  it("creates a shareable ZIP without nesting ZIP files", () => {
    const handoffDir = mkdtempSync(join(tmpdir(), "dadkit-handoff-"));

    try {
      mkdirSync(join(handoffDir, "screenshots"), { recursive: true });
      writeFileSync(join(handoffDir, "dadkit-1.2.0-debug.apk"), "apk");
      writeFileSync(join(handoffDir, "dadkit-1.2.0-debug.apk.sha256"), "sha");
      writeFileSync(join(handoffDir, "index.html"), "<a>Download APK</a>");
      writeFileSync(join(handoffDir, "tester-guide.md"), "Smoke test");
      writeFileSync(join(handoffDir, "screenshots", "01-home.png"), "png");
      writeFileSync(join(handoffDir, "old.zip"), "stale");

      expect(
        collectArchiveFiles(handoffDir, "dadkit-test-handoff.zip").map(
          (file) => file.name,
        ),
      ).toEqual([
        "dadkit-1.2.0-debug.apk",
        "dadkit-1.2.0-debug.apk.sha256",
        "index.html",
        "screenshots/01-home.png",
        "tester-guide.md",
      ]);

      const archive = createMobileHandoffArchive({
        handoffDir,
        archiveName: "dadkit-test-handoff.zip",
      });

      expect(archive.bytes).toBeGreaterThan(0);
      expect(archive.entryCount).toBe(5);
      expect(readFileSync(archive.path).subarray(0, 4).toString("hex")).toBe(
        "504b0304",
      );
      expect(readZipEntryNames(archive.path)).toEqual([
        "dadkit-1.2.0-debug.apk",
        "dadkit-1.2.0-debug.apk.sha256",
        "index.html",
        "screenshots/01-home.png",
        "tester-guide.md",
      ]);
    } finally {
      rmSync(handoffDir, { recursive: true, force: true });
    }
  });
});
