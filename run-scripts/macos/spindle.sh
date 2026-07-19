#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

PYTHON_BIN="${ROOT}/.venv/bin/python"
NODE_MODULES="${ROOT}/presentation/node_modules"

usage() {
  cat <<'EOF'
Lemain Spindle · macOS

Uso:
  ./run-scripts/macos/spindle.sh              # verifica deps, instala se preciso e sobe a UI
  ./run-scripts/macos/spindle.sh ui           # sobe a UI Electron
  ./run-scripts/macos/spindle.sh cli <url> …  # CLI de download
  ./run-scripts/macos/spindle.sh setup        # só verifica/instala dependências

Exemplos:
  ./run-scripts/macos/spindle.sh
  ./run-scripts/macos/spindle.sh cli "https://www.youtube.com/watch?v=..." -f mp4 -o ~/Downloads
EOF
}

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Erro: '$1' não encontrado no PATH." >&2
    exit 1
  fi
}

warn_ffmpeg() {
  if command -v ffmpeg >/dev/null 2>&1; then
    return
  fi
  echo "Aviso: ffmpeg não está no PATH. A extração de mídia vai falhar até instalar." >&2
  echo "  brew install ffmpeg" >&2
}

ensure_deps() {
  echo "==> Lemain Spindle · macOS · checando dependências"
  echo "    raiz: $ROOT"

  need python3
  need npm
  need node
  warn_ffmpeg

  if [[ ! -x "$PYTHON_BIN" ]]; then
    echo "==> criando .venv"
    python3 -m venv "${ROOT}/.venv"
  fi

  echo "==> garantindo dependências Python"
  "$PYTHON_BIN" -m pip install --upgrade pip >/dev/null
  "$PYTHON_BIN" -m pip install -r "${ROOT}/requirements.txt"

  if [[ ! -d "$NODE_MODULES" ]]; then
    echo "==> instalando dependências Node (presentation/)"
  else
    echo "==> verificando dependências Node (presentation/)"
  fi
  (
    cd "${ROOT}/presentation"
    npm install
    npm run patch:electron
  )

  echo "==> dependências ok"
}

run_ui() {
  ensure_deps
  export PATH="${ROOT}/.venv/bin:${PATH}"
  export PYTHONPATH="${ROOT}${PYTHONPATH:+:${PYTHONPATH}}"

  echo "==> subindo UI (Electron)"
  echo "    Python: $($PYTHON_BIN -V 2>&1)"
  echo "    Node:   $(node -v)"
  echo

  cd "${ROOT}/presentation"
  npm run dev
}

run_cli() {
  ensure_deps

  if [[ $# -lt 1 ]]; then
    echo "Informe a URL do YouTube." >&2
    usage >&2
    exit 1
  fi

  export PATH="${ROOT}/.venv/bin:${PATH}"
  export PYTHONPATH="${ROOT}${PYTHONPATH:+:${PYTHONPATH}}"

  echo "==> CLI"
  exec "$PYTHON_BIN" "${ROOT}/download_youtube.py" "$@"
}

COMMAND="${1:-ui}"
case "$COMMAND" in
  -h|--help|help)
    usage
    ;;
  setup)
    ensure_deps
    echo
    echo "Pronto. Para a UI: ./run-scripts/macos/spindle.sh ui"
    echo "Para a CLI: ./run-scripts/macos/spindle.sh cli <url>"
    ;;
  ui|dev|"")
    run_ui
    ;;
  cli)
    shift
    run_cli "$@"
    ;;
  http://*|https://*)
    run_cli "$@"
    ;;
  *)
    echo "Comando desconhecido: $COMMAND" >&2
    usage >&2
    exit 1
    ;;
esac
