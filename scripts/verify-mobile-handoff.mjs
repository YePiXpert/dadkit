import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

import {
  ANDROID_DEBUG_APK,
  ANDROID_PACKAGE_ID,
  APP_NAME,
  APP_VERSION,
  IOS_XCODE_PROJECT,
} from "./mobile-env.mjs";
import {
  createMobileHandoffArchive,
  handoffArchiveName,
  handoffArchivePath,
  readZipEntryNames,
} from "./create-mobile-handoff-archive.mjs";

const handoffDir = join(process.cwd(), "dist", "mobile-handoff");
const handoffApkName = `dadkit-${APP_VERSION}-debug.apk`;
const handoffApk = join(handoffDir, handoffApkName);
const handoffChecksum = join(handoffDir, `${handoffApkName}.sha256`);
const handoffCover = join(handoffDir, "cover.png");
const handoffPlayFeature = join(handoffDir, "google-play-feature.png");
const screenshotsDir = join(handoffDir, "screenshots");
const screenshotsManifest = join(screenshotsDir, "manifest.json");
const storeScreenshotsDir = join(
  handoffDir,
  "store-screenshots",
  "app-store-6-9",
);
const storeScreenshotsManifest = join(storeScreenshotsDir, "manifest.json");
const readinessReportJson = join(handoffDir, "readiness-report.json");
const readinessReportMarkdown = join(handoffDir, "readiness-report.md");
let verifiedApkHash = "";
let coverDimensions;
let playFeatureInfo;
let screenshotSummary = {
  count: 0,
  overflowCount: 0,
  blockingDiagnosticsCount: 0,
};
let storeScreenshotSummary = {
  count: 0,
  overflowCount: 0,
  blockingDiagnosticsCount: 0,
  dimensionFailures: 0,
};
let archiveSummary;

const requiredFiles = [
  {
    label: "Android debug APK",
    path: ANDROID_DEBUG_APK,
    nonEmpty: true,
  },
  {
    label: "Android handoff APK",
    path: handoffApk,
    nonEmpty: true,
  },
  {
    label: "Android handoff checksum",
    path: handoffChecksum,
    nonEmpty: true,
  },
  {
    label: "Android handoff README",
    path: join(handoffDir, "README.md"),
    nonEmpty: true,
  },
  {
    label: "Android handoff tester guide",
    path: join(handoffDir, "tester-guide.md"),
    nonEmpty: true,
  },
  {
    label: "Android handoff index",
    path: join(handoffDir, "index.html"),
    nonEmpty: true,
  },
  {
    label: "Android handoff cover",
    path: handoffCover,
    nonEmpty: true,
  },
  {
    label: "Google Play feature graphic",
    path: handoffPlayFeature,
    nonEmpty: true,
  },
  {
    label: "Android handoff screenshot manifest",
    path: screenshotsManifest,
    nonEmpty: true,
  },
  {
    label: "Android handoff home screenshot",
    path: join(screenshotsDir, "01-home.png"),
    nonEmpty: true,
  },
  {
    label: "App Store 6.9-inch screenshot manifest",
    path: storeScreenshotsManifest,
    nonEmpty: true,
  },
  {
    label: "App Store 6.9-inch home screenshot",
    path: join(storeScreenshotsDir, "01-home.png"),
    nonEmpty: true,
  },
  {
    label: "Android handoff metadata",
    path: join(handoffDir, "metadata.json"),
    nonEmpty: true,
  },
  {
    label: "iOS Xcode project",
    path: IOS_XCODE_PROJECT,
  },
  {
    label: "Capacitor config",
    path: join(process.cwd(), "capacitor.config.ts"),
  },
  {
    label: "Native icon source",
    path: join(process.cwd(), "resources", "icon.png"),
    nonEmpty: true,
  },
  {
    label: "Native splash source",
    path: join(process.cwd(), "resources", "splash.png"),
    nonEmpty: true,
  },
  {
    label: "Privacy route",
    path: join(process.cwd(), "app", "privacy", "page.tsx"),
  },
  {
    label: "Support route",
    path: join(process.cwd(), "app", "support", "page.tsx"),
  },
  {
    label: "Mobile build docs",
    path: join(process.cwd(), "docs", "mobile-app-build.md"),
  },
  {
    label: "Mobile release checklist",
    path: join(process.cwd(), "docs", "mobile-release-readiness.md"),
  },
  {
    label: "Mobile store metadata draft",
    path: join(process.cwd(), "docs", "mobile-store-metadata.md"),
  },
  {
    label: "Mobile tester guide",
    path: join(process.cwd(), "docs", "mobile-tester-guide.md"),
  },
  {
    label: "WebDAV prompt verifier",
    path: join(process.cwd(), "scripts", "verify-webdav-acceptance.ps1"),
  },
];

