@echo off
rem Launched at logon by the Startup shortcut "CK Web Codex worker.lnk", which runs
rem this through `conhost --headless` so no console window appears.
rem Launcher-level messages go to worker-launch.log: worker.log / worker-error.log
rem stay open for node's whole run, so a second instance cannot write to them.
cd /d "%~dp0"
set "NODE=C:\Program Files\nodejs\node.exe"
if not exist "%NODE%" set "NODE=node"

rem Single instance: fd 9 holds worker.lock for as long as we run, so a second
rem logon or a manual double-click cannot start a competing worker.
set "ENTERED="
2>nul (
  9>worker.lock (
    set "ENTERED=1"
    call :run
  )
)
if not defined ENTERED echo [%DATE% %TIME%] refused: another worker already holds worker.lock>> worker-launch.log
exit /b

:run
echo [%DATE% %TIME%] starting worker>> worker-launch.log
"%NODE%" worker.mjs>> worker.log 2>> worker-error.log
echo [%DATE% %TIME%] worker exited with %ERRORLEVEL%, restarting in 15s>> worker-launch.log
ping -n 16 127.0.0.1 >nul
goto :run
