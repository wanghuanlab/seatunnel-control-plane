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
