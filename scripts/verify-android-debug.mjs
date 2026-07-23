import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

import {
  APP_NAME,
  APP_VERSION,
  ANDROID_DEBUG_APK,
  ANDROID_DEBUG_APK_RELATIVE,
  ANDROID_PACKAGE_ID,
  getAndroidBuildToolPath,
  withMobileBuildEnv,
} from "./mobile-env.mjs";

const EXPECTED_MIN_SDK = "24";
const EXPECTED_TARGET_SDK = "36";
const EXPECTED_VERSION_CODE = "2";

if (!existsSync(ANDROID_DEBUG_APK)) {
  console.error(
    `Android debug APK not found at ${ANDROID_DEBUG_APK}. Run npm run mobile:android:debug first.`,
  );
  process.exit(1);
}

const env = withMobileBuildEnv(process.env);
const aapt = getAndroidBuildToolPath("aapt", env);
const apksigner = getAndroidBuildToolPath("apksigner", env);
const badging = run(aapt, ["dump", "badging", ANDROID_DEBUG_APK_RELATIVE], env)
  .stdout;
const signature = run(
  apksigner,
  ["verify", "--verbose", ANDROID_DEBUG_APK_RELATIVE],
  env,
).stdout;

assertIncludes(badging, `package: name='${ANDROID_PACKAGE_ID}'`);
assertIncludes(badging, `versionCode='${EXPECTED_VERSION_CODE}'`);
assertIncludes(badging, `versionName='${APP_VERSION}'`);
assertIncludes(badging, `application-label:'${APP_NAME}'`);
assertIncludes(badging, `sdkVersion:'${EXPECTED_MIN_SDK}'`);
assertIncludes(badging, `targetSdkVersion:'${EXPECTED_TARGET_SDK}'`);
assertIncludes(signature, "Verifies");
assertIncludes(signature, "Verified using v2 scheme (APK Signature Scheme v2): true");

console.log(`Verified ${ANDROID_DEBUG_APK}`);
console.log(`Package: ${ANDROID_PACKAGE_ID}`);
console.log(`Version: ${APP_VERSION} (code ${EXPECTED_VERSION_CODE})`);
console.log(`Label: ${APP_NAME}`);
console.log(`SDK: min ${EXPECTED_MIN_SDK}, target ${EXPECTED_TARGET_SDK}`);
console.log("Signature: APK Signature Scheme v2");

function run(command, args, env) {
  const commandArgs = command.endsWith(".bat")
    ? ["/d", "/c", command, ...args]
    : args;
  const result = spawnSync(command.endsWith(".bat") ? process.env.ComSpec ?? "cmd.exe" : command, commandArgs, {
    encoding: "utf8",
    env,
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.stdout.write(result.stdout);
    process.exit(result.status ?? 1);
  }

  return result;
}

function assertIncludes(value, expected) {
  if (!value.includes(expected)) {
    console.error(`Expected APK verification output to include: ${expected}`);
    process.exit(1);
  }
}
