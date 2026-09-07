#!/usr/bin/env sh
set -eu

REPO_URL="${DADKIT_REPO:-https://github.com/YePiXpert/dadkit.git}"
APP_DIR="${DADKIT_DIR:-/opt/dadkit}"
BRANCH="${DADKIT_BRANCH:-main}"
DADKIT_PORT_WAS_SET="${DADKIT_PORT+x}"
DADKIT_PORT_VALUE="${DADKIT_PORT-}"
DADKIT_BIND_ADDRESS_WAS_SET="${DADKIT_BIND_ADDRESS+x}"
DADKIT_BIND_ADDRESS_VALUE="${DADKIT_BIND_ADDRESS-}"
DADKIT_PUBLIC_ORIGIN_WAS_SET="${DADKIT_PUBLIC_ORIGIN+x}"
DADKIT_PUBLIC_ORIGIN_VALUE="${DADKIT_PUBLIC_ORIGIN-}"
DADKIT_TRUSTED_ORIGINS_WAS_SET="${DADKIT_TRUSTED_ORIGINS+x}"
DADKIT_TRUSTED_ORIGINS_VALUE="${DADKIT_TRUSTED_ORIGINS-}"
DADKIT_REQUIRE_HTTPS_WAS_SET="${DADKIT_SYNC_REQUIRE_HTTPS+x}"
DADKIT_REQUIRE_HTTPS_VALUE="${DADKIT_SYNC_REQUIRE_HTTPS-}"
DADKIT_INTERACTIVE="${DADKIT_INTERACTIVE:-auto}"
DADKIT_FORCE_RESET="${DADKIT_FORCE_RESET:-0}"
DADKIT_WAIT_TIMEOUT="${DADKIT_WAIT_TIMEOUT:-120}"
DADKIT_IMAGE="${DADKIT_IMAGE:-ghcr.io/yepixpert/dadkit:latest}"
export DADKIT_IMAGE

# Compose gives shell environment variables precedence over the project's .env.
# Keep an existing deployment configuration authoritative, while still allowing
# first-time callers to seed it through `env DADKIT_...=... docker-deploy.sh`.
unset DADKIT_PORT DADKIT_BIND_ADDRESS DADKIT_PUBLIC_ORIGIN DADKIT_TRUSTED_ORIGINS DADKIT_SYNC_REQUIRE_HTTPS

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

compose() {
  docker compose "$@"
}

start_and_wait() {
  if ! compose pull dadkit; then
    echo "Failed to pull ${DADKIT_IMAGE}. Make the GHCR package public or run docker login ghcr.io, then retry." >&2
    exit 1
  fi

  if compose up -d --no-build --remove-orphans --wait --wait-timeout "$DADKIT_WAIT_TIMEOUT"; then
    return
  fi

  echo "DadKit failed to become healthy within ${DADKIT_WAIT_TIMEOUT}s." >&2
  compose ps >&2 || true
  compose logs --no-color --tail=100 dadkit >&2 || true
  exit 1
}

validate_initial_env_value() {
  carriage_return="$(printf '\r')"
  case "$2" in
    *"
"*|*"$carriage_return"*)
      echo "$1 must not contain a newline." >&2
      exit 1
      ;;
  esac
}

# ---------- 交互式首次配置 ----------
# 没有预置环境变量且终端可用（或 DADKIT_INTERACTIVE=1 强制）时，逐项提问并生成 .env。
# 域名模式保持 127.0.0.1 绑定等反向代理；IP 直连模式绑定 0.0.0.0 并关闭
# HTTPS 强制（HTTP 明文传输，仅建议内网/测试或明确接受风险时使用）。
# curl | sh 方式运行时 stdin 是脚本本身，答案改从 /dev/tty 读取（WIZARD_TTY）。

WIZARD_TTY=""

wizard_read() {
  # $1 = 目标变量名；WIZARD_TTY 非空时从 /dev/tty 读（curl | sh 场景）。
  if [ -n "$WIZARD_TTY" ]; then
    IFS= read -r "$1" < "$WIZARD_TTY"
  else
    IFS= read -r "$1"
  fi
}

