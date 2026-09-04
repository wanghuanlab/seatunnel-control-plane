@echo off
setlocal EnableExtensions EnableDelayedExpansion

rem SeaTunnel Control Plane - Windows local start/stop/restart/status
rem Mirrors scripts/start.sh

set "PROJECT_DIR=%~dp0.."
pushd "%PROJECT_DIR%" >nul || exit /b 1
set "PROJECT_DIR=%CD%"

set "VAR_DIR=%PROJECT_DIR%\var"
set "RUNTIME_FILE=%VAR_DIR%\runtime.json"
set "SERVER_PID_FILE=%VAR_DIR%\server.pid"
set "WEB_PID_FILE=%VAR_DIR%\web.pid"
set "SERVER_LOG=%VAR_DIR%\server.log"
set "WEB_LOG=%VAR_DIR%\web.log"
set "DEFAULT_API_PORT=8800"
set "DEFAULT_WEB_PORT=5174"

set "CMD=%~1"
if "%CMD%"=="" set "CMD=start"

if /I "%CMD%"=="start" goto :MAIN_START
if /I "%CMD%"=="stop" goto :MAIN_STOP
if /I "%CMD%"=="restart" goto :MAIN_RESTART
if /I "%CMD%"=="status" goto :MAIN_STATUS
if /I "%CMD%"=="help" goto :MAIN_HELP
if /I "%CMD%"=="-h" goto :MAIN_HELP
if /I "%CMD%"=="--help" goto :MAIN_HELP

call :PRINT_USAGE
popd >nul
exit /b 1

:MAIN_HELP
call :PRINT_USAGE
popd >nul
exit /b 0

:MAIN_STOP
call :DO_STOP
echo Stopped seatunnel-control-plane
popd >nul
exit /b 0

:MAIN_STATUS
call :DO_STATUS
set "STATUS_RC=!ERRORLEVEL!"
popd >nul
exit /b !STATUS_RC!

:MAIN_RESTART
call :DO_STOP
timeout /t 1 /nobreak >nul
goto :MAIN_START

:MAIN_START
if not exist "%VAR_DIR%" mkdir "%VAR_DIR%" >nul 2>&1

if exist "%SERVER_PID_FILE%" goto :CHECK_ALREADY
if exist "%WEB_PID_FILE%" goto :CHECK_ALREADY
goto :ENSURE_DEPS

:CHECK_ALREADY
call :IS_RUNNING
if not errorlevel 1 (
  echo Already running. Use: %~nx0 status ^| %~nx0 restart
  call :DO_STATUS
  popd >nul
  exit /b 0
)
call :DO_STOP

:ENSURE_DEPS
where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: node is not in PATH. Install Node.js first.
  popd >nul
  exit /b 1
)
where npm >nul 2>&1
if errorlevel 1 (
  echo ERROR: npm is not in PATH. Install Node.js first.
  popd >nul
  exit /b 1
)

if not exist "node_modules\" (
  echo Installing root dependencies...
  call npm run setup
  if errorlevel 1 (popd >nul & exit /b 1)
)
if not exist "web\node_modules\" (
  echo Installing web dependencies...
  call npm --prefix web install
  if errorlevel 1 (popd >nul & exit /b 1)
)

call :FIND_FREE_PORT %DEFAULT_API_PORT%
set "API_PORT=!FREE_PORT!"
call :FIND_FREE_PORT %DEFAULT_WEB_PORT%
set "WEB_PORT=!FREE_PORT!"
if "!WEB_PORT!"=="!API_PORT!" (
  set /a NEXT_PORT=!API_PORT!+1
  call :FIND_FREE_PORT !NEXT_PORT!
  set "WEB_PORT=!FREE_PORT!"
)

echo Starting API on :!API_PORT! , Web on :!WEB_PORT!
type nul > "%SERVER_LOG%"
type nul > "%WEB_LOG%"

for /f "usebackq delims=" %%P in (`powershell -NoProfile -Command "$p=Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','set SCP_PORT=%API_PORT%&& node server/index.mjs>>\"%SERVER_LOG%\" 2>>&1' -WorkingDirectory '%PROJECT_DIR%' -PassThru -WindowStyle Hidden; $p.Id"`) do set "SERVER_PID=%%P"
echo !SERVER_PID!>"%SERVER_PID_FILE%"