const requiredPackageScripts = [
  "mobile:android:debug",
  "mobile:android:handoff",
  "mobile:android:release",
  "mobile:android:release:aab",
  "mobile:android:verify",
  "mobile:android:install",
  "mobile:android:webdav:verify:prompt",
  "mobile:handoff:archive",
  "mobile:handoff:screenshots",
  "mobile:handoff:store-screenshots",
  "mobile:ios:verify",
  "mobile:handoff:verify",
  "webdav:verify:prompt",
];

const requiredDocSnippets = [
  "android/app/build/outputs/apk/debug/app-debug.apk",
  `dist/mobile-handoff/dadkit-${APP_VERSION}-debug.apk`,
  `dist/mobile-handoff/${handoffArchiveName}`,
  "dist/mobile-handoff/store-screenshots/app-store-6-9/",
  "npm run mobile:handoff:store-screenshots",
  "resources/store/dadkit-google-play-feature.png",
  "google-play-feature.png",
  "npm run mobile:android:handoff",
  "npm run mobile:handoff:archive",
  "npm run mobile:android:webdav:verify:prompt",
  "com.yepixpert.dadkit",
  "https://webdav.123pan.cn/webdav/DadKit/dadkit-backup.json",
  "TestFlight",
];

const failures = [];

for (const file of requiredFiles) {
  if (!existsSync(file.path)) {
    failures.push(`${file.label} missing: ${file.path}`);
    continue;
  }

  if (file.nonEmpty && statSync(file.path).size <= 0) {
    failures.push(`${file.label} is empty: ${file.path}`);
  }
}

const packageJson = JSON.parse(
  readFileSync(join(process.cwd(), "package.json"), "utf8"),
);

for (const script of requiredPackageScripts) {
  if (!packageJson.scripts?.[script]) {
    failures.push(`package.json script missing: ${script}`);
  }
}

const releaseChecklist = readFileSync(
  join(process.cwd(), "docs", "mobile-release-readiness.md"),
  "utf8",
);
const storeMetadata = readFileSync(
  join(process.cwd(), "docs", "mobile-store-metadata.md"),
  "utf8",
);

for (const snippet of requiredDocSnippets) {
  if (!releaseChecklist.includes(snippet)) {
    failures.push(`Release checklist missing: ${snippet}`);
  }
}

const requiredStoreMetadataSnippets = [
  "Beta app description",
  "What to test",
  "App privacy draft",
  "com.yepixpert.dadkit",
  "Google Play feature graphic",
  "resources/store/dadkit-google-play-feature.png",
  "1024x500",
  "<public-origin>/privacy",
  "<public-origin>/support",
  "https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/",
  "https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications/",
  "https://support.google.com/googleplay/android-developer/answer/9845334",
  "https://support.google.com/googleplay/android-developer/answer/9866151",
];

for (const snippet of requiredStoreMetadataSnippets) {
  if (!storeMetadata.includes(snippet)) {
    failures.push(`Store metadata draft missing: ${snippet}`);
  }
}

const testerGuide = readFileSync(
  join(process.cwd(), "docs", "mobile-tester-guide.md"),
  "utf8",
);

for (const snippet of [
  "Smoke test",
  "Core workflow test",
  "Optional WebDAV test",
  "Feedback template",
  "Sensitive data removed",
]) {
  if (!testerGuide.includes(snippet)) {
    failures.push(`Tester guide missing: ${snippet}`);
  }
}

if (existsSync(handoffApk) && existsSync(handoffChecksum)) {
  const apkHash = createHash("sha256")
    .update(readFileSync(handoffApk))
    .digest("hex");
  const checksum = readFileSync(handoffChecksum, "utf8").trim();
  verifiedApkHash = apkHash;

  if (!checksum.startsWith(`${apkHash}  ${handoffApkName}`)) {
    failures.push("Android handoff checksum does not match the handoff APK");
  }
}

const handoffIndex = join(handoffDir, "index.html");

