#!/usr/bin/env sh
set -eu

APP_DIR="${DADKIT_DIR:-/opt/dadkit}"
BRANCH="${DADKIT_BRANCH:-main}"
DADKIT_PORT_WAS_SET="${DADKIT_PORT+x}"
DADKIT_PORT_VALUE="${DADKIT_PORT-}"
DADKIT_BIND_ADDRESS_WAS_SET="${DADKIT_BIND_ADDRESS+x}"
DADKIT_BIND_ADDRESS_VALUE="${DADKIT_BIND_ADDRESS-}"
DADKIT_PUBLIC_ORIGIN_WAS_SET="${DADKIT_PUBLIC_ORIGIN+x}"
DADKIT_PUBLIC_ORIGIN_VALUE="${DADKIT_PUBLIC_ORIGIN-}"
DADKIT_WEBDAV_PROXY_ALLOWED_HOSTS_WAS_SET="${DADKIT_WEBDAV_PROXY_ALLOWED_HOSTS+x}"
DADKIT_WEBDAV_PROXY_ALLOWED_HOSTS_VALUE="${DADKIT_WEBDAV_PROXY_ALLOWED_HOSTS-}"
DADKIT_FORCE_RESET="${DADKIT_FORCE_RESET:-0}"
DADKIT_WAIT_TIMEOUT="${DADKIT_WAIT_TIMEOUT:-120}"
DADKIT_IMAGE="${DADKIT_IMAGE:-ghcr.io/yepixpert/dadkit:latest}"
export DADKIT_IMAGE

# Compose gives shell environment variables precedence over the project's .env.
# Keep an existing deployment configuration authoritative, while still allowing
# first-time callers to seed it through `env DADKIT_...=... docker-upgrade.sh`.
unset DADKIT_PORT DADKIT_BIND_ADDRESS DADKIT_PUBLIC_ORIGIN DADKIT_WEBDAV_PROXY_ALLOWED_HOSTS

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

write_initial_env() {
  if [ -e .env ] || [ -L .env ]; then
    return
  fi

  if [ -z "$DADKIT_PORT_WAS_SET$DADKIT_BIND_ADDRESS_WAS_SET$DADKIT_PUBLIC_ORIGIN_WAS_SET$DADKIT_WEBDAV_PROXY_ALLOWED_HOSTS_WAS_SET" ]; then
    return
  fi

  validate_initial_env_value DADKIT_PORT "$DADKIT_PORT_VALUE"
  validate_initial_env_value DADKIT_BIND_ADDRESS "$DADKIT_BIND_ADDRESS_VALUE"
  validate_initial_env_value DADKIT_PUBLIC_ORIGIN "$DADKIT_PUBLIC_ORIGIN_VALUE"
  validate_initial_env_value DADKIT_WEBDAV_PROXY_ALLOWED_HOSTS "$DADKIT_WEBDAV_PROXY_ALLOWED_HOSTS_VALUE"

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
  if [ -n "$DADKIT_WEBDAV_PROXY_ALLOWED_HOSTS_WAS_SET" ]; then
    printf 'DADKIT_WEBDAV_PROXY_ALLOWED_HOSTS=%s\n' "$DADKIT_WEBDAV_PROXY_ALLOWED_HOSTS_VALUE" >> .env
  fi

  chmod 600 .env
  echo "Created $APP_DIR/.env from the explicitly supplied deployment settings."
}

need git
need docker

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose v2 is required. Please install Docker with the compose plugin." >&2
  exit 1
fi

if [ ! -d "$APP_DIR/.git" ]; then
  echo "DadKit is not deployed at $APP_DIR. Run docker-deploy.sh first." >&2
  exit 1
fi

cd "$APP_DIR"
git fetch origin "$BRANCH"
git checkout "$BRANCH"

if [ "$DADKIT_FORCE_RESET" = "1" ]; then
  git reset --hard "origin/$BRANCH"
else
  git pull --ff-only origin "$BRANCH" || {
    echo "Fast-forward upgrade failed. If this deploy directory has no local changes and you want to match origin/$BRANCH exactly, rerun with DADKIT_FORCE_RESET=1." >&2
    exit 1
  }
fi

write_initial_env
start_and_wait
docker image prune -f >/dev/null 2>&1 || true

PUBLISHED_ENDPOINT="$(compose port dadkit 3333 2>/dev/null || true)"
if [ -n "$PUBLISHED_ENDPOINT" ]; then
  echo "DadKit upgraded and is listening at $PUBLISHED_ENDPOINT; keep public access behind an HTTPS reverse proxy."
  echo "Health check: http://${PUBLISHED_ENDPOINT}/healthz"
else
  echo "DadKit was upgraded, but Docker Compose did not report a published endpoint."
fi
compose ps
