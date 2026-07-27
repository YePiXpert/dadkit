#!/bin/sh
# Publish a verified APK into DadKit's persistent data directory.
# Usage:
#   sh scripts/release-apk.sh <apk-path> <versionCode> <versionName> [notes]
set -eu

APK_PATH=${1:-}
VERSION_CODE=${2:-}
VERSION_NAME=${3:-}
NOTES=${4:-}
CONTAINER=${DADKIT_CONTAINER:-dadkit-dadkit-1}
DATA_DIR=${DADKIT_DATA_DIR:-/app/data}

if [ -z "$APK_PATH" ] || [ -z "$VERSION_CODE" ] || [ -z "$VERSION_NAME" ]; then
  echo "Usage: sh scripts/release-apk.sh <apk-path> <versionCode> <versionName> [notes]" >&2
  exit 1
fi

case "$VERSION_CODE" in
  *[!0-9]*|'')
    echo "versionCode must be a positive integer." >&2
    exit 1
    ;;
esac

if [ "$VERSION_CODE" -lt 1 ]; then
  echo "versionCode must be a positive integer." >&2
  exit 1
fi

if [ ! -f "$APK_PATH" ]; then
  echo "APK not found: $APK_PATH" >&2
  exit 1
fi

if command -v sha256sum >/dev/null 2>&1; then
  APK_SHA256=$(sha256sum "$APK_PATH" | awk '{print $1}')
elif command -v shasum >/dev/null 2>&1; then
  APK_SHA256=$(shasum -a 256 "$APK_PATH" | awk '{print $1}')
else
  echo "sha256sum or shasum is required." >&2
  exit 1
fi

APK_SIZE=$(wc -c < "$APK_PATH" | tr -d '[:space:]')
CONTAINER_UPLOAD_TMP="/tmp/.dadkit-${VERSION_CODE}-$$.apk.tmp"

docker cp "$APK_PATH" "$CONTAINER:$CONTAINER_UPLOAD_TMP"
docker exec --user 0 "$CONTAINER" sh -c \
  'chmod 644 "$1"' sh "$CONTAINER_UPLOAD_TMP"

if ! docker exec -i \
  -e "DADKIT_RELEASE_VERSION_CODE=$VERSION_CODE" \
  -e "DADKIT_RELEASE_VERSION_NAME=$VERSION_NAME" \
  -e "DADKIT_RELEASE_NOTES=$NOTES" \
  -e "DADKIT_RELEASE_SHA256=$APK_SHA256" \
  -e "DADKIT_RELEASE_SIZE=$APK_SIZE" \
  -e "DADKIT_RELEASE_UPLOAD_APK=$CONTAINER_UPLOAD_TMP" \
  -e "DADKIT_RELEASE_DATA_DIR=$DATA_DIR" \
  "$CONTAINER" node <<'NODE'
const { createReadStream } = require("node:fs");
const {
  access,
  chmod,
  copyFile,
  readFile,
  rename,
  stat,
  unlink,
  writeFile,
} = require("node:fs/promises");
const { createHash, randomBytes } = require("node:crypto");
const path = require("node:path");

async function digest(file) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(file);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

async function main() {
  const versionCode = Number(process.env.DADKIT_RELEASE_VERSION_CODE);
  const versionName = process.env.DADKIT_RELEASE_VERSION_NAME || "";
  const notes = process.env.DADKIT_RELEASE_NOTES || "";
  const expectedSha = process.env.DADKIT_RELEASE_SHA256 || "";
  const expectedSize = Number(process.env.DADKIT_RELEASE_SIZE);
  const uploadApk = process.env.DADKIT_RELEASE_UPLOAD_APK || "";
  const dataDir = process.env.DADKIT_RELEASE_DATA_DIR || "";
  const manifestPath = path.join(dataDir, "app-release.json");
  const apkFile = `dadkit-${versionCode}.apk`;
  const finalApk = path.join(dataDir, apkFile);
  const stagedApk = path.join(
    dataDir,
    `.${apkFile}.${randomBytes(8).toString("hex")}.tmp`,
  );
  const tempManifest = `${manifestPath}.${randomBytes(8).toString("hex")}.tmp`;

  if (
    !Number.isSafeInteger(versionCode) ||
    versionCode < 1 ||
    !versionName ||
    versionName.length > 64 ||
    notes.length > 8000 ||
    !/^[0-9a-f]{64}$/.test(expectedSha) ||
    !Number.isSafeInteger(expectedSize) ||
    expectedSize < 1
  ) {
    throw new Error("Invalid release metadata.");
  }

  try {
    const current = JSON.parse(await readFile(manifestPath, "utf8"));
    if (!Number.isSafeInteger(current.versionCode) || current.versionCode < 1) {
      throw new Error("Existing release manifest is invalid.");
    }
    if (versionCode <= current.versionCode) {
      throw new Error(
        `versionCode ${versionCode} must be greater than ${current.versionCode}.`,
      );
    }
  } catch (error) {
    if (error && error.code === "ENOENT") {
      // First publication: no existing manifest is expected.
    } else {
      throw error;
    }
  }

  try {
    await access(finalApk);
    throw new Error(`Refusing to reuse existing ${apkFile}.`);
  } catch (error) {
    if (!error || error.code !== "ENOENT") {
      throw error;
    }
  }

  const actual = await stat(uploadApk);
  const actualSha = await digest(uploadApk);
  if (!actual.isFile() || actual.size !== expectedSize || actualSha !== expectedSha) {
    throw new Error("Copied APK size or SHA-256 does not match.");
  }

  const manifest = {
    versionCode,
    versionName,
    notes,
    size: actual.size,
    sha256: actualSha,
    publishedAt: new Date().toISOString(),
    apkFile,
  };

  try {
    // The upload is owned by Docker's root user in /tmp. Copying it into the
    // mounted data directory as nextjs preserves cap_drop: ALL while keeping
    // the final asset private and allowing same-volume atomic publication.
    await copyFile(uploadApk, stagedApk);
    await chmod(stagedApk, 0o600);
    await rename(stagedApk, finalApk);
    await chmod(finalApk, 0o600);
    await writeFile(tempManifest, `${JSON.stringify(manifest)}\n`, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
    await rename(tempManifest, manifestPath);
    await chmod(manifestPath, 0o600);
  } catch (error) {
    await unlink(stagedApk).catch(() => undefined);
    await unlink(finalApk).catch(() => undefined);
    throw error;
  } finally {
    await unlink(tempManifest).catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
NODE
then
  docker exec --user 0 "$CONTAINER" rm -f "$CONTAINER_UPLOAD_TMP" >/dev/null 2>&1 || true
  exit 1
fi

docker exec --user 0 "$CONTAINER" rm -f "$CONTAINER_UPLOAD_TMP"

echo "Published Android $VERSION_NAME (versionCode $VERSION_CODE, sha256 $APK_SHA256)."
