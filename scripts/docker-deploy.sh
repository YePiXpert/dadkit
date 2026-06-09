#!/usr/bin/env sh
set -eu

REPO_URL="${DADKIT_REPO:-https://github.com/YePiXpert/dadkit.git}"
APP_DIR="${DADKIT_DIR:-/opt/dadkit}"
BRANCH="${DADKIT_BRANCH:-main}"
DADKIT_PORT="${DADKIT_PORT:-3333}"
export DADKIT_PORT

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

if [ -d "$APP_DIR/.git" ]; then
  cd "$APP_DIR"
  git fetch origin "$BRANCH"
  git checkout "$BRANCH"
  git pull --ff-only origin "$BRANCH"
else
  mkdir -p "$(dirname "$APP_DIR")"
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

compose up --build -d --remove-orphans

echo "DadKit is running at http://localhost:${DADKIT_PORT}"
compose ps
