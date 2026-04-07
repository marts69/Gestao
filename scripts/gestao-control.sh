#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$PROJECT_DIR"

is_listening_on_port() {
  local port="$1"

  if command -v lsof >/dev/null 2>&1; then
    lsof -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
    return $?
  fi

  if command -v fuser >/dev/null 2>&1; then
    fuser "$port"/tcp >/dev/null 2>&1
    return $?
  fi

  return 1
}

show_status() {
  echo ""
  echo "[status] projeto: $PROJECT_DIR"
  for port in 3333 3000 3001 3002 3003; do
    if is_listening_on_port "$port"; then
      echo "[status] porta $port: em uso"
    else
      echo "[status] porta $port: livre"
    fi
  done
  echo ""
}

start_all() {
  echo "[control] iniciando Front + API..."
  exec ./scripts/run-all.sh
}

stop_all() {
  echo "[control] parando Front + API..."
  ./scripts/stop-all.sh
}

show_menu() {
  while true; do
    echo ""
    echo "=== Gestao Control ==="
    echo "1) Iniciar Front + API"
    echo "2) Parar Front + API"
    echo "3) Status das portas"
    echo "0) Sair"
    echo ""
    read -r -p "Escolha uma opcao: " option

    case "$option" in
      1)
        start_all
        ;;
      2)
        stop_all
        ;;
      3)
        show_status
        ;;
      0)
        echo "[control] saindo"
        exit 0
        ;;
      *)
        echo "[control] opcao invalida"
        ;;
    esac
  done
}

MODE="${1:-menu}"

case "$MODE" in
  start)
    start_all
    ;;
  stop)
    stop_all
    ;;
  status)
    show_status
    ;;
  menu)
    show_menu
    ;;
  *)
    echo "Uso: $0 [menu|start|stop|status]"
    exit 1
    ;;
esac