for /f "usebackq delims=" %%P in (`powershell -NoProfile -Command "$p=Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','set SCP_PORT=%API_PORT%&& set SCP_WEB_PORT=%WEB_PORT%&& npm --prefix web run dev>>\"%WEB_LOG%\" 2>>&1' -WorkingDirectory '%PROJECT_DIR%' -PassThru -WindowStyle Hidden; $p.Id"`) do set "WEB_PID=%%P"
echo !WEB_PID!>"%WEB_PID_FILE%"

node -e "const fs=require('fs');fs.writeFileSync(process.argv[1], JSON.stringify({apiPort:Number(process.argv[2]),webPort:Number(process.argv[3]),startedAt:new Date().toISOString()},null,2))" "%RUNTIME_FILE%" "!API_PORT!" "!WEB_PORT!"

rem Wait up to ~5s for both ports
set /a WAIT_I=0
:WAIT_LISTEN
call :PORT_IN_USE !API_PORT!
set "API_READY=!ERRORLEVEL!"
call :PORT_IN_USE !WEB_PORT!
set "WEB_READY=!ERRORLEVEL!"
if "!API_READY!"=="0" if "!WEB_READY!"=="0" goto :STARTED_OK
set /a WAIT_I+=1
if !WAIT_I! GEQ 25 goto :STARTED_OK
powershell -NoProfile -Command "Start-Sleep -Milliseconds 200" >nul 2>&1
goto :WAIT_LISTEN

:STARTED_OK
echo Started.
echo   Web UI : http://127.0.0.1:!WEB_PORT!/
echo   API    : http://127.0.0.1:!API_PORT!/
echo   Status : %~nx0 status
echo   Logs   : type "%SERVER_LOG%"  ^&  type "%WEB_LOG%"
popd >nul
exit /b 0

rem ---------- helpers (no popd) ----------

:PRINT_USAGE
echo Usage: %~nx0 {start^|stop^|restart^|status}
echo.
echo   start    Start API + Web (auto-pick free ports from 8800 / 5174^)
echo   stop     Stop running processes
echo   restart  Stop then start
echo   status   Show ports / pid / running state
exit /b 0

:PORT_IN_USE
set "PORT_CHECK=%~1"
powershell -NoProfile -Command "$c=Get-NetTCPConnection -LocalPort %PORT_CHECK% -State Listen -ErrorAction SilentlyContinue; if($c){exit 0}else{exit 1}" >nul 2>&1
if not errorlevel 1 exit /b 0
netstat -ano | findstr /R /C:":%PORT_CHECK% .*LISTENING" >nul 2>&1
if errorlevel 1 exit /b 1
exit /b 0

:FIND_FREE_PORT
set "FREE_PORT=%~1"
:FIND_FREE_PORT_LOOP
call :PORT_IN_USE !FREE_PORT!
if not errorlevel 1 (
  set /a FREE_PORT+=1
  goto :FIND_FREE_PORT_LOOP
)
exit /b 0

:PID_ALIVE
set "CHECK_PID=%~1"
if "%CHECK_PID%"=="" exit /b 1
tasklist /FI "PID eq %CHECK_PID%" 2>nul | findstr /I "%CHECK_PID%" >nul 2>&1
exit /b %ERRORLEVEL%

:KILL_PID_FILE
set "PID_FILE=%~1"
if not exist "%PID_FILE%" exit /b 0
set "KILL_PID="
set /p KILL_PID=<"%PID_FILE%"
if defined KILL_PID (
  call :PID_ALIVE !KILL_PID!
  if not errorlevel 1 (
    taskkill /PID !KILL_PID! /T >nul 2>&1
    timeout /t 1 /nobreak >nul
    call :PID_ALIVE !KILL_PID!
    if not errorlevel 1 taskkill /F /PID !KILL_PID! /T >nul 2>&1
  )
)
del /f /q "%PID_FILE%" >nul 2>&1
exit /b 0

:KILL_PORT_LISTENERS
set "KILL_PORT=%~1"
if "%KILL_PORT%"=="" exit /b 0
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":%KILL_PORT% .*LISTENING"') do (
  if not "%%P"=="0" taskkill /F /PID %%P /T >nul 2>&1
)
exit /b 0

