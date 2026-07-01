import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import {
  APP_NAME,
  APP_VERSION,
  IOS_APP_DIR,
  IOS_BUNDLE_ID,
  IOS_PROJECT_DIR,
  IOS_XCODE_PROJECT,
} from "./mobile-env.mjs";

const EXPECTED_BUILD = "1";
const REQUIRED_FILES = [
  IOS_XCODE_PROJECT,
  join(IOS_APP_DIR, "Info.plist"),
  join(IOS_APP_DIR, "capacitor.config.json"),
  join(IOS_APP_DIR, "public", "index.html"),
  join(IOS_APP_DIR, "Assets.xcassets", "AppIcon.appiconset", "AppIcon-512@2x.png"),
  join(IOS_APP_DIR, "Assets.xcassets", "Splash.imageset", "Contents.json"),
];

for (const file of REQUIRED_FILES) {
  assertFile(file);
}

const capacitorConfig = JSON.parse(
  readFileSync(join(IOS_APP_DIR, "capacitor.config.json"), "utf8"),
);
const project = readFileSync(
  join(IOS_XCODE_PROJECT, "project.pbxproj"),
  "utf8",
);
const infoPlist = readFileSync(join(IOS_APP_DIR, "Info.plist"), "utf8");

assertEqual(capacitorConfig.appId, IOS_BUNDLE_ID, "Capacitor appId");
assertEqual(capacitorConfig.appName, APP_NAME, "Capacitor appName");
assertEqual(capacitorConfig.webDir, "out", "Capacitor webDir");
assertIncludes(project, `PRODUCT_BUNDLE_IDENTIFIER = ${IOS_BUNDLE_ID};`);
assertIncludes(project, `MARKETING_VERSION = ${APP_VERSION};`);
assertIncludes(project, `CURRENT_PROJECT_VERSION = ${EXPECTED_BUILD};`);
assertIncludes(infoPlist, `<string>${APP_NAME}</string>`);
assertIncludes(infoPlist, "<string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>");
assertIncludes(infoPlist, "<string>$(MARKETING_VERSION)</string>");
assertIncludes(infoPlist, "<string>$(CURRENT_PROJECT_VERSION)</string>");

console.log(`Verified iOS handoff project at ${IOS_PROJECT_DIR}`);
console.log(`Bundle: ${IOS_BUNDLE_ID}`);
console.log(`Version: ${APP_VERSION} (${EXPECTED_BUILD})`);
console.log(`Name: ${APP_NAME}`);

const xcodebuild = spawnSync("xcodebuild", ["-version"], {
  encoding: "utf8",
});

if (xcodebuild.status === 0) {
  console.log(`Xcode: ${xcodebuild.stdout.trim().split(/\r?\n/).join(" / ")}`);
} else {
  console.log(
    "Xcode archive not attempted here; use macOS with Xcode and Apple signing credentials for TestFlight upload.",
  );
}

function assertFile(file) {
  if (!existsSync(file)) {
    console.error(`Expected iOS handoff file to exist: ${file}`);
    process.exit(1);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    console.error(`${label} expected ${expected}, received ${String(actual)}`);
    process.exit(1);
  }
}

function assertIncludes(value, expected) {
  if (!value.includes(expected)) {
    console.error(`Expected iOS handoff output to include: ${expected}`);
    process.exit(1);
  }
}