if (existsSync(handoffIndex)) {
  const indexHtml = readFileSync(handoffIndex, "utf8");

  for (const snippet of [
    "Download APK",
    "SHA-256",
    "cover.png",
    "google-play-feature.png",
    handoffArchiveName,
    "tester-guide.md",
    "readiness-report.md",
    "screenshots/01-home.png",
    "https://webdav.123pan.cn/webdav/DadKit/dadkit-backup.json",
  ]) {
    if (!indexHtml.includes(snippet)) {
      failures.push(`Android handoff index missing: ${snippet}`);
    }
  }
}

if (existsSync(handoffCover)) {
  const dimensions = readPngInfo(handoffCover);
  coverDimensions = dimensions;
  const aspectRatio = dimensions.width / dimensions.height;

  if (dimensions.width < 1200 || dimensions.height < 675) {
    failures.push(
      `Android handoff cover is too small: ${dimensions.width}x${dimensions.height}`,
    );
  }

  if (aspectRatio < 1.6 || aspectRatio > 1.9) {
    failures.push(
      `Android handoff cover is not a landscape cover: ${dimensions.width}x${dimensions.height}`,
    );
  }
}

if (existsSync(handoffPlayFeature)) {
  const info = readPngInfo(handoffPlayFeature);
  playFeatureInfo = info;

  if (info.width !== 1024 || info.height !== 500) {
    failures.push(
      `Google Play feature graphic must be 1024x500: ${info.width}x${info.height}`,
    );
  }

  if (info.colorType !== 2) {
    failures.push(
      `Google Play feature graphic must be 24-bit RGB PNG without alpha; color type ${info.colorType}`,
    );
  }
}

if (existsSync(screenshotsManifest)) {
  const screenshotManifest = JSON.parse(
    readFileSync(screenshotsManifest, "utf8"),
  );
  const screenshots = screenshotManifest.manifest ?? [];
  screenshotSummary = {
    count: screenshots.length,
    overflowCount: 0,
    blockingDiagnosticsCount: 0,
  };

  if (screenshots.length !== 12) {
    failures.push(`Expected 12 handoff screenshots, found ${screenshots.length}`);
  }

  for (const entry of screenshots) {
    const filename = entry.file ? join(screenshotsDir, entry.name + ".png") : "";
    const state = entry.state ?? {};
    const widest = Math.max(state.scrollWidth ?? 0, state.bodyScrollWidth ?? 0);
    const viewportWidth = state.width ?? 0;
    const blockingDiagnostics = (entry.diagnostics ?? []).filter(
      (diagnostic) =>
        diagnostic.type === "network" || diagnostic.type === "exception",
    );

    if (!entry.name || !entry.route) {
      failures.push("A handoff screenshot manifest entry is missing name or route");
    }

    if (!filename || !existsSync(filename) || statSync(filename).size <= 0) {
      failures.push(`Handoff screenshot missing or empty: ${entry.name}`);
    }

    if (viewportWidth <= 0 || widest > viewportWidth + 1) {
      screenshotSummary.overflowCount += 1;
      failures.push(
        `Handoff screenshot has horizontal overflow: ${entry.name} ${widest}/${viewportWidth}`,
      );
    }

    if (blockingDiagnostics.length > 0) {
      screenshotSummary.blockingDiagnosticsCount += blockingDiagnostics.length;
      failures.push(`Handoff screenshot has blocking diagnostics: ${entry.name}`);
    }
  }
}