:READ_RUNTIME_PORTS
set "API_PORT="
set "WEB_PORT="
if exist "%RUNTIME_FILE%" (
  for /f "usebackq delims=" %%A in (`node -e "try{const r=require(process.argv[1]);process.stdout.write(String(r.apiPort||''))}catch{}" "%RUNTIME_FILE%"`) do set "API_PORT=%%A"
  for /f "usebackq delims=" %%W in (`node -e "try{const r=require(process.argv[1]);process.stdout.write(String(r.webPort||''))}catch{}" "%RUNTIME_FILE%"`) do set "WEB_PORT=%%W"
)
exit /b 0

:DO_STOP
call :READ_RUNTIME_PORTS
call :KILL_PID_FILE "%WEB_PID_FILE%"
call :KILL_PID_FILE "%SERVER_PID_FILE%"
if defined WEB_PORT call :KILL_PORT_LISTENERS !WEB_PORT!
if defined API_PORT call :KILL_PORT_LISTENERS !API_PORT!
if exist "%RUNTIME_FILE%" del /f /q "%RUNTIME_FILE%" >nul 2>&1
exit /b 0

:IS_RUNNING
call :READ_RUNTIME_PORTS
set "SERVER_PID="
set "WEB_PID="
if exist "%SERVER_PID_FILE%" set /p SERVER_PID=<"%SERVER_PID_FILE%"
if exist "%WEB_PID_FILE%" set /p WEB_PID=<"%WEB_PID_FILE%"
set "SERVER_OK=0"
set "WEB_OK=0"
call :PID_ALIVE "!SERVER_PID!"
if not errorlevel 1 set "SERVER_OK=1"
call :PID_ALIVE "!WEB_PID!"
if not errorlevel 1 set "WEB_OK=1"
if defined API_PORT (
  call :PORT_IN_USE !API_PORT!
  if not errorlevel 1 set "SERVER_OK=1"
)
if defined WEB_PORT (
  call :PORT_IN_USE !WEB_PORT!
  if not errorlevel 1 set "WEB_OK=1"
)
if "!SERVER_OK!"=="1" if "!WEB_OK!"=="1" exit /b 0
exit /b 1

:DO_STATUS
if not exist "%VAR_DIR%" mkdir "%VAR_DIR%" >nul 2>&1
call :IS_RUNNING
set "RUNNING_RC=!ERRORLEVEL!"
call :READ_RUNTIME_PORTS
set "SERVER_PID="
set "WEB_PID="
if exist "%SERVER_PID_FILE%" set /p SERVER_PID=<"%SERVER_PID_FILE%"
if exist "%WEB_PID_FILE%" set /p WEB_PID=<"%WEB_PID_FILE%"

set "SERVER_OK=0"
set "WEB_OK=0"
call :PID_ALIVE "!SERVER_PID!"
if not errorlevel 1 set "SERVER_OK=1"
call :PID_ALIVE "!WEB_PID!"
if not errorlevel 1 set "WEB_OK=1"
if defined API_PORT (
  call :PORT_IN_USE !API_PORT!
  if not errorlevel 1 set "SERVER_OK=1"
)
if defined WEB_PORT (
  call :PORT_IN_USE !WEB_PORT!
  if not errorlevel 1 set "WEB_OK=1"
)

echo seatunnel-control-plane status
echo   project : %PROJECT_DIR%
if defined API_PORT (
  if "!SERVER_OK!"=="1" (set "SERVER_STATE=running") else (set "SERVER_STATE=stopped")
  if defined SERVER_PID (set "SERVER_PID_SHOW=!SERVER_PID!") else (set "SERVER_PID_SHOW=-")
  echo   api     : http://127.0.0.1:!API_PORT!/  ^(pid !SERVER_PID_SHOW!^) !SERVER_STATE!
) else (
  echo   api     : not started
)
if defined WEB_PORT (
  if "!WEB_OK!"=="1" (set "WEB_STATE=running") else (set "WEB_STATE=stopped")
  if defined WEB_PID (set "WEB_PID_SHOW=!WEB_PID!") else (set "WEB_PID_SHOW=-")
  echo   web     : http://127.0.0.1:!WEB_PORT!/  ^(pid !WEB_PID_SHOW!^) !WEB_STATE!
) else (
  echo   web     : not started
)
echo   logs    : %SERVER_LOG% , %WEB_LOG%
exit /b !RUNNING_RC!
