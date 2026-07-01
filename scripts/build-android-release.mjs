import { existsSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";

import { withMobileBuildEnv } from "./mobile-env.mjs";

const target = process.argv[2] ?? "apk";
const androidDir = join(process.cwd(), "android");
const gradleCommand = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
const gradlePath = join(androidDir, gradleCommand);
const releaseTasks = {
  apk: ["assembleRelease"],
  aab: ["bundleRelease"],
  both: ["assembleRelease", "bundleRelease"],
};

if (!releaseTasks[target]) {
  console.error("Usage: node scripts/build-android-release.mjs [apk|aab|both]");
  process.exit(1);
}

if (!existsSync(gradlePath)) {
  console.error(
    "Android project is missing. Run `npm run mobile:sync` before building release artifacts.",
  );
  process.exit(1);
}

const requiredEnv = [
  "DADKIT_ANDROID_KEYSTORE_PATH",
  "DADKIT_ANDROID_KEYSTORE_PASSWORD",
  "DADKIT_ANDROID_KEY_ALIAS",
  "DADKIT_ANDROID_KEY_PASSWORD",
];
const missing = requiredEnv.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`Missing required Android release signing variable(s): ${missing.join(", ")}`);
  console.error("Keep keystore files and passwords outside the repository.");
  process.exit(1);
}

if (!existsSync(process.env.DADKIT_ANDROID_KEYSTORE_PATH)) {
  console.error("DADKIT_ANDROID_KEYSTORE_PATH does not point to an existing file.");
  process.exit(1);
}

const env = withMobileBuildEnv(process.env);
const tasks = releaseTasks[target];
const child =
  process.platform === "win32"
    ? spawn(
        process.env.ComSpec ?? "cmd.exe",
        ["/d", "/s", "/c", ["gradlew.bat", ...tasks].join(" ")],
        {
          cwd: androidDir,
          env,
          stdio: "inherit",
        },
      )
    : spawn(gradleCommand, tasks, {
        cwd: androidDir,
        env,
        stdio: "inherit",
      });

child.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
