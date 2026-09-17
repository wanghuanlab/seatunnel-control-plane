#!/usr/bin/env sh
set -eu

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
DEST="$ROOT/package"
JAR_NAME="control-plane-server.jar"

echo "[package] Maven package..."
cd "$ROOT"
mvn -DskipTests package

JAR_SRC=""
for f in "$ROOT/target"/control-plane-server-*.jar; do
  [ -f "$f" ] || continue
  case "$f" in
    *.original) continue ;;
    *) JAR_SRC="$f"; break ;;
  esac
done

if [ -z "$JAR_SRC" ] || [ ! -f "$JAR_SRC" ]; then
  echo "[package] fat jar not found under target/" >&2
  exit 1
fi

mkdir -p "$DEST/sql" "$DEST/logs"
rm -f "$DEST"/*.jar
cp "$JAR_SRC" "$DEST/$JAR_NAME"
cp "$ROOT/src/main/resources/application.yml" "$DEST/application.yml"
cp "$ROOT/sql/"*.sql "$DEST/sql/"

cat > "$DEST/start.sh" << 'EOF'
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
EOF

cat > "$DEST/start.bat" << 'EOF'
@echo off
setlocal
cd /d "%~dp0"

if not exist "control-plane-server.jar" (
  echo missing control-plane-server.jar, run package.sh first
  exit /b 1
)

if defined JAVA_HOME (
  if exist "%JAVA_HOME%\bin\java.exe" (
    set "JAVA_BIN=%JAVA_HOME%\bin\java.exe"
    goto :run
  )
)

where java >nul 2>nul
if errorlevel 1 (
  echo Java 8+ is required. Set JAVA_HOME or add java to PATH.
  exit /b 1
)
set "JAVA_BIN=java"

:run
if not exist logs mkdir logs
echo starting control-plane-server with %JAVA_BIN%
"%JAVA_BIN%" %JAVA_OPTS% -jar "control-plane-server.jar" %*
EOF

chmod +x "$DEST/start.sh"

echo "[package] assembled $DEST"
echo "  jar : $DEST/$JAR_NAME"
echo "  conf: $DEST/application.yml"
echo "  sql : $DEST/sql"
echo "  run : $DEST/start.sh  or  $DEST/start.bat"
ls -la "$DEST" "$DEST/sql"
