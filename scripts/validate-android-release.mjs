import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const expected = {
  tag: "v3.4.1",
  versionName: "3.4.1",
  versionCode: 14,
  packageId: "com.dadkit.mobile",
  host: "https://dadkit.505f.com",
};
const tag = process.env.GITHUB_REF_NAME || process.argv[2];

const packageJson = await readJson("package.json");
const packageLock = await readJson("package-lock.json");
const gradle = await readText("android/app/build.gradle");
const manifest = await readText("android/app/src/main/AndroidManifest.xml");
const activity = await readText("android/app/src/main/java/com/dadkit/mobile/MainActivity.kt");
const app = await readText("android/app/src/main/java/com/dadkit/mobile/ui/DadKitApp.kt");
const repository = await readText("android/app/src/main/java/com/dadkit/mobile/data/DadKitRepository.kt");
const syncClient = await readText("android/app/src/main/java/com/dadkit/mobile/sync/NativeSyncClient.kt");
const merger = await readText("android/app/src/main/java/com/dadkit/mobile/sync/JsonDocumentMerger.kt");
const nativeChecklist = await readJson("android/app/src/main/assets/default_checklist.json");
const androidSources = [activity, app, repository, syncClient, merger].join("\n");

assert(packageJson.version === expected.versionName, "package.json version");
assert(!packageJson.devDependencies?.["@bubblewrap/cli"], "Bubblewrap dependency must be absent");
assert(!packageLock.packages?.[""]?.devDependencies?.["@bubblewrap/cli"], "Bubblewrap lock entry must be absent");
assert(gradle.includes(`applicationId "${expected.packageId}"`), "Gradle applicationId");
assert(gradle.includes(`versionCode ${expected.versionCode}`), "Gradle versionCode");
assert(gradle.includes(`versionName "${expected.versionName}"`), "Gradle versionName");
assert(gradle.includes("org.jetbrains.kotlin.plugin.compose"), "Compose compiler plugin");
assert(gradle.includes("androidx.compose.material3:material3"), "Material 3 dependency");
assert(gradle.includes(expected.host), "default family sync host");
assert(manifest.includes("android.permission.INTERNET"), "Internet permission");
assert(manifest.includes('android:name=".MainActivity"'), "native launcher activity");
assert(manifest.includes('android:allowBackup="false"'), "private app data");
assert(activity.includes(": ComponentActivity()"), "Compose activity");
assert(activity.includes("setContent"), "Compose content root");
assert(app.includes('BottomDestination(Screen.HOME, "首页"'), "native bottom navigation");
assert(app.includes('BottomDestination(Screen.CHECKLIST, "清单"'), "native checklist destination");
assert(app.includes('BottomDestination(Screen.BABY, "宝宝"'), "native baby destination");
assert(app.includes("ActivityResultContracts.CreateDocument"), "Android backup document picker");
assert(syncClient.includes('"/api/sync/pull"'), "native family sync pull");
assert(syncClient.includes('"/api/sync/push"'), "native family sync push");
assert(syncClient.includes('"Authorization", "Bearer $token"'), "native bearer session");
assert(merger.includes("mergeEntityArrays"), "entity-level native merge");
assert(Array.isArray(nativeChecklist) && nativeChecklist.length === 144, "144 native checklist items");
assert(!androidSources.includes("WebView"), "WebView must not exist in native Android sources");
assert(!app.match(/\bv9\b|数据版本|协议版本/i), "internal compatibility terms must not appear in Android UI");

for (const retiredPath of [
  "android/app/src/main/java/com/dadkit/mobile/LauncherActivity.java",
  "android/app/src/main/assets/www",
  "android/twa-manifest.json",
  "android/twa-manifest.example.json",
  "scripts/build-android-web.mjs",
  "scripts/generate-android-project.mjs",
]) {
  await assertMissing(retiredPath);
}

if (tag) assert(tag === expected.tag, `release tag must be ${expected.tag}`);

console.log(
  `Validated native Android APK ${expected.tag}: ${expected.packageId}, versionCode ${expected.versionCode}, ${nativeChecklist.length} checklist items.`,
);

async function readJson(relativePath) {
  return JSON.parse(await readText(relativePath));
}

async function readText(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

async function assertMissing(relativePath) {
  try {
    await access(path.join(root, relativePath));
  } catch {
    return;
  }
  throw new Error(`Android release validation failed: ${relativePath} still exists.`);
}

function assert(condition, label) {
  if (!condition) throw new Error(`Android release validation failed: ${label}.`);
}
