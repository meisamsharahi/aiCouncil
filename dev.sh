#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
#  AI Council — dev server manager
#  Usage: ./dev.sh [command]
#  Commands: start | stop | restart | clear | reset | status | logs
# ─────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/.dev.pid"
LOG_FILE="$SCRIPT_DIR/.dev.log"
PORT=3000

# ── colours ──────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

info()    { echo -e "${CYAN}ℹ  $*${RESET}"; }
success() { echo -e "${GREEN}✓  $*${RESET}"; }
warn()    { echo -e "${YELLOW}⚠  $*${RESET}"; }
error()   { echo -e "${RED}✗  $*${RESET}"; }
header()  { echo -e "\n${BOLD}$*${RESET}"; }

# ── helpers ───────────────────────────────────────────────────

is_running() {
  if [[ -f "$PID_FILE" ]]; then
    local pid
    pid=$(cat "$PID_FILE")
    if kill -0 "$pid" 2>/dev/null; then
      return 0
    fi
  fi
  return 1
}

get_pid() {
  cat "$PID_FILE" 2>/dev/null || echo ""
}

kill_server() {
  # Kill via PID file first
  if [[ -f "$PID_FILE" ]]; then
    local pid
    pid=$(cat "$PID_FILE")
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null && wait "$pid" 2>/dev/null || true
    fi
    rm -f "$PID_FILE"
  fi

  # Also kill any stray next dev processes on this port
  local stray
  stray=$(lsof -ti tcp:"$PORT" 2>/dev/null || true)
  if [[ -n "$stray" ]]; then
    echo "$stray" | xargs kill 2>/dev/null || true
  fi
}

wait_for_ready() {
  local attempts=0
  local max=30
  info "Waiting for server on port $PORT..."
  while (( attempts < max )); do
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT" 2>/dev/null | grep -q "200"; then
      return 0
    fi
    sleep 1
    (( attempts++ ))
  done
  return 1
}

# ── commands ──────────────────────────────────────────────────

cmd_start() {
  header "Starting AI Council dev server"

  if is_running; then
    warn "Server already running (PID $(get_pid))"
    info "URL: http://localhost:$PORT"
    return
  fi

  # Clear any stale process holding the port
  local stray
  stray=$(lsof -ti tcp:"$PORT" 2>/dev/null || true)
  if [[ -n "$stray" ]]; then
    warn "Port $PORT in use by PID(s) $stray — killing..."
    echo "$stray" | xargs kill -9 2>/dev/null || true
    sleep 1
  fi

  cd "$SCRIPT_DIR"

  # Start in background on the explicit port
  nohup npm run dev -- --port "$PORT" > "$LOG_FILE" 2>&1 &
  local pid=$!
  echo "$pid" > "$PID_FILE"

  if wait_for_ready; then
    success "Server started (PID $pid)"
    info "URL:  http://localhost:$PORT"
    info "Logs: $LOG_FILE"
  else
    error "Server did not respond after 30s — check logs:"
    tail -20 "$LOG_FILE"
    rm -f "$PID_FILE"
    exit 1
  fi
}

cmd_stop() {
  header "Stopping AI Council dev server"

  if ! is_running; then
    warn "Server is not running"
    return
  fi

  local pid
  pid=$(get_pid)
  info "Stopping PID $pid..."
  kill_server
  success "Server stopped"
}

cmd_restart() {
  header "Restarting AI Council dev server"
  cmd_stop 2>/dev/null || true
  sleep 1
  cmd_start
}

cmd_clear() {
  header "Clearing build cache"

  local was_running=false
  if is_running; then
    was_running=true
    info "Stopping server before clearing cache..."
    kill_server
    sleep 1
  fi

  if [[ -d "$SCRIPT_DIR/.next" ]]; then
    rm -rf "$SCRIPT_DIR/.next"
    success "Deleted .next/"
  else
    info ".next/ not found — nothing to clear"
  fi

  if $was_running; then
    info "Restarting server with clean cache..."
    cmd_start
  else
    success "Cache cleared. Run ./dev.sh start to start the server."
  fi
}

cmd_reset() {
  header "Full reset — cache + node_modules"
  warn "This will delete .next/ and node_modules/ and reinstall dependencies."
  read -rp "  Continue? [y/N] " confirm
  [[ "$confirm" =~ ^[Yy]$ ]] || { info "Aborted."; exit 0; }

  if is_running; then
    info "Stopping server..."
    kill_server
    sleep 1
  fi

  cd "$SCRIPT_DIR"

  if [[ -d ".next" ]]; then
    rm -rf .next
    success "Deleted .next/"
  fi

  if [[ -d "node_modules" ]]; then
    rm -rf node_modules
    success "Deleted node_modules/"
  fi

  info "Installing dependencies..."
  npm install
  success "Dependencies installed"
  info "Run ./dev.sh start to start the server."
}

cmd_status() {
  header "AI Council dev server status"

  if is_running; then
    local pid
    pid=$(get_pid)
    success "Running  (PID $pid)"
    info "URL:  http://localhost:$PORT"
    info "Logs: $LOG_FILE"
    echo ""
    info "Cache:"
    if [[ -d "$SCRIPT_DIR/.next" ]]; then
      local size
      size=$(du -sh "$SCRIPT_DIR/.next" 2>/dev/null | cut -f1)
      echo "  .next/ exists — $size"
    else
      echo "  .next/ not found"
    fi
  else
    warn "Not running"
  fi
}

cmd_logs() {
  if [[ ! -f "$LOG_FILE" ]]; then
    warn "No log file found at $LOG_FILE"
    exit 1
  fi
  header "Dev server logs (Ctrl+C to exit)"
  tail -f "$LOG_FILE"
}

# ── dispatch ──────────────────────────────────────────────────

COMMAND="${1:-help}"

case "$COMMAND" in
  start)   cmd_start   ;;
  stop)    cmd_stop    ;;
  restart) cmd_restart ;;
  clear)   cmd_clear   ;;
  reset)   cmd_reset   ;;
  status)  cmd_status  ;;
  logs)    cmd_logs    ;;
  *)
    echo -e "${BOLD}AI Council — dev server manager${RESET}"
    echo ""
    echo "Usage: ./dev.sh <command>"
    echo ""
    echo "Commands:"
    echo "  start     Start the dev server in background"
    echo "  stop      Stop the running dev server"
    echo "  restart   Stop, then start again"
    echo "  clear     Delete .next/ cache and restart if running"
    echo "  reset     Delete .next/ + node_modules/, reinstall, prompt to start"
    echo "  status    Show whether server is running + cache info"
    echo "  logs      Tail the dev server log file"
    ;;
esac