strip_origin_input() {
  printf '%s' "$1" | sed -e 's~^[a-zA-Z][a-zA-Z0-9+.-]*://~~' -e 's~/[/:].*$~~' -e 's~:$~~' -e "s~[[:space:]]~~g"
}

valid_port() {
  case "$1" in
    ''|*[!0-9]*) return 1 ;;
  esac
  [ "$1" -ge 1 ] && [ "$1" -le 65535 ]
}

detect_public_ip() {
  if command -v curl >/dev/null 2>&1; then
    ip="$(curl -fsS --max-time 4 https://api.ipify.org 2>/dev/null || true)"
    [ -n "$ip" ] || ip="$(curl -fsS --max-time 4 http://ifconfig.me/ip 2>/dev/null || true)"
  elif command -v wget >/dev/null 2>&1; then
    ip="$(wget -qO- -T 4 http://ifconfig.me/ip 2>/dev/null || true)"
  else
    ip=""
  fi
  printf '%s' "$ip"
}

ask_until_valid() {
  prompt="$1"
  validate="$2"
  while :; do
    # 提示打到 stderr，函数 stdout 只回传答案，供命令替换捕获。
    printf '%s' "$prompt" >&2
    wizard_read answer || exit 1
    if "$validate" "$answer"; then
      printf '%s' "$answer"
      return
    fi
    echo "  输入无效，请重试。" >&2
  done
}

is_nonempty() { [ -n "$1" ]; }
is_yes_or_no() { case "$1" in y|Y|n|N) return 0 ;; *) return 1 ;; esac; }

run_interactive_setup() {
  echo
  echo "==================== DadKit 首次部署配置 ===================="
  echo "两种方式任选："
  echo "  1) 域名 + HTTPS（推荐）——需要你已配好反向代理和证书"
  echo "  2) 无域名，用服务器 IP 直连（HTTP）——零配置，但数据明文传输"
  echo

  mode="$(ask_until_valid '选择部署方式 [1/2]: ' is_1_or_2)"

  if [ "$mode" = "1" ]; then
    domain="$(ask_until_valid '输入域名（如 dadkit.example.com，不用带 https://）: ' is_nonempty)"
    domain="$(strip_origin_input "$domain")"
    WIZARD_PUBLIC_ORIGIN="https://${domain}"
    echo
    echo "反向代理在哪里运行？"
    echo "  1) 和 DadKit 同一台机器（Nginx/Caddy 直接转发到 127.0.0.1）"
    echo "  2) 线路机/隧道回源：反代在其他机器上，要经网络访问本机端口"
    relay="$(ask_until_valid '选择 [1/2]: ' is_1_or_2)"
    if [ "$relay" = "2" ]; then
      WIZARD_BIND_ADDRESS="0.0.0.0"
      relay_note="已选择 0.0.0.0 监听：后端端口将对所有网卡开放且为明文 HTTP，"
      relay_note="$relay_note请在防火墙/安全组只放行线路机（回源机）的 IP，"
      relay_note="$relay_note避免被绕过域名直连。"
    else
      WIZARD_BIND_ADDRESS="127.0.0.1"
      relay_note="容器监听 127.0.0.1:3333，把本机反向代理指向该地址并终止 HTTPS。"
    fi
    WIZARD_PORT="3333"
    WIZARD_REQUIRE_HTTPS="true"
    WIZARD_TRUST_PROXY_HOPS="1"
    final_url="$WIZARD_PUBLIC_ORIGIN"
  else
    port="$(ask_until_valid '对外端口 [直接回车默认 3333]: ' valid_port_or_empty)"
    [ -n "$port" ] || port=3333
    detected="$(detect_public_ip)"
    if [ -n "$detected" ]; then
      echo "检测到本机公网 IP：${detected}"
      default_note="（直接回车使用 ${detected}）"
    else
      default_note=""
    fi
    printf '输入服务器公网 IP%s: ' "$default_note" >&2
    wizard_read addr || exit 1
    [ -n "$addr" ] || addr="$detected"
    addr="$(strip_origin_input "$addr")"
    if [ -z "$addr" ]; then
      echo "未获得可用的服务器地址，已取消。" >&2
      exit 1
    fi
    WIZARD_PUBLIC_ORIGIN="http://${addr}:${port}"
    WIZARD_BIND_ADDRESS="0.0.0.0"
    WIZARD_PORT="$port"
    WIZARD_REQUIRE_HTTPS="false"
    final_url="$WIZARD_PUBLIC_ORIGIN"
  fi

  echo
  echo "-------------------- 配置确认 --------------------"
  echo "  访问地址:        $WIZARD_PUBLIC_ORIGIN"
  echo "  监听地址:        $WIZARD_BIND_ADDRESS:$WIZARD_PORT（容器内固定 3333）"
  echo "  HTTPS 强制同步:  $WIZARD_REQUIRE_HTTPS"
  if [ "$mode" = "1" ]; then
    echo "  信任代理跳数:    ${WIZARD_TRUST_PROXY_HOPS}（反向代理传递真实客户端 IP）"
  fi
  echo "--------------------------------------------------"
  if [ "$mode" = "2" ]; then
    echo "  注意：HTTP 模式下账号 token 与家庭数据在网络上明文传输，"
    echo "  仅建议内网、测试或明确接受该风险时使用。"
    echo "  还需在云厂商安全组 / 防火墙放行 TCP $WIZARD_PORT。"
  else
    echo "  注意：$relay_note"
  fi
  echo

  confirm="$(ask_until_valid '确认写入配置并继续部署？[y/n]: ' is_yes_or_no)"
  case "$confirm" in
    n|N)
      echo "已取消，未写入任何配置。"
      exit 0
      ;;
  esac

  old_umask="$(umask)"
  umask 077
  : > .env
  umask "$old_umask"
  {
    printf 'DADKIT_PORT=%s\n' "$WIZARD_PORT"
    printf 'DADKIT_BIND_ADDRESS=%s\n' "$WIZARD_BIND_ADDRESS"
    printf 'DADKIT_PUBLIC_ORIGIN=%s\n' "$WIZARD_PUBLIC_ORIGIN"
    printf 'DADKIT_SYNC_REQUIRE_HTTPS=%s\n' "$WIZARD_REQUIRE_HTTPS"
    if [ -n "${WIZARD_TRUST_PROXY_HOPS:-}" ]; then
      printf 'DADKIT_TRUST_PROXY_HOPS=%s\n' "$WIZARD_TRUST_PROXY_HOPS"
    fi
  } >> .env
  chmod 600 .env
  echo "已创建 $APP_DIR/.env"
  WIZARD_FINAL_URL="$final_url"
}