if (existsSync(storeScreenshotsManifest)) {
  const storeManifest = JSON.parse(readFileSync(storeScreenshotsManifest, "utf8"));
  const screenshots = storeManifest.manifest ?? [];
  storeScreenshotSummary = {
    count: screenshots.length,
    overflowCount: 0,
    blockingDiagnosticsCount: 0,
    dimensionFailures: 0,
  };

  if (screenshots.length !== 10) {
    failures.push(
      `Expected 10 App Store 6.9-inch screenshots, found ${screenshots.length}`,
    );
  }

  for (const entry of screenshots) {
    const filePath = entry.file
      ? join(handoffDir, entry.file)
      : join(storeScreenshotsDir, `${entry.name}.png`);
    const state = entry.state ?? {};
    const widest = Math.max(state.scrollWidth ?? 0, state.bodyScrollWidth ?? 0);
    const viewportWidth = state.width ?? 0;
    const blockingDiagnostics = (entry.diagnostics ?? []).filter(
      (diagnostic) =>
        diagnostic.type === "network" || diagnostic.type === "exception",
    );

    if (!entry.name || !entry.route) {
      failures.push("An App Store screenshot manifest entry is missing name or route");
    }

    if (!existsSync(filePath) || statSync(filePath).size <= 0) {
      failures.push(`App Store screenshot missing or empty: ${entry.name}`);
      continue;
    }

    const info = readPngInfo(filePath);

    if (info.width !== 1290 || info.height !== 2796) {
      storeScreenshotSummary.dimensionFailures += 1;
      failures.push(
        `App Store screenshot must be 1290x2796: ${entry.name} ${info.width}x${info.height}`,
      );
    }

    if (viewportWidth <= 0 || widest > viewportWidth + 1) {
      storeScreenshotSummary.overflowCount += 1;
      failures.push(
        `App Store screenshot has horizontal overflow: ${entry.name} ${widest}/${viewportWidth}`,
      );
    }

    if (blockingDiagnostics.length > 0) {
      storeScreenshotSummary.blockingDiagnosticsCount += blockingDiagnostics.length;
      failures.push(`App Store screenshot has blocking diagnostics: ${entry.name}`);
    }
  }
}

if (failures.length === 0) {
  writeReadinessReport();
  archiveSummary = createMobileHandoffArchive();
  verifyArchiveEntries(archiveSummary);
}

if (failures.length > 0) {
  console.error("DadKit mobile handoff verification failed:");

  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  process.exit(1);
}

console.log("Verified DadKit mobile handoff artifacts.");
console.log(`Android APK: ${ANDROID_DEBUG_APK}`);
console.log(`Android handoff: ${handoffApk}`);
console.log(`Handoff archive: ${handoffArchivePath}`);
console.log(`iOS project: ${IOS_XCODE_PROJECT}`);
console.log("Release checklist: docs/mobile-release-readiness.md");
console.log("Readiness report: dist/mobile-handoff/readiness-report.md");

function readPngInfo(filePath) {
  const buffer = readFileSync(filePath);
  const signature = buffer.subarray(0, 8).toString("hex");

  if (signature !== "89504e470d0a1a0a") {
    failures.push(`Expected a PNG file: ${filePath}`);
    return { width: 0, height: 0 };
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    colorType: buffer.readUInt8(25),
  };
}

