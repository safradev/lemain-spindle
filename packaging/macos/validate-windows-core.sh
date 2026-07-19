#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
MODE="${1:-native}"
IMAGE="${SPINDLE_PYINSTALLER_IMAGE:-batonogov/pyinstaller-windows:latest}"

if [[ -S "${HOME}/.colima/default/docker.sock" ]]; then
  export DOCKER_HOST="unix://${HOME}/.colima/default/docker.sock"
fi

echo "==> Spindle Windows freeze validation"
echo "    repo: $ROOT"
echo "    mode: $MODE"

python3 - <<PY
import os
spec_dir = os.path.join("$ROOT", "packaging", "windows")
# SPECPATH no PyInstaller = diretório do .spec
entry = os.path.abspath(os.path.join(spec_dir, "..", "spindle_core_main.py"))
repo = os.path.abspath(os.path.join(spec_dir, "..", ".."))
assert os.path.isfile(entry), f"entry missing: {entry}"
assert os.path.isdir(os.path.join(repo, "core")), f"core missing under {repo}"
print("path checks OK")
print(" entry:", entry)
print(" repo: ", repo)
PY

validate_native() {
  local venv="$ROOT/.venv"
  local dist="$ROOT/packaging/windows/dist-mac-validate"
  local work="$ROOT/packaging/windows/build-mac-validate"
  local bin="$dist/spindle-core/spindle-core"

  echo "==> Native Mac freeze with the Windows .spec (same SPECPATH/pathex)"
  if [[ ! -x "$venv/bin/pyinstaller" ]]; then
    python3 -m venv "$venv"
    "$venv/bin/pip" install --upgrade pip
    "$venv/bin/pip" install -r "$ROOT/packaging/requirements-build.txt"
  fi

  rm -rf "$dist" "$work"
  (
    cd "$ROOT"
    "$venv/bin/pyinstaller" --clean --noconfirm \
      --distpath packaging/windows/dist-mac-validate \
      --workpath packaging/windows/build-mac-validate \
      packaging/windows/spindle-core.spec
  )

  test -x "$bin"
  test -d "$dist/spindle-core/runtime"

  local out
  out="$(printf '%s\n' '{"id":"1","method":"ping","params":{}}' | "$bin")"
  echo "$out"
  echo "$out" | grep -Eq '"ok"[[:space:]]*:[[:space:]]*true'
  echo "==> native validation passed"
}

validate_wine() {
  echo "==> Docker + Wine Windows .exe freeze (batonogov/pyinstaller-windows)"
  if ! command -v docker >/dev/null 2>&1; then
    echo "Docker não encontrado."
    exit 1
  fi
  if ! docker info >/dev/null 2>&1; then
    echo "Docker daemon indisponível (colima start / Docker Desktop)."
    exit 1
  fi

  docker pull --platform linux/amd64 "$IMAGE"

  docker run --rm \
    --platform linux/amd64 \
    --entrypoint /bin/bash \
    -v "$ROOT:/src:rw" \
    -w /src \
    "$IMAGE" \
    -lc "
      set -e
      wine python -m pip install --upgrade pip
      wine python -m pip install -r packaging/requirements-build.txt
      wine pyinstaller --clean --noconfirm \
        --distpath packaging/windows/dist-docker \
        --workpath packaging/windows/build-docker \
        packaging/windows/spindle-core.spec
      test -f packaging/windows/dist-docker/spindle-core/spindle-core.exe
      test -d packaging/windows/dist-docker/spindle-core/runtime
      echo freeze OK
    "

  docker run --rm \
    --platform linux/amd64 \
    --entrypoint /bin/bash \
    -v "$ROOT:/src:rw" \
    -w /src \
    "$IMAGE" \
    -lc "
      set -e
      printf '%s\n' '{\"id\":\"1\",\"method\":\"ping\",\"params\":{}}' | wine packaging/windows/dist-docker/spindle-core/spindle-core.exe
    " | tee /tmp/spindle-core-ping.out

  grep -Eq '"ok"[[:space:]]*:[[:space:]]*true' /tmp/spindle-core-ping.out
  echo "==> wine validation passed"
}

case "$MODE" in
  native)
    validate_native
    ;;
  wine|docker)
    validate_wine
    ;;
  all)
    validate_native
    validate_wine
    ;;
  *)
    echo "Uso: $0 [native|wine|all]"
    exit 2
    ;;
esac
