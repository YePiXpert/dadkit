#!/bin/sh
# 把 Android 安装包发布到本服务器(家庭同步同一个容器的数据卷)。
# 用法:
#   sh scripts/release-apk.sh <apk路径> <versionCode> <versionName> [更新说明]
# 例:
#   sh scripts/release-apk.sh ~/dadkit-1.3.apk 4 1.3 "支持应用内检查更新"
# 发布后,旧版 App 下次打开会弹"发现新版本,是否升级"。
set -eu

APK_PATH=${1:-}
VERSION_CODE=${2:-}
VERSION_NAME=${3:-}
NOTES=${4:-}
CONTAINER=${DADKIT_CONTAINER:-dadkit-dadkit-1}
DATA_DIR=${DADKIT_DATA_DIR:-/app/data}

if [ -z "$APK_PATH" ] || [ -z "$VERSION_CODE" ] || [ -z "$VERSION_NAME" ]; then
  echo "用法: sh scripts/release-apk.sh <apk路径> <versionCode> <versionName> [更新说明]" >&2
  exit 1
fi

if [ ! -f "$APK_PATH" ]; then
  echo "找不到安装包: $APK_PATH" >&2
  exit 1
fi

TMP_JSON=$(mktemp)
trap 'rm -f "$TMP_JSON"' EXIT

printf '{"versionCode":%s,"versionName":"%s","notes":"%s","url":"/api/app-version/apk"}\n' \
  "$VERSION_CODE" "$VERSION_NAME" "$NOTES" > "$TMP_JSON"

docker cp "$APK_PATH" "$CONTAINER:$DATA_DIR/dadkit-latest.apk"
docker cp "$TMP_JSON" "$CONTAINER:$DATA_DIR/app-release.json"

echo "已发布 Android $VERSION_NAME (versionCode $VERSION_CODE)。旧版 App 下次打开将提示升级。"
