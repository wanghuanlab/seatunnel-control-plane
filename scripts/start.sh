#!/usr/bin/env sh
set -eu

project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$project_dir"

VAR_DIR="$project_dir/var"
RUNTIME_FILE="$VAR_DIR/runtime.json"
SERVER_PID_FILE="$VAR_DIR/server.pid"
WEB_PID_FILE="$VAR_DIR/web.pid"
SERVER_LOG="$VAR_DIR/server.log"
WEB_LOG="$VAR_DIR/web.log"

DEFAULT_API_PORT=8800
DEFAULT_WEB_PORT=5174

cmd=${1:-start}

is_port_in_use() {
  port=$1
  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
    return $?
  fi
  # Fallback: try binding with node
  node -e "const n=require('net');const s=n.createServer();s.once('error',()=>process.exit(1));s.listen($port,'127.0.0.1',()=>s.close(()=>process.exit(0)));" >/dev/null 2>&1
  if [ $? -eq 0 ]; then
    return 1
  fi
  return 0
}

find_free_port() {
  port=$1
  while is_port_in_use "$port"; do
    port=$((port + 1))
  done
  echo "$port"
}

pid_alive() {
  pid=$1
  [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null
}

kill_pid_file() {
  file=$1
  if [ -f "$file" ]; then
    pid=$(cat "$file" 2>/dev/null || true)
    if pid_alive "$pid"; then
      kill "$pid" 2>/dev/null || true
      # Give the process a moment, then force if needed
      i=0
      while pid_alive "$pid" && [ "$i" -lt 20 ]; do
        sleep 0.1
        i=$((i + 1))
      done
      if pid_alive "$pid"; then
        kill -9 "$pid" 2>/dev/null || true
      fi
    fi
    rm -f "$file"
  fi
}

kill_port_listeners() {
  port=$1
  if command -v lsof >/dev/null 2>&1; then
    pids=$(lsof -nP -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)
    if [ -n "$pids" ]; then
      # shellcheck disable=SC2086
      kill $pids 2>/dev/null || true
      sleep 0.2
      # shellcheck disable=SC2086
      kill -9 $pids 2>/dev/null || true
    fi
  fi
}

read_runtime_ports() {
  api_port=""
  web_port=""
  if [ -f "$RUNTIME_FILE" ]; then
    api_port=$(node -e "try{const r=require('$RUNTIME_FILE');process.stdout.write(String(r.apiPort||''))}catch{}" 2>/dev/null || true)
    web_port=$(node -e "try{const r=require('$RUNTIME_FILE');process.stdout.write(String(r.webPort||''))}catch{}" 2>/dev/null || true)
  fi
}

cmd_stop() {
  read_runtime_ports
  kill_pid_file "$WEB_PID_FILE"
  kill_pid_file "$SERVER_PID_FILE"
  if [ -n "${web_port:-}" ]; then
    kill_port_listeners "$web_port"
  fi
  if [ -n "${api_port:-}" ]; then
    kill_port_listeners "$api_port"
  fi
  rm -f "$RUNTIME_FILE"
  echo "Stopped seatunnel-control-plane"
}

cmd_status() {
  mkdir -p "$VAR_DIR"
  read_runtime_ports
  server_pid=""
  web_pid=""
  [ -f "$SERVER_PID_FILE" ] && server_pid=$(cat "$SERVER_PID_FILE" 2>/dev/null || true)
  [ -f "$WEB_PID_FILE" ] && web_pid=$(cat "$WEB_PID_FILE" 2>/dev/null || true)

  server_ok=0
  web_ok=0
  if pid_alive "$server_pid"; then server_ok=1; fi
  if pid_alive "$web_pid"; then web_ok=1; fi

  # Port-based fallback
  if [ -n "${api_port:-}" ] && is_port_in_use "$api_port"; then server_ok=1; fi
  if [ -n "${web_port:-}" ] && is_port_in_use "$web_port"; then web_ok=1; fi

  echo "seatunnel-control-plane status"
  echo "  project : $project_dir"
  if [ -n "${api_port:-}" ]; then
    echo "  api     : http://127.0.0.1:${api_port}/  (pid ${server_pid:-—}) $([ "$server_ok" -eq 1 ] && echo running || echo stopped)"
  else
    echo "  api     : not started"
  fi
  if [ -n "${web_port:-}" ]; then
    echo "  web     : http://127.0.0.1:${web_port}/  (pid ${web_pid:-—}) $([ "$web_ok" -eq 1 ] && echo running || echo stopped)"
  else
    echo "  web     : not started"
  fi
  echo "  logs    : $SERVER_LOG , $WEB_LOG"

  if [ "$server_ok" -eq 1 ] && [ "$web_ok" -eq 1 ]; then
    return 0
  fi
  return 1
}

cmd_start() {
  mkdir -p "$VAR_DIR"

  if [ -f "$SERVER_PID_FILE" ] || [ -f "$WEB_PID_FILE" ]; then
    if cmd_status >/dev/null 2>&1; then
      echo "Already running. Use: $0 status | $0 restart"
      cmd_status || true
      return 0
    fi
    # Stale pid files
    cmd_stop >/dev/null 2>&1 || true
  fi

  if [ ! -d node_modules ]; then
    npm run setup
  fi
  if [ ! -d web/node_modules ]; then
    npm --prefix web install
  fi

  api_port=$(find_free_port "$DEFAULT_API_PORT")
  web_port=$(find_free_port "$DEFAULT_WEB_PORT")

  # Avoid choosing the same port for both when ranges collide
  if [ "$web_port" = "$api_port" ]; then
    web_port=$(find_free_port $((api_port + 1)))
  fi

  echo "Starting API on :$api_port , Web on :$web_port"

  : >"$SERVER_LOG"
  : >"$WEB_LOG"

  SCP_PORT="$api_port" nohup node server/index.mjs >>"$SERVER_LOG" 2>&1 &
  echo $! >"$SERVER_PID_FILE"

  SCP_PORT="$api_port" SCP_WEB_PORT="$web_port" nohup npm --prefix web run dev >>"$WEB_LOG" 2>&1 &
  echo $! >"$WEB_PID_FILE"

  node -e "const fs=require('fs');fs.writeFileSync(process.argv[1], JSON.stringify({apiPort:Number(process.argv[2]),webPort:Number(process.argv[3]),startedAt:new Date().toISOString()},null,2))" \
    "$RUNTIME_FILE" "$api_port" "$web_port"

  # Wait briefly for listen
  i=0
  while [ "$i" -lt 50 ]; do
    if is_port_in_use "$api_port" && is_port_in_use "$web_port"; then
      break
    fi
    sleep 0.1
    i=$((i + 1))
  done

  echo "Started."
  echo "  Web UI : http://127.0.0.1:${web_port}/"
  echo "  API    : http://127.0.0.1:${api_port}/"
  echo "  Status : $0 status"
  echo "  Logs   : tail -f $SERVER_LOG $WEB_LOG"
}

cmd_restart() {
  cmd_stop || true
  sleep 0.3
  cmd_start
}

print_usage() {
  cat <<EOF
Usage: $0 {start|stop|restart|status}

  start    Start API + Web (auto-pick free ports from 8800 / 5174)
  stop     Stop running processes
  restart  Stop then start
  status   Show ports / pid / running state
EOF
}

case "$cmd" in
  start) cmd_start ;;
  stop) cmd_stop ;;
  restart) cmd_restart ;;
  status) cmd_status ;;
  -h|--help|help) print_usage ;;
  *)
    print_usage >&2
    exit 1
    ;;
esac
