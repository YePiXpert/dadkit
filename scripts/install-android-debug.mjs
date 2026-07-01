import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

import {
  ANDROID_DEBUG_APK,
  ANDROID_DEBUG_APK_RELATIVE,
  ANDROID_MAIN_ACTIVITY,
  getAdbPath,
  withMobileBuildEnv,
} from "./mobile-env.mjs";

if (!existsSync(ANDROID_DEBUG_APK)) {
  console.error(
    `Android debug APK not found at ${ANDROID_DEBUG_APK}. Run npm run mobile:android:debug first.`,
  );
  process.exit(1);
}

const env = withMobileBuildEnv(process.env);
const adb = getAdbPath(env);
const devicesOutput = run(adb, ["devices", "-l"], env).stdout;
const devices = parseDevices(devicesOutput);
const serial = process.env.ANDROID_SERIAL ?? pickDevice(devices);

if (!serial) {
  console.error("No authorized Android device or emulator is connected.");
  console.error("Connect a device with USB debugging enabled, then run this command again.");
  process.exit(2);
}

console.log(`Installing ${ANDROID_DEBUG_APK} on ${serial}...`);
run(adb, ["-s", serial, "install", "-r", ANDROID_DEBUG_APK_RELATIVE], env, true);

console.log(`Launching ${ANDROID_MAIN_ACTIVITY}...`);
run(adb, ["-s", serial, "shell", "am", "start", "-n", ANDROID_MAIN_ACTIVITY], env, true);

function parseDevices(output) {
  return output
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [serial, state] = line.split(/\s+/);
      return { serial, state };
    })
    .filter((device) => device.state === "device");
}

function pickDevice(devices) {
  if (devices.length === 1) {
    return devices[0].serial;
  }

  if (devices.length > 1) {
    console.error("Multiple Android devices are connected.");
    console.error("Set ANDROID_SERIAL to choose one, then run this command again.");
  }

  return undefined;
}

function run(command, args, env, inherit = false) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    env,
    stdio: inherit ? "inherit" : "pipe",
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    if (!inherit) {
      process.stderr.write(result.stderr);
      process.stdout.write(result.stdout);
    }

    process.exit(result.status ?? 1);
  }

  return result;
}