function writeReadinessReport() {
  const apkSize = existsSync(handoffApk) ? statSync(handoffApk).size : 0;
  const generatedAt = new Date().toISOString();
  const report = {
    status: "verified",
    generatedAt,
    appName: APP_NAME,
    version: APP_VERSION,
    packageId: ANDROID_PACKAGE_ID,
    android: {
      debugApk: `dist/mobile-handoff/${handoffApkName}`,
      bytes: apkSize,
      sha256: verifiedApkHash,
      checksumFile: `dist/mobile-handoff/${handoffApkName}.sha256`,
      handoffArchive: `dist/mobile-handoff/${handoffArchiveName}`,
    },
    ios: {
      xcodeProject: "ios/App/App.xcodeproj",
      bundleId: ANDROID_PACKAGE_ID,
      testFlightUploadStatus:
        "pending Apple Developer account and macOS/Xcode upload",
    },
    visuals: {
      cover: {
        file: "dist/mobile-handoff/cover.png",
        width: coverDimensions?.width ?? 0,
        height: coverDimensions?.height ?? 0,
      },
      googlePlayFeature: {
        file: "dist/mobile-handoff/google-play-feature.png",
        source: "resources/store/dadkit-google-play-feature.png",
        width: playFeatureInfo?.width ?? 0,
        height: playFeatureInfo?.height ?? 0,
        colorType: playFeatureInfo?.colorType ?? 0,
      },
      screenshots: {
        directory: "dist/mobile-handoff/screenshots",
        count: screenshotSummary.count,
        overflowCount: screenshotSummary.overflowCount,
        blockingDiagnosticsCount: screenshotSummary.blockingDiagnosticsCount,
      },
      storeScreenshots: {
        directory: "dist/mobile-handoff/store-screenshots/app-store-6-9",
        deviceClass: "App Store 6.9-inch",
        expectedSize: "1290x2796",
        count: storeScreenshotSummary.count,
        overflowCount: storeScreenshotSummary.overflowCount,
        blockingDiagnosticsCount: storeScreenshotSummary.blockingDiagnosticsCount,
        dimensionFailures: storeScreenshotSummary.dimensionFailures,
      },
    },
    webdav: {
      expectedRemotePath:
        "https://webdav.123pan.cn/webdav/DadKit/dadkit-backup.json",
      acceptanceStatus:
        "pending local prompt verification with user-provided 123pan credentials",
      promptCommand: "npm run mobile:android:webdav:verify:prompt",
    },
    generatedFiles: [
      `dist/mobile-handoff/${handoffApkName}`,
      `dist/mobile-handoff/${handoffApkName}.sha256`,
      "dist/mobile-handoff/index.html",
      `dist/mobile-handoff/${handoffArchiveName}`,
      "dist/mobile-handoff/google-play-feature.png",
      "dist/mobile-handoff/store-screenshots/app-store-6-9/manifest.json",
      "dist/mobile-handoff/tester-guide.md",
      "dist/mobile-handoff/metadata.json",
      "dist/mobile-handoff/readiness-report.md",
      "dist/mobile-handoff/readiness-report.json",
    ],
  };

  writeFileSync(
    readinessReportJson,
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(readinessReportMarkdown, renderReadinessMarkdown(report), "utf8");
}

function renderReadinessMarkdown(report) {
  return `# DadKit mobile handoff readiness

Generated: ${report.generatedAt}

Status: ${report.status}

## Android

- APK: \`${report.android.debugApk}\`
- Package id: \`${report.packageId}\`
- Version: \`${report.version}\`
- Size: ${report.android.bytes} bytes
- SHA-256: \`${report.android.sha256}\`
- Handoff ZIP: \`${report.android.handoffArchive}\`

## Visuals

- Cover: \`${report.visuals.cover.file}\` (${report.visuals.cover.width}x${report.visuals.cover.height})
- Google Play feature graphic: \`${report.visuals.googlePlayFeature.file}\` (${report.visuals.googlePlayFeature.width}x${report.visuals.googlePlayFeature.height}, PNG color type ${report.visuals.googlePlayFeature.colorType})
- Screenshots: ${report.visuals.screenshots.count}
- Screenshot overflow failures: ${report.visuals.screenshots.overflowCount}
- Screenshot blocking diagnostics: ${report.visuals.screenshots.blockingDiagnosticsCount}
- App Store screenshots: ${report.visuals.storeScreenshots.count} (${report.visuals.storeScreenshots.expectedSize})
- App Store screenshot dimension failures: ${report.visuals.storeScreenshots.dimensionFailures}
- App Store screenshot overflow failures: ${report.visuals.storeScreenshots.overflowCount}

## iOS

- Xcode project: \`${report.ios.xcodeProject}\`
- Bundle id: \`${report.ios.bundleId}\`
- TestFlight: ${report.ios.testFlightUploadStatus}

## WebDAV

- Expected remote path: \`${report.webdav.expectedRemotePath}\`
- Acceptance: ${report.webdav.acceptanceStatus}
- Prompt command: \`${report.webdav.promptCommand}\`

## Generated files

${report.generatedFiles.map((file) => `- \`${file}\``).join("\n")}

## Notes

This report contains no WebDAV credentials, signing keys, Apple account data, or
private family data. Real 123pan acceptance and TestFlight upload still require
local credentials/account access.
`;
}

function verifyArchiveEntries(archive) {
  if (!existsSync(archive.path) || statSync(archive.path).size <= 0) {
    failures.push(`Mobile handoff archive missing or empty: ${archive.path}`);
    return;
  }

  const names = new Set(readZipEntryNames(archive.path));

  for (const name of [
    handoffApkName,
    `${handoffApkName}.sha256`,
    "index.html",
    "tester-guide.md",
    "metadata.json",
    "readiness-report.md",
    "readiness-report.json",
    "cover.png",
    "google-play-feature.png",
    "screenshots/01-home.png",
    "store-screenshots/app-store-6-9/manifest.json",
    "store-screenshots/app-store-6-9/01-home.png",
  ]) {
    if (!names.has(name)) {
      failures.push(`Mobile handoff archive missing entry: ${name}`);
    }
  }

  if (names.has(handoffArchiveName)) {
    failures.push("Mobile handoff archive should not contain itself");
  }
}
