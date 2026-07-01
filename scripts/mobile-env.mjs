import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const packageJson = JSON.parse(
  readFileSync(join(process.cwd(), "package.json"), "utf8"),
);

export const APP_NAME = "DadKit";
export const APP_VERSION = packageJson.version;
export const ANDROID_PACKAGE_ID = "com.yepixpert.dadkit";
export const ANDROID_MAIN_ACTIVITY = `${ANDROID_PACKAGE_ID}/.MainActivity`;
export const ANDROID_DEBUG_APK_RELATIVE = join(
  "android",
  "app",
  "build",
  "outputs",
  "apk",
  "debug",
  "app-debug.apk",
);
export const ANDROID_DEBUG_APK = join(
  process.cwd(),
  ANDROID_DEBUG_APK_RELATIVE,
);
export const IOS_BUNDLE_ID = ANDROID_PACKAGE_ID;
export const IOS_PROJECT_DIR = join(process.cwd(), "ios", "App");
export const IOS_XCODE_PROJECT = join(IOS_PROJECT_DIR, "App.xcodeproj");
export const IOS_APP_DIR = join(IOS_PROJECT_DIR, "App");

export function withMobileBuildEnv(env = process.env) {
  return withDetectedJavaHome(withDetectedAndroidHome(env));
}

export function getAdbPath(env = process.env) {
  const sdkRoot = detectAndroidSdkRoot(env);
  const executable = process.platform === "win32" ? "adb.exe" : "adb";

  return sdkRoot ? join(sdkRoot, "platform-tools", executable) : executable;
}

export function getAndroidBuildToolPath(toolName, env = process.env) {
  const sdkRoot = detectAndroidSdkRoot(env);

  if (!sdkRoot) {
    return toolName;
  }

  const buildToolsDir = join(sdkRoot, "build-tools");

  if (!existsSync(buildToolsDir)) {
    return toolName;
  }

  const latestVersion = readdirSync(buildToolsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort(compareVersions)
    .at(-1);

  if (!latestVersion) {
    return toolName;
  }

  const extension = process.platform === "win32" && toolName !== "aapt" ? ".bat" : process.platform === "win32" ? ".exe" : "";

  return join(buildToolsDir, latestVersion, `${toolName}${extension}`);
}

export function detectAndroidSdkRoot(env = process.env) {
  const explicit = env.ANDROID_HOME ?? env.ANDROID_SDK_ROOT;

  if (explicit && existsSync(explicit)) {
    return explicit;
  }

  if (process.platform !== "win32") {
    return undefined;
  }

  const localSdk = join(env.LOCALAPPDATA ?? "", "Android", "Sdk");

  return existsSync(join(localSdk, "platforms")) ? localSdk : undefined;
}

function withDetectedAndroidHome(env) {
  const sdkRoot = detectAndroidSdkRoot(env);

  if (!sdkRoot) {
    return env;
  }

  return {
    ...env,
    ANDROID_HOME: env.ANDROID_HOME ?? sdkRoot,
    ANDROID_SDK_ROOT: env.ANDROID_SDK_ROOT ?? sdkRoot,
  };
}

function withDetectedJavaHome(env) {
  if (env.JAVA_HOME || process.platform !== "win32") {
    return env;
  }

  const javaHome = findWindowsJdk(["21", "17"]);

  if (!javaHome) {
    return env;
  }

  return {
    ...env,
    JAVA_HOME: javaHome,
    Path: `${join(javaHome, "bin")};${env.Path ?? env.PATH ?? ""}`,
  };
}

function findWindowsJdk(versions) {
  const roots = [
    join(process.env.LOCALAPPDATA ?? "", "Programs", "Eclipse Adoptium"),
    "C:\\Program Files\\Eclipse Adoptium",
    "C:\\Program Files\\Java",
  ];

  for (const version of versions) {
    const javaHome = findWindowsJdkVersion(roots, version);

    if (javaHome) {
      return javaHome;
    }
  }

  return undefined;
}

function findWindowsJdkVersion(roots, version) {
  for (const root of roots) {
    if (!existsSync(root)) {
      continue;
    }

    const match = readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.includes(version))
      .map((entry) => join(root, entry.name))
      .find((candidate) => existsSync(join(candidate, "bin", "java.exe")));

    if (match) {
      return match;
    }
  }

  return undefined;
}

function compareVersions(left, right) {
  return left.localeCompare(right, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}
