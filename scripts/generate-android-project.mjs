import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  ConsoleLog,
  TwaGenerator,
  TwaManifest,
} from "@bubblewrap/core";

const targetDirectory = path.resolve(process.cwd(), "android");
const manifestPath = path.join(targetDirectory, "twa-manifest.json");
const manifest = await TwaManifest.fromFile(manifestPath);
const generator = new TwaGenerator();

await generator.createTwaProject(
  targetDirectory,
  manifest,
  new ConsoleLog("android-project"),
);

await patchText(path.join(targetDirectory, "build.gradle"), (source) =>
  source.replaceAll("jcenter()", "mavenCentral()"),
);
await patchText(path.join(targetDirectory, "app", "build.gradle"),
  applyReleaseSigningConfiguration,
);
await patchText(
  path.join(targetDirectory, "app", "src", "main", "AndroidManifest.xml"),
  (source) => source.replace(/\r?\n\s+package="[^"]+"/, ""),
);

const checksum = createHash("sha1")
  .update(await readFile(manifestPath))
  .digest("hex");

await writeFile(
  path.join(targetDirectory, "manifest-checksum.txt"),
  `${checksum}\n`,
  "utf8",
);

console.log("Generated reproducible Bubblewrap Android project.");

async function patchText(filePath, patch) {
  const source = await readFile(filePath, "utf8");
  const next = patch(source);

  if (next === source) return;
  await writeFile(filePath, next, "utf8");
}

function applyReleaseSigningConfiguration(source) {
  const signingEnvironment = `
def releaseKeystorePath = System.getenv("ANDROID_KEYSTORE_PATH")
def releaseKeystorePassword = System.getenv("ANDROID_KEYSTORE_PASSWORD")
def releaseKeyPassword = System.getenv("ANDROID_KEY_PASSWORD")
def releaseKeyAlias = System.getenv("ANDROID_KEY_ALIAS") ?: "dadkit"
def hasReleaseSigning = releaseKeystorePath && releaseKeystorePassword && releaseKeyPassword
`;
  const signingConfig = `
    signingConfigs {
        if (hasReleaseSigning) {
            release {
                storeFile file(releaseKeystorePath)
                storePassword releaseKeystorePassword
                keyAlias releaseKeyAlias
                keyPassword releaseKeyPassword
            }
        }
    }
`;
  const unsignedRelease = `    buildTypes {
        release {
            minifyEnabled true
        }
    }`;
  const signedRelease = `${signingConfig}    buildTypes {
        release {
            minifyEnabled true
            if (hasReleaseSigning) {
                signingConfig signingConfigs.release
            }
        }
    }`;
  let next = source;

  if (!next.includes("def releaseKeystorePath")) {
    const plugins = `plugins {
    id 'com.android.application'
}`;
    if (!next.includes(plugins)) {
      throw new Error("Unexpected Bubblewrap app Gradle plugins block.");
    }
    next = next.replace(plugins, `${plugins}${signingEnvironment}`);
  }

  if (!next.includes("signingConfigs.release")) {
    if (!next.includes(unsignedRelease)) {
      throw new Error("Unexpected Bubblewrap app Gradle release block.");
    }
    next = next.replace(unsignedRelease, signedRelease);
  }

  return next;
}
