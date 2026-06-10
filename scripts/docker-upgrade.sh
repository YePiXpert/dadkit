#!/usr/bin/env sh
set -eu

APP_DIR="${DADKIT_DIR:-/opt/dadkit}"
BRANCH="${DADKIT_BRANCH:-main}"
DADKIT_PORT="${DADKIT_PORT:-3333}"
DADKIT_FORCE_RESET="${DADKIT_FORCE_RESET:-0}"
DADKIT_BUILD_TIME="${DADKIT_BUILD_TIME:-$(date -u +"%Y-%m-%dT%H:%M:%SZ")}"
export DADKIT_PORT
export DADKIT_BUILD_TIME

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

compose() {
  docker compose "$@"
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

compose up --build -d --remove-orphans
docker image prune -f >/dev/null 2>&1 || true

echo "DadKit upgraded and running at http://localhost:${DADKIT_PORT}"
echo "Health check: http://localhost:${DADKIT_PORT}/healthz"
compose ps