is_1_or_2() { case "$1" in 1|2) return 0 ;; *) return 1 ;; esac; }
valid_port_or_empty() { [ -z "$1" ] || valid_port "$1"; }

write_initial_env() {
  if [ -e .env ] || [ -L .env ]; then
    return
  fi

  if [ -z "$DADKIT_PORT_WAS_SET$DADKIT_BIND_ADDRESS_WAS_SET$DADKIT_PUBLIC_ORIGIN_WAS_SET$DADKIT_TRUSTED_ORIGINS_WAS_SET$DADKIT_REQUIRE_HTTPS_WAS_SET" ]; then
    return
  fi

  validate_initial_env_value DADKIT_PORT "$DADKIT_PORT_VALUE"
  validate_initial_env_value DADKIT_BIND_ADDRESS "$DADKIT_BIND_ADDRESS_VALUE"
  validate_initial_env_value DADKIT_PUBLIC_ORIGIN "$DADKIT_PUBLIC_ORIGIN_VALUE"
  validate_initial_env_value DADKIT_TRUSTED_ORIGINS "$DADKIT_TRUSTED_ORIGINS_VALUE"
  validate_initial_env_value DADKIT_SYNC_REQUIRE_HTTPS "$DADKIT_REQUIRE_HTTPS_VALUE"

  old_umask="$(umask)"
  umask 077
  : > .env
  umask "$old_umask"

  if [ -n "$DADKIT_PORT_WAS_SET" ]; then
    printf 'DADKIT_PORT=%s\n' "$DADKIT_PORT_VALUE" >> .env
  fi
  if [ -n "$DADKIT_BIND_ADDRESS_WAS_SET" ]; then
    printf 'DADKIT_BIND_ADDRESS=%s\n' "$DADKIT_BIND_ADDRESS_VALUE" >> .env
  fi
  if [ -n "$DADKIT_PUBLIC_ORIGIN_WAS_SET" ]; then
    printf 'DADKIT_PUBLIC_ORIGIN=%s\n' "$DADKIT_PUBLIC_ORIGIN_VALUE" >> .env
  fi
  if [ -n "$DADKIT_TRUSTED_ORIGINS_WAS_SET" ]; then
    printf 'DADKIT_TRUSTED_ORIGINS=%s\n' "$DADKIT_TRUSTED_ORIGINS_VALUE" >> .env
  fi
  if [ -n "$DADKIT_REQUIRE_HTTPS_WAS_SET" ]; then
    printf 'DADKIT_SYNC_REQUIRE_HTTPS=%s\n' "$DADKIT_REQUIRE_HTTPS_VALUE" >> .env
  fi

  chmod 600 .env
  echo "Created $APP_DIR/.env from the explicitly supplied deployment settings."
}

