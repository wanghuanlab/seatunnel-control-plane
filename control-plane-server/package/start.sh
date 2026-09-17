#!/usr/bin/env sh
set -eu

APP_HOME="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
JAR="$APP_HOME/control-plane-server.jar"
cd "$APP_HOME"

if [ ! -f "$JAR" ]; then
  echo "missing $JAR, run ../package.sh first" >&2
  exit 1
fi

if [ -n "${JAVA_HOME:-}" ] && [ -x "$JAVA_HOME/bin/java" ]; then
  JAVA_BIN="$JAVA_HOME/bin/java"
elif command -v java >/dev/null 2>&1; then
  JAVA_BIN="$(command -v java)"
else
  echo "Java 8+ is required. Set JAVA_HOME or add java to PATH." >&2
  exit 1
fi

mkdir -p "$APP_HOME/logs"
echo "starting control-plane-server with $JAVA_BIN"
# shellcheck disable=SC2086
exec "$JAVA_BIN" ${JAVA_OPTS:-} -jar "$JAR" "$@"