maybe_interactive_setup() {
  [ -e .env ] || [ -L .env ] && return 0
  [ -z "$DADKIT_PORT_WAS_SET$DADKIT_BIND_ADDRESS_WAS_SET$DADKIT_PUBLIC_ORIGIN_WAS_SET$DADKIT_TRUSTED_ORIGINS_WAS_SET$DADKIT_REQUIRE_HTTPS_WAS_SET" ] || return 0

  case "$DADKIT_INTERACTIVE" in
    0)
      return 0
      ;;
    1)
      # 测试/脚本化：强制进入向导，答案从 stdin 读。
      WIZARD_TTY=""
      run_interactive_setup
      return 0
      ;;
  esac

  # auto：直接运行时 stdin 是终端；curl | sh 时 stdin 是脚本管道，
  # 改从 /dev/tty 读取答案；两者都不可用（CI/无终端）则跳过向导。
  if [ -t 0 ]; then
    WIZARD_TTY=""
    run_interactive_setup
  elif ( : ) < /dev/tty 2>/dev/null; then
    WIZARD_TTY="/dev/tty"
    run_interactive_setup
  fi
}

sync_repo() {
  git fetch origin "$BRANCH"
  git checkout "$BRANCH"

  if [ "$DADKIT_FORCE_RESET" = "1" ]; then
    git reset --hard "origin/$BRANCH"
  else
    git pull --ff-only origin "$BRANCH" || {
      echo "Fast-forward update failed. If this deploy directory has no local changes and you want to match origin/$BRANCH exactly, rerun with DADKIT_FORCE_RESET=1." >&2
      exit 1
    }
  fi
}

need git
need docker

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose v2 is required. Please install Docker with the compose plugin." >&2
  exit 1
fi

if [ -d "$APP_DIR/.git" ]; then
  cd "$APP_DIR"
  git remote set-url origin "$REPO_URL"
  sync_repo
else
  mkdir -p "$(dirname "$APP_DIR")"
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

maybe_interactive_setup
write_initial_env
start_and_wait

PUBLISHED_ENDPOINT="$(compose port dadkit 3333 2>/dev/null || true)"
if [ -n "${WIZARD_FINAL_URL:-}" ]; then
  echo "DadKit 已启动，访问地址：$WIZARD_FINAL_URL"
  echo "健康检查：$WIZARD_FINAL_URL/healthz"
elif [ -n "$PUBLISHED_ENDPOINT" ]; then
  echo "DadKit is listening at $PUBLISHED_ENDPOINT; configure an HTTPS reverse proxy before public access."
  echo "Health check: http://${PUBLISHED_ENDPOINT}/healthz"
else
  echo "DadKit started, but Docker Compose did not report a published endpoint."
fi
echo "提示：官方 APK/IPA 内置的同步地址是官方服务器；要让 App 连接这台自建服务器，"
echo "需要以 DADKIT_PUBLIC_ORIGIN 指向本机重新构建（README「静态导出部署」）。浏览器访问不受影响。"
compose ps
